use clap::Arg;
use interprocess::TryClone;
use interprocess::local_socket::{GenericFilePath, ListenerOptions, prelude::*};
use interprocess::os::unix::local_socket::ListenerOptionsExt;
use serde::Serialize;
use std::io::{BufRead, BufReader, Write};

use std::process::{Command, Stdio};
use std::thread::{self};

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

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

fn main() {
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
            Arg::new("game-cwd")
                .long("game-cwd")
                .num_args(1)
                .required(true),
        )
        .get_matches();

    let instance_id = matches.get_one::<String>("instance-id").unwrap();
    let launcher_executable = matches.get_one::<String>("launcher-executable").cloned();
    let launcher_args: Vec<String> =
        serde_json::from_str(matches.get_one::<String>("launcher-args").unwrap())
            .expect("Invalid JSON for launcher-args");

    let game_executable = matches.get_one::<String>("game-executable").unwrap();
    let game_args: Vec<String> =
        serde_json::from_str(matches.get_one::<String>("game-args").unwrap())
            .expect("Invalid JSON for game-args");
    let game_cwd = matches.get_one::<String>("game-cwd").unwrap();

    let shared_buffer: SharedBuffer = Arc::new(Mutex::new(VecDeque::with_capacity(MAX_LINES)));
    let shared_stream: SharedStream = Arc::new(Mutex::new(None));

    println!("{:?}", launcher_args);

    spawn_game(
        game_executable,
        &game_args,
        game_cwd,
        Arc::clone(&shared_stream),
        &shared_buffer,
        move || {
            if let Some(launcher_executable) = launcher_executable {
                let _ = Command::new(&launcher_executable)
                    .args(&launcher_args)
                    .arg("--skip-cli")
                    .spawn()
                    .unwrap()
                    .wait();
            }
        },
    );

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
        "/tmp/tomate-launcher-minecraft-wrapper-{}.sock",
        instance_id
    );

    let name = pipe_name.to_fs_name::<GenericFilePath>()?;

    let listener = ListenerOptions::new()
        .name(name)
        .reclaim_name(true)
        .try_overwrite(true)
        .mode(0o600)
        .create_sync()?;

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

fn spawn_game<F>(
    executable: &String,
    arguments: &[String],
    cwd: &String,
    stream: Arc<Mutex<Option<LocalSocketStream>>>,
    shared_buffer: &SharedBuffer,
    on_exit: F,
) where
    F: FnOnce() + Send + 'static,
{
    let mut child = Command::new(executable)
        .args(arguments)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(cwd)
        .spawn()
        .expect("Failed to spawn process");

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

                push_to_ringbuffer(&stderr_buffer, LineType::Stderr, line);
            }
        }
    });

    println!("Launched '{}' with PID: {}", executable, child.id());

    thread::spawn(move || {
        let status = child.wait().expect("Failed to wait on child");
        println!("Child exited with: {}", status);

        on_exit();

        std::thread::sleep(std::time::Duration::from_millis(1000));
        std::process::exit(status.code().unwrap_or(0));
    });
}
