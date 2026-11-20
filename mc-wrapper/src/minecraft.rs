use std::{ffi::OsString, path::Path};

use eyre::{Result, ensure};
use modrinth_sandbox::{SandboxArg, SandboxCommand, minecraft::MinecraftCommand};

const CLASSPATH_JVM_ARGUMENT: &str = "-cp";
const JAVA_LIBRARY_PATH_JVM_ARGUMENT: &str = "-Djava.library.path";
const JAVA_AGENT_JVM_ARGUMENT: &str = "-javaagent";

#[cfg(windows)]
const MINECRAFT_PASSTHROUGH_ENVIRONMENT: &[&str] = &[
    "COMPUTERNAME",
    "HOME",
    "HOMEDRIVE",
    "HOMEPATH",
    "HOSTNAME",
    "NUMBER_OF_PROCESSORS",
    "OS",
    "PROCESSOR_ARCHITECTURE",
    "PROCESSOR_IDENTIFIER",
    "PROCESSOR_LEVEL",
    "PROCESSOR_REVISION",
    "PROGRAMDATA",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "PROGRAMW6432",
    "PUBLIC",
    "SYSTEMDRIVE",
    "SYSTEMROOT",
    "USERDOMAIN",
    "APPDATA",
    "LOCALAPPDATA",
    "ALLUSERSPROFILE",
    "PATH",
    "PATHEXT",
    "COMMONPROGRAMFILES",
    "COMSPEC",
    "DRIVERDATA",
    "PROCESSOR_ARCHITECTURE",
    "PROCESSOR_IDENTIFIER",
    "PROCESSOR_LEVEL",
    "SESSIONNAME",
    "USERNAME",
    "USERPROFILE",
    "WINDIR",
    "TEMP",
];

#[cfg(target_os = "macos")]
const MINECRAFT_PASSTHROUGH_ENVIRONMENT: &[&str] = &[
    "PATH",
    "LANG",
    "LANGUAGE",
    "LC_ALL",
    "LC_ADDRESS",
    "LC_COLLATE",
    "LC_CTYPE",
    "LC_IDENTIFICATION",
    "LC_MEASUREMENT",
    "LC_MESSAGES",
    "LC_MONETARY",
    "LC_NAME",
    "LC_NUMERIC",
    "LC_PAPER",
    "LC_TELEPHONE",
    "LC_TIME",
];

#[cfg(target_os = "linux")]
const MINECRAFT_PASSTHROUGH_ENVIRONMENT: &[&str] = &[
    "PATH",
    "LANG",
    "LANGUAGE",
    "LC_ALL",
    "LC_ADDRESS",
    "LC_COLLATE",
    "LC_CTYPE",
    "LC_IDENTIFICATION",
    "LC_MEASUREMENT",
    "LC_MESSAGES",
    "LC_MONETARY",
    "LC_NAME",
    "LC_NUMERIC",
    "LC_PAPER",
    "LC_TELEPHONE",
    "LC_TIME",
    "GDMSESSION",
    "DESKTOP_SESSION",
    "DISPLAY",
    "WAYLAND_DISPLAY",
    "XDG_RUNTIME_DIR",
    "XAUTHORITY",
    "XDG_SESSION_TYPE",
    "PIPEWIRE_REMOTE",
    "PULSE_SERVER",
    "TZ",
    "DRI_PRIME",
    "MESA_LOADER_DRIVER_OVERRIDE",
    "MESA_VK_DEVICE_SELECT",
    "MESA_VK_DEVICE_SELECT_FORCE_DEFAULT_DEVICE",
    "LIBGL_ALWAYS_SOFTWARE",
    "__GLX_VENDOR_LIBRARY_NAME",
    "__NV_PRIME_RENDER_OFFLOAD",
    "__NV_PRIME_RENDER_OFFLOAD_PROVIDER",
    "__VK_LAYER_NV_optimus",
    "__GL_THREADED_OPTIMIZATIONS",
    "VK_DRIVER_FILES",
    "VK_ICD_FILENAMES",
    "VK_LAYER_PATH",
    "VK_LOADER_DRIVERS_SELECT",
    "VK_LOADER_DRIVERS_DISABLE",
    "FREETYPE_PROPERTIES",
    "ALSOFT_DRIVERS",
    "SDL_AUDIODRIVER",
    "GLFW_IM_MODULE",
    "XMODIFIERS",
    "SDL_IM_MODULE",
];

pub async fn setup_minecraft_command_unsandboxed(
    minecraft: MinecraftCommand,
) -> Result<SandboxCommand> {
    let Ok(instance_path) = minecraft.instance_path.canonicalize() else {
        return Err(eyre::eyre!("Instance path could not be canonicalized"));
    };

    let java_path = {
        #[cfg(unix)]
        {
            minecraft.jre_path.join("bin").join("java")
        }
        #[cfg(windows)]
        {
            minecraft.jre_path.join("bin").join("javaw.exe")
        }
    };

    let mut args = minecraft.jvm_args;
    args.extend([
        jvm_path_argument(JAVA_LIBRARY_PATH_JVM_ARGUMENT, "=", &minecraft.natives_path).into(),
    ]);

    if let Some(java_agent) = minecraft.java_agent.clone() {
        args.push(jvm_path_argument(JAVA_AGENT_JVM_ARGUMENT, ":", &java_agent).into());
    }

    if let Some(logging_config) = minecraft.logging_config {
        ensure!(
            logging_config.argument.contains("${path}"),
            "logging configuration argument must contain a `${{path}}` placeholder"
        );
        args.push(replace_path_placeholder(&logging_config.argument, &logging_config.path).into());
    }

    args.push(CLASSPATH_JVM_ARGUMENT.into());
    args.push(std::env::join_paths(&minecraft.classpath)?.into());
    args.push(minecraft.main_class);
    args.extend(minecraft.main_class_args);

    let mut extra_environment = minecraft.extra_environment;
    extra_environment.extend([("JAVA_HOME".into(), minecraft.jre_path.into())]);

    Ok(SandboxCommand {
        executable: java_path,
        args,
        ensure_dirs_exist: vec![],
        read_only_paths: vec![],
        read_write_paths: vec![],
        working_directory: Some(instance_path),
        passthrough_environment: MINECRAFT_PASSTHROUGH_ENVIRONMENT
            .iter()
            .map(|s| SandboxArg::from(*s))
            .collect(),
        extra_environment,
        allow_network: true,
        is_jvm: true,
        die_with_parent: true,
        stdin: minecraft.stdin,
        stdout: minecraft.stdout,
        stderr: minecraft.stderr,
        app_container_name: "ModrinthMinecraftSandbox".into(),
        app_container_description: "Sandbox for Minecraft instances created by `modrinth-sandbox`"
            .into(),
        on_start: vec![],
        on_finish: vec![],
    })
}

fn jvm_path_argument(argument: &str, separator: &str, path: &Path) -> OsString {
    let mut result = OsString::from(argument);
    result.push(separator);
    result.push(path);
    result
}

fn replace_path_placeholder(argument: &str, path: &Path) -> OsString {
    let (prefix, suffix) = argument
        .split_once("${path}")
        .expect("logging argument placeholder was validated");
    let mut result = OsString::from(prefix);
    result.push(path);
    result.push(suffix);
    result
}
