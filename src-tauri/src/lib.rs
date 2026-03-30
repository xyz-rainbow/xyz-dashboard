use std::{
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
};
use tauri::{
    menu::{MenuBuilder, MenuItem},
    tray::TrayIconBuilder,
    Listener, Manager,
};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;

static IS_PROCESSING_COMMAND: AtomicBool = AtomicBool::new(false);
const BLOCKED_CHARS: [char; 9] = ['\n', '\r', ';', '|', '&', '`', '$', '>', '<'];
const ALLOWED_PROGRAMS: &[&str] = &[
    "python",
    "python3",
    "bash",
    "node",
    "npm",
    "pnpm",
    "yarn",
    "firefox",
    "xdg-open",
    "code",
];

// ── Tauri Commands ─────────────────────────────────────────────────────────

fn quote_arg(arg: &str) -> String {
    format!("\"{}\"", arg.replace('"', "\\\""))
}

fn parse_command(command: &str) -> Result<(String, Vec<String>), String> {
    if command.chars().any(|c| BLOCKED_CHARS.contains(&c)) {
        return Err("Command contains blocked shell control characters".to_string());
    }

    let parts = shell_words::split(command).map_err(|e| format!("Invalid command format: {}", e))?;
    let Some(program) = parts.first() else {
        return Err("Empty command".to_string());
    };
    let program_path = Path::new(program);

    let is_allowed = if program_path.is_absolute() {
        true
    } else if program.contains('/') || program.contains('\\') {
        false
    } else {
        ALLOWED_PROGRAMS.iter().any(|p| p == program)
    };

    if !is_allowed {
        return Err(format!(
            "Program '{}' is not allowed. Use an absolute path or an allowed program.",
            program
        ));
    }

    Ok((program.clone(), parts.into_iter().skip(1).collect()))
}

fn spawn_command_and_release(command: String) -> Result<(), String> {
    let (program, args) = parse_command(&command)?;
    let mut child = std::process::Command::new(program)
        .args(args)
        .spawn()
        .map_err(|e| e.to_string())?;

    std::thread::spawn(move || {
        if let Err(e) = child.wait() {
            eprintln!("Command process wait failed: {}", e);
        }
        IS_PROCESSING_COMMAND.store(false, Ordering::SeqCst);
    });

    Ok(())
}

fn detect_python_interpreter(script_path: &Path) -> String {
    let linux_candidates = [
        ".venv/bin/python3",
        ".venv/bin/python",
        "venv/bin/python3",
        "venv/bin/python",
        "env/bin/python3",
        "env/bin/python",
    ];
    let windows_candidates = [
        ".venv/Scripts/python.exe",
        "venv/Scripts/python.exe",
        "env/Scripts/python.exe",
    ];

    for ancestor in script_path.ancestors() {
        for candidate in linux_candidates.iter().chain(windows_candidates.iter()) {
            let full = ancestor.join(candidate);
            if full.exists() {
                return full.to_string_lossy().to_string();
            }
        }
    }

    "python3".to_string()
}

#[tauri::command]
fn suggest_command_for_path(path: String) -> Result<String, String> {
    if path.trim().is_empty() {
        return Err("Empty path".to_string());
    }

    let file_path = PathBuf::from(&path);
    let lower = path.to_lowercase();
    if lower.ends_with(".py") {
        let python = detect_python_interpreter(&file_path);
        return Ok(format!("{} {}", quote_arg(&python), quote_arg(&path)));
    }
    if lower.ends_with(".sh") {
        return Ok(format!("bash {}", quote_arg(&path)));
    }
    if lower.ends_with(".js") {
        return Ok(format!("node {}", quote_arg(&path)));
    }
    Ok(quote_arg(&path))
}

#[tauri::command]
async fn execute_command(app: tauri::AppHandle, command: String) -> Result<bool, String> {
    if command.trim().is_empty() {
        return Err("Empty command".to_string());
    }

    if IS_PROCESSING_COMMAND.swap(true, Ordering::SeqCst) {
        return Err("Already processing a command".to_string());
    }

    match spawn_command_and_release(command) {
        Ok(()) => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
            Ok(true)
        }
        Err(e) => {
            IS_PROCESSING_COMMAND.store(false, Ordering::SeqCst);
            Err(e)
        }
    }
}

#[tauri::command]
async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("Empty URL".to_string());
    }

    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(format!("Not a valid URL: {}", url));
    }

    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn show_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn is_processing() -> bool {
    IS_PROCESSING_COMMAND.load(Ordering::SeqCst)
}

