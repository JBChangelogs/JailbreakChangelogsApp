use std::fs;
use std::sync::Mutex;

use serde_json::{json, Value};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::{data_dir, scanner};

const LABEL: &str = "overlay";
const DEFAULT_SHORTCUT: &str = "Alt+Backquote";

static SHORTCUT: Mutex<Option<Option<String>>> = Mutex::new(None);

pub fn shortcut() -> Option<String> {
    SHORTCUT
        .lock()
        .unwrap()
        .get_or_insert_with(|| {
            let saved = fs::read(data_dir().join("overlay.json")).ok().and_then(|b| serde_json::from_slice::<Value>(&b).ok());
            match saved {
                Some(v) if v.get("shortcut").is_some() => v["shortcut"].as_str().map(String::from),
                _ => cfg!(windows).then(|| DEFAULT_SHORTCUT.to_string()),
            }
        })
        .clone()
}

pub fn set_shortcut(app: &AppHandle, next: Option<String>) -> Result<Option<String>, String> {
    let shortcuts = app.global_shortcut();
    let previous = shortcut();
    let _ = shortcuts.unregister_all();
    if let Some(s) = next.as_deref() {
        if let Err(e) = shortcuts.register(s) {
            eprintln!("[overlay] couldn't register {s}: {e}");
            if let Some(p) = previous.as_deref() {
                let _ = shortcuts.register(p);
            }
            return Err("That shortcut is already used by another app, or isn't supported.".into());
        }
    }
    *SHORTCUT.lock().unwrap() = Some(next.clone());
    if let Err(e) = fs::write(data_dir().join("overlay.json"), json!({ "shortcut": next }).to_string()) {
        eprintln!("[overlay] failed to save settings: {e}");
    }
    Ok(next)
}

pub fn init(app: &AppHandle) {
    if let Some(s) = shortcut() {
        if let Err(e) = app.global_shortcut().register(s.as_str()) {
            eprintln!("[overlay] couldn't register {s}: {e}");
        }
    }
}

pub fn toggle(app: &AppHandle) {
    match app.get_webview_window(LABEL) {
        Some(w) if w.is_visible().unwrap_or(false) => hide(app),
        existing => show(app, existing),
    }
}

pub fn hide(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(LABEL) {
        let _ = w.hide();
    }
    scanner::set_overlay_open(false);
}

fn build(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let builder = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("overlay.html".into()))
        .title("Overlay")
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .visible(false);
    #[cfg(windows)]
    let builder = builder
        .additional_browser_args(crate::WEBVIEW2_ARGS)
        .scroll_bar_style(tauri::webview::ScrollBarStyle::FluentOverlay)
        .data_directory(crate::webview2_data_dir(app)?);
    builder.build()
}

fn show(app: &AppHandle, existing: Option<WebviewWindow>) {
    let window = match existing.map_or_else(|| build(app), Ok) {
        Ok(w) => w,
        Err(e) => return eprintln!("[overlay] failed to open: {e}"),
    };
    let point = scanner::roblox_point().or_else(|| app.cursor_position().ok().map(|p| (p.x, p.y)));
    let monitor = point
        .and_then(|(x, y)| app.monitor_from_point(x, y).ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());
    if let Some(m) = monitor {
        let _ = window.set_position(*m.position());
        let _ = window.set_size(*m.size());
    }
    let _ = window.show();
    let _ = window.set_focus();
    scanner::set_overlay_open(true);
}
