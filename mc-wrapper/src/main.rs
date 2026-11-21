mod minecraft;

use clap::Arg;

use clap::ArgAction::SetTrue;
use eyre::{Context, Result};
use interprocess::TryClone;
use interprocess::local_socket::{GenericFilePath, ListenerOptions, prelude::*};

#[cfg(unix)]
use interprocess::os::unix::local_socket::ListenerOptionsExt;

use modrinth_sandbox::api::{SandboxApiLauncher, SandboxApiService};
use modrinth_sandbox::minecraft::MinecraftCommand;
use modrinth_sandbox::{SandboxArg, SandboxEnv};
use serde::{Deserialize, Serialize};
use tokio::sync::oneshot::Sender;
use uuid::Uuid;

use core::panic;
use std::collections::{BTreeMap, HashMap, VecDeque};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread::{self};

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
#[derive(Clone)]
enum LineType {
    Stdout,
    Stderr,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
#[derive(Clone)]
struct LineData {
    #[serde(rename = "type")]
    line_type: LineType,
    data: String,
}

#[derive(Serialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
enum Response {
    Line(LineData),
    Lines(Vec<LineData>),
}

const MAX_LINES: usize = 200_000;

type SharedBuffer = Arc<Mutex<VecDeque<LineData>>>;
type SharedStream = Arc<Mutex<Option<LocalSocketStream>>>;

fn push_to_ringbuffer(buf: &SharedBuffer, line_type: LineType, line: String) {
    let mut buffer = buf.lock().unwrap();

    if buffer.len() >= MAX_LINES {
        buffer.pop_front();
    }

    buffer.push_back(LineData {
        line_type,
        data: line,
    });
}

fn read_buffer(buf: &SharedBuffer) -> Vec<LineData> {
    let buffer = buf.lock().unwrap();
    buffer.iter().cloned().collect()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[derive(Clone)]
struct Summary {
    root_path: String,
    jre_path: String,
    classpath: Vec<String>,
    natives_path: String,
    assets_path: String,
    extra_readonly: Vec<String>,
    jvm_args: Vec<String>,
    main_class: String,
    main_class_args: Vec<String>,
    uuid: Uuid,
    token: String,
}

#[derive(Default)]
struct SingleAuth(String);

impl SandboxApiLauncher for SingleAuth {
    fn login(&self, _: Uuid, token: Sender<Arc<str>>) {
        token.send(self.0.clone().into()).ok();
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    if modrinth_sandbox::helper::run_default()? {
        return Ok(());
    }

    let matches = clap::Command::new("wrapper")
        .arg(
            Arg::new("instance-id")
                .long("instance-id")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("launcher-executable")
                .long("launcher-executable")
                .num_args(1),
        )
        .arg(Arg::new("launcher-args").long("launcher-args").num_args(1))
        .arg(
            Arg::new("summary")
                .long("summary")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("persistent-dir")
                .long("persistent-dir")
                .num_args(1)
                .required(true),
        )
        .arg(Arg::new("env").long("env").num_args(1))
        .arg(Arg::new("sandbox").long("sandbox").action(SetTrue))
        .get_matches();

    let instance_id = matches.get_one::<String>("instance-id").unwrap();
    let launcher_executable = matches.get_one::<String>("launcher-executable").cloned();
    let launcher_args: Option<Vec<String>> = matches
        .get_one::<String>("launcher-args")
        .map(|x| serde_json::from_str(x).expect("Invalid JSON for launcher-args"));

    if launcher_executable.is_some() && launcher_args.is_none() {
        panic!("launcher-executable specified but launcher-args missing");
    }

    let summary: Summary = matches
        .get_one::<String>("summary")
        .map(|x| serde_json::from_str(x).expect("Invalid JSON for summary"))
        .unwrap();

    let persistent_dir = matches
        .get_one::<String>("persistent-dir")
        .map(PathBuf::from)
        .unwrap();

    let env: HashMap<String, String> = matches
        .get_one::<String>("env")
        .map(|x| serde_json::from_str(x).expect("Invalid JSON for env"))
        .unwrap_or_default();

    let sandbox = matches.get_flag("sandbox");

    let shared_buffer: SharedBuffer = Arc::new(Mutex::new(VecDeque::with_capacity(MAX_LINES)));
    let shared_stream: SharedStream = Arc::new(Mutex::new(None));

    spawn_game(
        summary,
        env,
        persistent_dir.to_path_buf(),
        sandbox,
        Arc::clone(&shared_stream),
        Arc::clone(&shared_buffer),
        move || {
            if let Some(launcher_executable) = launcher_executable {
                let _ = Command::new(&launcher_executable)
                    .args(&launcher_args.unwrap())
                    .arg("--skip-cli")
                    .spawn()
                    .unwrap()
                    .wait();
            }
        },
    )
    .await
    .wrap_err("Failed to spawn game")?;

    create_socket(shared_buffer, shared_stream, instance_id).expect("Failed to create socket");

    Ok(())
}

fn create_socket(
    shared_buffer: SharedBuffer,
    shared_stream: SharedStream,
    instance_id: &String,
) -> std::io::Result<()> {
    #[cfg(windows)]
    let pipe_name = format!(
        r"\\.\pipe\tomate-launcher-minecraft-wrapper-{}.sock",
        instance_id
    );

    #[cfg(unix)]
    let pipe_name = format!(
        "{}/tomate-launcher-minecraft-wrapper-{}.sock",
        std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/tmp".to_string()),
        instance_id
    );

    let name = pipe_name.to_fs_name::<GenericFilePath>()?;

    let listener = {
        let mut b = ListenerOptions::new()
            .name(name)
            .reclaim_name(true)
            .try_overwrite(true);

        #[cfg(unix)]
        {
            b = b.mode(0o600);
        }

        b.create_sync()?
    };

    loop {
        println!("Waiting for connection...");

        let mut stream = listener.accept()?;
        *shared_stream.lock().unwrap() = Some(stream.try_clone()?);

        println!("Client connected!");

        let reader = BufReader::new(stream.try_clone()?);

        let json = serde_json::to_string(&Response::Lines(read_buffer(&shared_buffer)))?;
        writeln!(stream, "{}", json)?;
        stream.flush()?;

        // TODO
        for _line in reader.lines() {
            continue;
        }

        *shared_stream.lock().unwrap() = None;
        println!("Client disconnected!");
    }
}

async fn spawn_game<F>(
    summary: Summary,
    env: HashMap<String, String>,
    persistent_dir: PathBuf,
    sandbox: bool,
    stream: Arc<Mutex<Option<LocalSocketStream>>>,
    shared_buffer: SharedBuffer,
    on_exit: F,
) -> Result<()>
where
    F: FnOnce() + Send + 'static,
{
    let extra_environment: BTreeMap<SandboxArg, SandboxArg> = env
        .into_iter()
        .map(|(key, value)| (SandboxArg::from(key), SandboxArg::from(value)))
        .collect();

    let login_handler = SingleAuth(summary.token);

    let service = SandboxApiService::new(5175, Arc::new(login_handler));

    let command = MinecraftCommand {
        instance_path: summary.root_path.into(),
        jre_path: summary.jre_path.into(),
        classpath: summary.classpath.into_iter().map(String::into).collect(),
        natives_path: summary.natives_path.into(),
        assets_path: summary.assets_path.into(),
        jvm_args: summary.jvm_args.into_iter().map(String::into).collect(),
        main_class: summary.main_class.into(),
        main_class_args: summary
            .main_class_args
            .into_iter()
            .map(String::into)
            .collect(),

        granted_paths: vec![],
        persistent_dir,

        sandbox_api_child: Some(service.start(summary.uuid)),
        java_agent: None,
        logging_config: None,
        extra_environment,

        stdin: modrinth_sandbox::SandboxStdio::Null,
        stdout: modrinth_sandbox::SandboxStdio::Pipe,
        stderr: modrinth_sandbox::SandboxStdio::Pipe,
    };

    println!("Spawning game");

    let sandbox_env = if sandbox {
        SandboxEnv::new()
            .await
            .wrap_err("creating sandbox environment")?
    } else {
        SandboxEnv::noop()
    };

    let mut command = if sandbox {
        modrinth_sandbox::minecraft::setup_minecraft_command(command)
            .await
            .wrap_err("creating Minecraft sandbox command")?
    } else {
        minecraft::setup_minecraft_command_unsandboxed(command)
            .await
            .wrap_err("creating Minecraft unsandboxed command")?
    };

    command
        .passthrough_environment
        .insert(SandboxArg::from("LD_LIBRARY_PATH"));
    command
        .read_only_paths
        .extend(summary.extra_readonly.into_iter().map(PathBuf::from));
    command
        .read_only_paths
        .push(PathBuf::from("/run/opengl-driver"));

    let mut child = sandbox_env
        .spawn(command)
        .await
        .wrap_err("running Minecraft")?;

    let stdout = child.stdout.take().expect("Failed to capture stdout");
    let stderr = child.stderr.take().expect("Failed to capture stderr");

    let stdout_buffer = Arc::clone(&shared_buffer);
    let stderr_buffer = Arc::clone(&shared_buffer);

    let stdout_stream = Arc::clone(&stream);
    let stderr_stream = Arc::clone(&stream);

    thread::spawn(move || {
        let reader = BufReader::new(stdout);

        for line in reader.lines() {
            if let Ok(line) = line {
                let resp = Response::Line(LineData {
                    line_type: LineType::Stdout,
                    data: line.clone(),
                });
                let json = serde_json::to_string(&resp).unwrap();

                if let Some(ref mut stream) = *stdout_stream.lock().unwrap() {
                    writeln!(stream, "{}", json).unwrap(); // TODO
                    stream.flush().unwrap();
                }

                println!("stdout: {}", line);

                push_to_ringbuffer(&stdout_buffer, LineType::Stdout, line);
            }
        }
    });

    thread::spawn(move || {
        let reader = BufReader::new(stderr);

        for line in reader.lines() {
            if let Ok(line) = line {
                let resp = Response::Line(LineData {
                    line_type: LineType::Stderr,
                    data: line.clone(),
                });
                let json = serde_json::to_string(&resp).unwrap();

                if let Some(ref mut stream) = *stderr_stream.lock().unwrap() {
                    writeln!(stream, "{}", json).unwrap(); // TODO
                    stream.flush().unwrap();
                }

                println!("stderr: {}", line);

                push_to_ringbuffer(&stderr_buffer, LineType::Stderr, line);
            }
        }
    });

    println!("Launched with PID: {}", child.id().unwrap());

    tokio::spawn(async move {
        let status = child.wait().await.expect("idk?");
        println!("Child exited with: {}", status);

        on_exit();

        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        std::process::exit(status.code().unwrap_or(0));
    });

    Ok(())
}