#[tauri::command]
async fn load_config(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    let config = serde_json::json!({
        "gridSize": store.get("gridSize").unwrap_or(serde_json::json!([2, 2])),
        "buttons": store.get("buttons").unwrap_or(serde_json::json!([])),
        "settingsIconCorner": store.get("settingsIconCorner").unwrap_or(serde_json::json!("br")),
        "shortcutKey": store.get("shortcutKey").unwrap_or(serde_json::json!("P")),
        "numpadShortcuts": store.get("numpadShortcuts").unwrap_or(serde_json::json!(true)),
        "soundEnabled": store.get("soundEnabled").unwrap_or(serde_json::json!(true)),
        "soundVolume": store.get("soundVolume").unwrap_or(serde_json::json!(65)),
        "inactivityTimeout": store.get("inactivityTimeout").unwrap_or(serde_json::json!(30)),
        "fadeOutDuration": store.get("fadeOutDuration").unwrap_or(serde_json::json!(4)),
        "recentCommands": store.get("recentCommands").unwrap_or(serde_json::json!([])),
    });

    Ok(config)
}

#[tauri::command]
async fn save_config(app: tauri::AppHandle, config: serde_json::Value) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    if let Some(obj) = config.as_object() {
        for (key, value) in obj {
            store.set(key, value.clone());
        }
    }

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

// ── Helpers ────────────────────────────────────────────────────────────────

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn key_to_code(key: &str) -> tauri_plugin_global_shortcut::Code {
    use tauri_plugin_global_shortcut::Code;
    match key {
        "Space" => Code::Space,
        "A" | "a" => Code::KeyA, "B" | "b" => Code::KeyB,
        "C" | "c" => Code::KeyC, "D" | "d" => Code::KeyD,
        "E" | "e" => Code::KeyE, "F" | "f" => Code::KeyF,
        "G" | "g" => Code::KeyG, "H" | "h" => Code::KeyH,
        "I" | "i" => Code::KeyI, "J" | "j" => Code::KeyJ,
        "K" | "k" => Code::KeyK, "L" | "l" => Code::KeyL,
        "M" | "m" => Code::KeyM, "N" | "n" => Code::KeyN,
        "O" | "o" => Code::KeyO, "P" | "p" => Code::KeyP,
        "Q" | "q" => Code::KeyQ, "R" | "r" => Code::KeyR,
        "S" | "s" => Code::KeyS, "T" | "t" => Code::KeyT,
        "U" | "u" => Code::KeyU, "V" | "v" => Code::KeyV,
        "W" | "w" => Code::KeyW, "X" | "x" => Code::KeyX,
        "Y" | "y" => Code::KeyY, "Z" | "z" => Code::KeyZ,
        "F1" => Code::F1, "F2" => Code::F2, "F3" => Code::F3,
        "F4" => Code::F4, "F5" => Code::F5, "F6" => Code::F6,
        "F7" => Code::F7, "F8" => Code::F8, "F9" => Code::F9,
        "F10" => Code::F10, "F11" => Code::F11, "F12" => Code::F12,
        _ => Code::Space,
    }
}

fn register_main_shortcut(app: &tauri::AppHandle, key: &str) {
    use tauri_plugin_global_shortcut::{Modifiers, Shortcut, ShortcutState};

    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), key_to_code(key));
    let app_handle = app.clone();

    if let Err(e) = app.global_shortcut().on_shortcuts([shortcut], move |_app, _shortcut, event| {
        if event.state() == ShortcutState::Pressed {
            toggle_window(&app_handle);
        }
    }) {
        eprintln!("Failed to register main shortcut: {}", e);
    }
}

fn register_numpad_shortcuts(app: &tauri::AppHandle, buttons: &[serde_json::Value]) {
    use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

    let numpad_codes = [
        Code::Numpad1, Code::Numpad2, Code::Numpad3,
        Code::Numpad4, Code::Numpad5, Code::Numpad6,
        Code::Numpad7, Code::Numpad8, Code::Numpad9,
    ];

    // Build a map of numpad_index -> command, registering each individually
    for (i, numpad_code) in numpad_codes.iter().enumerate() {
        if i >= buttons.len() {
            break;
        }

        let command = match buttons[i].get("command").and_then(|v| v.as_str()) {
            Some(cmd) if !cmd.is_empty() => cmd.to_string(),
            _ => continue,
        };

        let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), *numpad_code);

        if let Err(e) = app.global_shortcut().on_shortcuts([shortcut], move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                if !IS_PROCESSING_COMMAND.swap(true, Ordering::SeqCst) {
                    if let Err(e) = spawn_command_and_release(command.clone()) {
                        eprintln!("Failed to execute numpad command: {}", e);
                        IS_PROCESSING_COMMAND.store(false, Ordering::SeqCst);
                    }
                }
            }
        }) {
            eprintln!("Failed to register numpad shortcut {}: {}", i + 1, e);
        }
    }
}

