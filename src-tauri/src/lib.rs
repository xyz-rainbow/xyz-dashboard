use std::{
    fs,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
};
use serde::{Deserialize, Serialize};
use tauri::{
    menu::{MenuBuilder, MenuItem},
    path::BaseDirectory,
    tray::TrayIconBuilder,
    Emitter, Listener, Manager,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IconPackIndex {
    version: u32,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    packs: Vec<IconPackIndexEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IconPackIndexEntry {
    id: String,
    name: String,
    description: String,
    categories: Vec<String>,
    tags: Vec<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    downloads: u64,
    #[serde(rename = "trendingScore")]
    trending_score: u64,
    #[serde(rename = "iconCount")]
    icon_count: usize,
    #[serde(rename = "coverIcon")]
    cover_icon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IconPackFile {
    id: String,
    name: String,
    categories: Vec<String>,
    icons: Vec<IconPackIcon>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IconPackIcon {
    id: String,
    name: String,
    #[serde(rename = "relativePath")]
    relative_path: String,
    category: String,
    tags: Vec<String>,
    #[serde(rename = "appHints")]
    app_hints: Vec<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    downloads: u64,
}

#[derive(Debug, Clone, Serialize)]
struct IconPackIconWithPath {
    id: String,
    name: String,
    category: String,
    tags: Vec<String>,
    #[serde(rename = "appHints")]
    app_hints: Vec<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    downloads: u64,
    #[serde(rename = "iconPath")]
    icon_path: String,
}

#[derive(Debug, Clone, Serialize)]
struct IconPackCatalogEntry {
    id: String,
    name: String,
    description: String,
    categories: Vec<String>,
    tags: Vec<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    downloads: u64,
    #[serde(rename = "trendingScore")]
    trending_score: u64,
    #[serde(rename = "iconCount")]
    icon_count: usize,
    #[serde(rename = "coverIconPath")]
    cover_icon_path: String,
    installed: bool,
    icons: Vec<IconPackIconWithPath>,
}

#[derive(Debug, Clone, Serialize)]
struct IconPackStatus {
    #[serde(rename = "packId")]
    pack_id: String,
    installed: bool,
    #[serde(rename = "installedAt")]
    installed_at: Option<String>,
}

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

fn search_icon_path(icon_ref: &str) -> Option<String> {
    if icon_ref.trim().is_empty() {
        return None;
    }
    let icon_path = PathBuf::from(icon_ref);
    if icon_path.is_absolute() && icon_path.exists() {
        return Some(icon_path.to_string_lossy().to_string());
    }

    let candidates = if icon_ref.contains('/') {
        vec![PathBuf::from(icon_ref)]
    } else {
        let mut paths = Vec::new();
        let exts = ["png", "svg", "xpm"];
        let bases = [
            "/usr/share/icons/hicolor",
            "/usr/share/icons",
            "/usr/share/pixmaps",
            "/usr/local/share/icons",
        ];
        let sizes = ["512x512", "256x256", "128x128", "64x64", "48x48", "32x32"];
        for base in bases {
            for size in sizes {
                for ext in exts {
                    paths.push(PathBuf::from(format!(
                        "{}/{}/apps/{}.{}",
                        base, size, icon_ref, ext
                    )));
                }
            }
            for ext in exts {
                paths.push(PathBuf::from(format!("{}/{}.{}", base, icon_ref, ext)));
                paths.push(PathBuf::from(format!("{}/apps/{}.{}", base, icon_ref, ext)));
            }
        }
        paths
    };

    candidates
        .into_iter()
        .find(|p| p.exists())
        .map(|p| p.to_string_lossy().to_string())
}

fn parse_desktop_entry_for_icon(desktop_file: &Path) -> Option<String> {
    let file = fs::File::open(desktop_file).ok()?;
    let reader = BufReader::new(file);
    for line in reader.lines().map_while(Result::ok) {
        if let Some(value) = line.strip_prefix("Icon=") {
            if let Some(path) = search_icon_path(value.trim()) {
                return Some(path);
            }
        }
    }
    None
}

fn find_icon_by_exec(exec_name: &str) -> Option<String> {
    let mut desktop_dirs = vec![PathBuf::from("/usr/share/applications")];
    if let Ok(home) = std::env::var("HOME") {
        desktop_dirs.push(PathBuf::from(home).join(".local/share/applications"));
    }

    for dir in desktop_dirs {
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("desktop") {
                continue;
            }
            let file = match fs::File::open(&path) {
                Ok(f) => f,
                Err(_) => continue,
            };
            let reader = BufReader::new(file);
            let mut has_exec = false;
            let mut icon_ref: Option<String> = None;
            for line in reader.lines().map_while(Result::ok) {
                if let Some(exec) = line.strip_prefix("Exec=") {
                    if exec.contains(exec_name) {
                        has_exec = true;
                    }
                } else if let Some(icon) = line.strip_prefix("Icon=") {
                    icon_ref = Some(icon.trim().to_string());
                }
            }
            if has_exec {
                if let Some(icon) = icon_ref {
                    if let Some(path) = search_icon_path(&icon) {
                        return Some(path);
                    }
                }
            }
        }
    }
    None
}

fn copy_dir_recursive(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.exists() {
        return Err(format!("Source path not found: {}", source.display()));
    }
    fs::create_dir_all(destination).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let dest_path = destination.join(entry.file_name());
        if path.is_dir() {
            copy_dir_recursive(&path, &dest_path)?;
        } else {
            fs::copy(&path, &dest_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Packaged apps resolve bundled `assets/icon-packs` via [`BaseDirectory::Resource`].
/// In `tauri dev`, fall back to the repo `assets/icon-packs` when resources are absent.
fn icon_packs_source_root(app: &tauri::AppHandle) -> PathBuf {
    if let Ok(p) = app.path().resolve("icon-packs", BaseDirectory::Resource) {
        if p.join("index.json").exists() {
            return p;
        }
    }
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("assets")
        .join("icon-packs")
}

fn icon_packs_install_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("icon-packs");
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    Ok(base)
}

fn installed_packs_map<R: tauri::Runtime>(
    store: &tauri_plugin_store::Store<R>,
) -> serde_json::Map<String, serde_json::Value> {
    store
        .get("installedPacks")
        .and_then(|v: serde_json::Value| v.as_object().cloned())
        .unwrap_or_default()
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
fn suggest_icon_for_path(path: String) -> Result<Option<String>, String> {
    if path.trim().is_empty() {
        return Ok(None);
    }
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Ok(None);
    }

    let lower = path.to_lowercase();
    if lower.ends_with(".png")
        || lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".svg")
        || lower.ends_with(".webp")
        || lower.ends_with(".ico")
    {
        return Ok(Some(path));
    }

    if lower.ends_with(".desktop") {
        return Ok(parse_desktop_entry_for_icon(&file_path));
    }

    if let Some(exec_name) = file_path.file_name().and_then(|s| s.to_str()) {
        if let Some(icon) = find_icon_by_exec(exec_name) {
            return Ok(Some(icon));
        }
    }

    Ok(None)
}

#[tauri::command]
async fn list_icon_packs(app: tauri::AppHandle) -> Result<Vec<IconPackCatalogEntry>, String> {
    let source_root = icon_packs_source_root(&app);
    let index_path = source_root.join("index.json");
    let index_file = fs::File::open(index_path).map_err(|e| e.to_string())?;
    let index: IconPackIndex = serde_json::from_reader(index_file).map_err(|e| e.to_string())?;

    let store = app.store("config.json").map_err(|e| e.to_string())?;
    let installed_map = installed_packs_map(&store);
    let install_root = icon_packs_install_root(&app)?;

    let mut packs_out = Vec::new();
    for pack in index.packs {
        let pack_file_path = source_root
            .join("packs")
            .join(&pack.id)
            .join("pack.json");
        let pack_file = fs::File::open(pack_file_path).map_err(|e| e.to_string())?;
        let pack_content: IconPackFile =
            serde_json::from_reader(pack_file).map_err(|e| e.to_string())?;
        let installed = installed_map.contains_key(&pack.id);
        let icon_base = if installed {
            install_root.join("packs").join(&pack.id)
        } else {
            source_root.join("packs").join(&pack.id)
        };

        let icons = pack_content
            .icons
            .into_iter()
            .map(|icon| IconPackIconWithPath {
                id: icon.id,
                name: icon.name,
                category: icon.category,
                tags: icon.tags,
                app_hints: icon.app_hints,
                created_at: icon.created_at,
                downloads: icon.downloads,
                icon_path: icon_base
                    .join(icon.relative_path)
                    .to_string_lossy()
                    .to_string(),
            })
            .collect::<Vec<_>>();

        let cover_icon_path = icon_base.join(pack.cover_icon).to_string_lossy().to_string();
        packs_out.push(IconPackCatalogEntry {
            id: pack.id,
            name: pack.name,
            description: pack.description,
            categories: pack.categories,
            tags: pack.tags,
            created_at: pack.created_at,
            downloads: pack.downloads,
            trending_score: pack.trending_score,
            icon_count: icons.len(),
            cover_icon_path,
            installed,
            icons,
        });
    }

    Ok(packs_out)
}

#[tauri::command]
fn resolve_pack_icon_path(
    app: tauri::AppHandle,
    pack_id: String,
    icon_id: String,
) -> Result<String, String> {
    let pack_id = pack_id.trim().to_string();
    let icon_id = icon_id.trim().to_string();
    if pack_id.is_empty() || icon_id.is_empty() {
        return Err("pack_id and icon_id are required".to_string());
    }

    let source_root = icon_packs_source_root(&app);
    let pack_json = source_root
        .join("packs")
        .join(&pack_id)
        .join("pack.json");
    let pack_file = fs::File::open(&pack_json)
        .map_err(|e| format!("Pack not found ({}): {}", pack_id, e))?;
    let pack_content: IconPackFile =
        serde_json::from_reader(pack_file).map_err(|e| e.to_string())?;

    let icon = pack_content
        .icons
        .iter()
        .find(|i| i.id == icon_id)
        .ok_or_else(|| format!("Icon '{}' not in pack '{}'", icon_id, pack_id))?;

    let store = app.store("config.json").map_err(|e| e.to_string())?;
    let installed = installed_packs_map(&store).contains_key(&pack_id);
    let install_root = icon_packs_install_root(&app)?;
    let icon_base = if installed {
        install_root.join("packs").join(&pack_id)
    } else {
        source_root.join("packs").join(&pack_id)
    };

    let full = icon_base.join(&icon.relative_path);
    if !full.exists() {
        return Err(format!("Icon file not found: {}", full.display()));
    }
    Ok(full.to_string_lossy().to_string())
}

#[tauri::command]
async fn install_icon_pack(app: tauri::AppHandle, pack_id: String) -> Result<bool, String> {
    if pack_id.trim().is_empty() {
        return Err("pack_id is required".to_string());
    }
    let source_pack_dir = icon_packs_source_root(&app)
        .join("packs")
        .join(&pack_id);
    if !source_pack_dir.exists() {
        return Err(format!("Icon pack not found: {}", pack_id));
    }

    let install_root = icon_packs_install_root(&app)?;
    let install_pack_dir = install_root.join("packs").join(&pack_id);
    if install_pack_dir.exists() {
        fs::remove_dir_all(&install_pack_dir).map_err(|e| e.to_string())?;
    }
    copy_dir_recursive(&source_pack_dir, &install_pack_dir)?;

    let store = app.store("config.json").map_err(|e| e.to_string())?;
    let mut installed = installed_packs_map(&store);
    let installed_at = format!(
        "{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs()
    );
    installed.insert(pack_id, serde_json::json!({ "installedAt": installed_at }));
    store.set("installedPacks", serde_json::Value::Object(installed));
    store.set(
        "lastIconPackSyncAt",
        serde_json::json!(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_secs()
        ),
    );
    store.save().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn get_icon_pack_status(app: tauri::AppHandle, pack_id: String) -> Result<IconPackStatus, String> {
    if pack_id.trim().is_empty() {
        return Err("pack_id is required".to_string());
    }
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    let installed = installed_packs_map(&store);
    let installed_at = installed
        .get(&pack_id)
        .and_then(|v| v.get("installedAt"))
        .and_then(|v| v.as_str())
        .map(String::from);

    Ok(IconPackStatus {
        pack_id,
        installed: installed_at.is_some(),
        installed_at,
    })
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
        window.hide().map_err(|e| e.to_string())?;
        let _ = app.emit("dashboard-visibility-changed", serde_json::json!({ "visible": false }));
        Ok(())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn show_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        let _ = app.emit("dashboard-visibility-changed", serde_json::json!({ "visible": true }));
        Ok(())
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
        "soundOutputChannel": store.get("soundOutputChannel").unwrap_or(serde_json::json!("stereo")),
        "soundTestSound": store.get("soundTestSound").unwrap_or(serde_json::json!("tap")),
        "inactivityTimeout": store.get("inactivityTimeout").unwrap_or(serde_json::json!(30)),
        "fadeOutDuration": store.get("fadeOutDuration").unwrap_or(serde_json::json!(4)),
        "recentCommands": store.get("recentCommands").unwrap_or(serde_json::json!([])),
        "installedPacks": store.get("installedPacks").unwrap_or(serde_json::json!({})),
        "lastIconPackSyncAt": store.get("lastIconPackSyncAt").unwrap_or(serde_json::json!("")),
        "iconUsageStats": store.get("iconUsageStats").unwrap_or(serde_json::json!({})),
        "windowScalePercent": store.get("windowScalePercent").unwrap_or(serde_json::json!(100)),
        "themePreset": store.get("themePreset").unwrap_or(serde_json::json!("darkmoon")),
        "multicolorThemes": store.get("multicolorThemes").unwrap_or(serde_json::json!(["lime", "cyber", "aurora", "darkmoon"])),
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

    if let Some(pct) = config
        .get("windowScalePercent")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
    {
        resize_main_window_for_scale(&app, pct)?;
    }

    Ok(())
}

const BASE_WINDOW_LOGICAL: f64 = 400.0;

fn resize_main_window_for_scale(app: &tauri::AppHandle, percent: u32) -> Result<(), String> {
    let pct = percent.clamp(100, 400) as f64;
    let side = (BASE_WINDOW_LOGICAL * pct / 100.0).round();
    let side = side.clamp(200.0, 2400.0);
    if let Some(win) = app.get_webview_window("main") {
        win.set_size(tauri::LogicalSize::new(side, side))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn apply_window_scale(app: tauri::AppHandle, percent: u64) -> Result<(), String> {
    resize_main_window_for_scale(&app, (percent as u32).clamp(100, 400))
}

// ── Helpers ────────────────────────────────────────────────────────────────

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
            let _ = app.emit("dashboard-visibility-changed", serde_json::json!({ "visible": false }));
        } else {
            let _ = window.show();
            let _ = window.set_focus();
            let _ = app.emit("dashboard-visibility-changed", serde_json::json!({ "visible": true }));
        }
    }
}

fn key_to_code(key: &str) -> tauri_plugin_global_shortcut::Code {
    use tauri_plugin_global_shortcut::Code;
    let normalized = key.trim().to_uppercase();
    match normalized.as_str() {
        "SPACE" => Code::Space,
        "A" => Code::KeyA, "B" => Code::KeyB,
        "C" => Code::KeyC, "D" => Code::KeyD,
        "E" => Code::KeyE, "F" => Code::KeyF,
        "G" => Code::KeyG, "H" => Code::KeyH,
        "I" => Code::KeyI, "J" => Code::KeyJ,
        "K" => Code::KeyK, "L" => Code::KeyL,
        "M" => Code::KeyM, "N" => Code::KeyN,
        "O" => Code::KeyO, "P" => Code::KeyP,
        "Q" => Code::KeyQ, "R" => Code::KeyR,
        "S" => Code::KeyS, "T" => Code::KeyT,
        "U" => Code::KeyU, "V" => Code::KeyV,
        "W" => Code::KeyW, "X" => Code::KeyX,
        "Y" => Code::KeyY, "Z" => Code::KeyZ,
        "0" => Code::Digit0, "1" => Code::Digit1, "2" => Code::Digit2,
        "3" => Code::Digit3, "4" => Code::Digit4, "5" => Code::Digit5,
        "6" => Code::Digit6, "7" => Code::Digit7, "8" => Code::Digit8,
        "9" => Code::Digit9,
        "F1" => Code::F1, "F2" => Code::F2, "F3" => Code::F3,
        "F4" => Code::F4, "F5" => Code::F5, "F6" => Code::F6,
        "F7" => Code::F7, "F8" => Code::F8, "F9" => Code::F9,
        "F10" => Code::F10, "F11" => Code::F11, "F12" => Code::F12,
        _ => Code::Space,
    }
}

fn register_main_shortcut(app: &tauri::AppHandle, key: &str) {
    use tauri_plugin_global_shortcut::{Modifiers, Shortcut, ShortcutState};

    let normalized = key.trim();
    let safe_key = if normalized.is_empty() { "P" } else { normalized };
    let app_handle = app.clone();
    let code = key_to_code(safe_key);
    let primary = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), code);
    let fallback = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), code);

    if let Err(e) = app
        .global_shortcut()
        .on_shortcuts([primary, fallback], move |_app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                toggle_window(&app_handle);
            }
        })
    {
        eprintln!("Failed to register main shortcuts: {}", e);
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

                let scale_pct = store
                    .get("windowScalePercent")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(100) as u32;
                let _ = resize_main_window_for_scale(&app_handle, scale_pct);
            });

            let scale_pct = app
                .store("config.json")
                .ok()
                .and_then(|s| s.get("windowScalePercent"))
                .and_then(|v| v.as_u64())
                .unwrap_or(100) as u32;
            let _ = resize_main_window_for_scale(app.handle(), scale_pct);

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
            suggest_icon_for_path,
            list_icon_packs,
            install_icon_pack,
            get_icon_pack_status,
            resolve_pack_icon_path,
            load_config,
            save_config,
            apply_window_scale,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
