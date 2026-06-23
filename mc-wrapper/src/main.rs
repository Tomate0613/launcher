use clap::Arg;

use command::{PandoraCommand, PandoraSandbox};
use interprocess::TryClone;
use interprocess::local_socket::{GenericFilePath, ListenerOptions, prelude::*};

#[cfg(unix)]
use interprocess::os::unix::local_socket::ListenerOptionsExt;

use serde::Serialize;

use core::panic;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
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

#[tokio::main]
async fn main() {
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
            Arg::new("game-executable")
                .long("game-executable")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("game-args")
                .long("game-args")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("game-dir")
                .long("game-dir")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("minecraft-dir")
                .long("minecraft-dir")
                .num_args(1)
                .required(true),
        )
        .arg(
            Arg::new("launcher-java-dir")
                .long("launcher-java-dir")
                .num_args(1),
        )
        .arg(
            Arg::new("sandbox-dir")
                .long("sandbox-dir")
                .num_args(1)
                .required(true),
        )
        .get_matches();

    let instance_id = matches.get_one::<String>("instance-id").unwrap();
    let launcher_executable = matches.get_one::<String>("launcher-executable").cloned();
    let launcher_args: Option<Vec<String>> = matches
        .get_one::<String>("launcher-args")
        .map(|x| serde_json::from_str(x).expect("Invalid JSON for launcher-args"));

    if launcher_executable.is_some() && launcher_args.is_none() {
        panic!("launcher-executable specified but launcher-args missing");
    }

    let game_executable = matches.get_one::<String>("game-executable").unwrap();
    let game_args: Vec<String> =
        serde_json::from_str(matches.get_one::<String>("game-args").unwrap())
            .expect("Invalid JSON for game-args");
    let game_dir = matches.get_one::<String>("game-dir").unwrap();
    let minecraft_dir = matches.get_one::<String>("minecraft-dir").unwrap();
    let launcher_java_dir = matches.get_one::<String>("launcher-java-dir");
    let sandbox_dir = matches.get_one::<String>("sandbox-dir").unwrap();

    let shared_buffer: SharedBuffer = Arc::new(Mutex::new(VecDeque::with_capacity(MAX_LINES)));
    let shared_stream: SharedStream = Arc::new(Mutex::new(None));

    spawn_game(
        game_executable,
        game_args,
        game_dir,
        minecraft_dir,
        launcher_java_dir.cloned(),
        sandbox_dir,
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
    .await;

    create_socket(shared_buffer, shared_stream, instance_id).expect("Failed to create socket");
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
    executable: &str,
    arguments: Vec<String>,
    game_dir: &str,
    minecraft_dir: &str,
    launcher_java_dir: Option<String>,
    sandbox_dir: &str,
    stream: Arc<Mutex<Option<LocalSocketStream>>>,
    shared_buffer: SharedBuffer,
    on_exit: F,
) where
    F: FnOnce() + Send + 'static,
{
    println!("Spawning game");
    let mut c = PandoraCommand::new(executable.to_string());
    c.stdout(command::PandoraStdioReadMode::Pipe);
    c.stderr(command::PandoraStdioReadMode::Pipe);
    c.current_dir(Path::new(&game_dir));

    for arg in arguments {
        c.arg(arg.to_string());
    }

    let mut allow_read = vec![Path::new(&minecraft_dir).canonicalize().unwrap().into()];

    if let Some(dir) = &launcher_java_dir {
        allow_read.push(Path::new(dir).canonicalize().unwrap().into());
    }

    let mut child = c
        .spawn_sandboxed(PandoraSandbox {
            allow_read,
            allow_write: vec![Path::new(&game_dir).into()],
            is_jvm: true,
            grant_network_access: true,
            #[cfg(target_os = "linux")]
            sandbox_dir: Path::new(&sandbox_dir).into(),
            #[cfg(windows)]
            name: Arc::from(OsStr::new("PandoraInstanceSandbox")),
            #[cfg(windows)]
            description: Arc::from(OsStr::new(
                "Sandbox for Minecraft instances run by Tomate Launcher",
            )),
            #[cfg(windows)]
            self_elevate_for_acl_arg: Some(PandoraArg::from(OsStr::new(
                "--internal-set-traverse-acls",
            ))),
            #[cfg(windows)]
            grant_winsta_writeattributes: true,
        })
        // .spawn()
        .await
        .expect("Failed to spawn sandboxed");

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

                println!("{}", line);

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

                println!("{}", line);

                push_to_ringbuffer(&stderr_buffer, LineType::Stderr, line);
            }
        }
    });

    println!("Launched '{}' with PID: {}", executable, child.process.id());

    thread::spawn(move || {
        let status = child.process.wait().expect("Failed to wait on child");
        println!("Child exited with: {}", status);

        on_exit();

        std::thread::sleep(std::time::Duration::from_millis(1000));
        std::process::exit(status.code().unwrap_or(0));
    });
}