fn get_recent_commands(app: &tauri::AppHandle) -> Vec<String> {
    app.store("config.json")
        .ok()
        .and_then(|store| {
            store
                .get("recentCommands")
                .and_then(|v| serde_json::from_value::<Vec<String>>(v).ok())
        })
        .unwrap_or_default()
}

// ── App Runner ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // ── Window close → hide instead of close ──
            if let Some(_window) = app.get_webview_window("main") {
                // Close interception handled via tauri.conf.json window settings
                // and the window is hidden via the close event in the run loop
            } else {
                return Err("Main window not found".into());
            }

            // ── System Tray ──
            let recent = get_recent_commands(app.handle());

            let mut menu = MenuBuilder::new(app);
            menu = menu.item(&MenuItem::with_id(app, "show", "Show XYZ Dashboard", true, None::<&str>)?);
            menu = menu.separator();
            for (i, cmd) in recent.iter().take(5).enumerate() {
                let id = format!("recent_{}", i);
                let label = if cmd.len() > 30 {
                    format!("{}...", &cmd[..27])
                } else {
                    cmd.clone()
                };
                menu = menu.item(&MenuItem::with_id(app, &id, label, true, None::<&str>)?);
            }
            menu = menu.separator();
            menu = menu.item(&MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?);
            let tray_menu = menu.build()?;

            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("XYZ Dashboard")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => toggle_window(app),
                        "quit" => app.exit(0),
                        id if id.starts_with("recent_") => {
                            let recent = get_recent_commands(app);
                            let idx: usize = id.trim_start_matches("recent_").parse().unwrap_or(0);
                            if let Some(cmd) = recent.get(idx) {
                                if IS_PROCESSING_COMMAND.swap(true, Ordering::SeqCst) {
                                    return;
                                }
                                if let Err(e) = spawn_command_and_release(cmd.clone()) {
                                    eprintln!("Failed to execute recent command: {}", e);
                                    IS_PROCESSING_COMMAND.store(false, Ordering::SeqCst);
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    use tauri::tray::TrayIconEvent;
                    use tauri::tray::MouseButtonState;
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app.handle())?;

            // ── Global Shortcuts ──
            let shortcut_key: String = app
                .store("config.json")
                .ok()
                .and_then(|s| s.get("shortcutKey"))
                .and_then(|v| v.as_str().map(String::from))
                .unwrap_or_else(|| "P".to_string());

            register_main_shortcut(app.handle(), &shortcut_key);

            // Numpad shortcuts
            let numpad_enabled = app
                .store("config.json")
                .ok()
                .and_then(|s| s.get("numpadShortcuts"))
                .and_then(|v| v.as_bool())
                .unwrap_or(true);

            let grid_size: [u32; 2] = app
                .store("config.json")
                .ok()
                .and_then(|s| s.get("gridSize"))
                .and_then(|v| serde_json::from_value(v).ok())
                .unwrap_or([2, 2]);

            let buttons: Vec<serde_json::Value> = app
                .store("config.json")
                .ok()
                .and_then(|s| s.get("buttons"))
                .and_then(|v| serde_json::from_value(v).ok())
                .unwrap_or_default();

            if numpad_enabled && grid_size == [3, 3] {
                register_numpad_shortcuts(app.handle(), &buttons);
            }

            // ── Listen for config changes to re-register shortcuts ──
            let app_handle = app.handle().clone();
            app.listen("config-changed", move |_| {
                let store = match app_handle.store("config.json") {
                    Ok(s) => s,
                    Err(_) => return,
                };

                let _ = app_handle.global_shortcut().unregister_all();

                let key: String = store
                    .get("shortcutKey")
                    .and_then(|v| v.as_str().map(String::from))
                    .unwrap_or_else(|| "P".to_string());
                register_main_shortcut(&app_handle, &key);

                let numpad = store
                    .get("numpadShortcuts")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);
                let gs: [u32; 2] = store
                    .get("gridSize")
                    .and_then(|v| serde_json::from_value(v).ok())
                    .unwrap_or([2, 2]);
                let btns: Vec<serde_json::Value> = store
                    .get("buttons")
                    .and_then(|v| serde_json::from_value(v).ok())
                    .unwrap_or_default();

                if numpad && gs == [3, 3] {
                    register_numpad_shortcuts(&app_handle, &btns);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            execute_command,
            open_url,
            hide_window,
            show_window,
            is_processing,
            suggest_command_for_path,
            load_config,
            save_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
