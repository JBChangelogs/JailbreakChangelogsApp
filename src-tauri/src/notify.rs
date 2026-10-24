use std::path::Path;

use tauri::{AppHandle, Emitter, Manager};

#[cfg(windows)]
pub fn register_windows_toast_identity(aumid: &str, icon: &Path) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let key = format!(r"HKCU\Software\Classes\AppUserModelId\{aumid}");
    let icon = icon.to_string_lossy();
    let icon = icon.strip_prefix(r"\\?\").unwrap_or(&icon);
    for (name, value) in [("DisplayName", "Jailbreak Changelogs"), ("IconUri", icon)] {
        let status = std::process::Command::new("reg")
            .args(["add", &key, "/v", name, "/t", "REG_SZ", "/d", value, "/f"])
            .stdout(std::process::Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .status();
        if !matches!(status, Ok(s) if s.success()) {
            eprintln!("[notifications] failed to register Windows toast identity");
            return;
        }
    }
}

pub fn show(app: &AppHandle, id: String, title: &str, body: Option<&str>, icon: &Path) {
    let mut n = notify_rust::Notification::new();
    n.summary(title).body(body.unwrap_or_default());
    #[cfg(windows)]
    n.app_id(crate::APP_USER_MODEL_ID);
    #[cfg(target_os = "linux")]
    n.icon(&icon.to_string_lossy()).action("default", "Open");
    let _ = icon;
    let app = app.clone();
    std::thread::spawn(move || {
        #[cfg(target_os = "macos")]
        let _ = notify_rust::set_application(&app.config().identifier);
        match n.show() {
            Ok(handle) => handle.wait_for_action(|action| {
                if action == "__closed" {
                    return;
                }
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                let _ = app.emit_to("main", "notifications:clicked", &id);
            }),
            Err(e) => eprintln!("[notifications] failed to show: {e}"),
        }
    });
}
