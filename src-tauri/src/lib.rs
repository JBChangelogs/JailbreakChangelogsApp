mod analytics;
mod auth;
mod discord;
mod legacy;
mod notify;
#[cfg(not(all(target_os = "macos", target_arch = "x86_64")))]
mod ocr;
mod roblox;
mod scanner;
mod updater;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, RunEvent, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;

pub const API_BASE: &str = "https://api.jailbreakchangelogs.com";
pub const APP_USER_MODEL_ID: &str = "com.jailbreakchangelogs.desktop";
const PROTOCOL: &str = "jailbreakchangelogs";
const OAUTH_LOGIN_URL: &str = "https://api.jailbreakchangelogs.com/oauth?application=true";
const PRIVILEGED_FLAGS: [&str; 4] = ["is_developer", "is_owner", "is_tester", "website_moderator"];

#[cfg(windows)]
pub const NODE_PLATFORM: &str = "win32";
#[cfg(target_os = "macos")]
pub const NODE_PLATFORM: &str = "darwin";
#[cfg(target_os = "linux")]
pub const NODE_PLATFORM: &str = "linux";

#[cfg(target_arch = "x86_64")]
pub const NODE_ARCH: &str = "x64";
#[cfg(target_arch = "aarch64")]
pub const NODE_ARCH: &str = "arm64";

static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();
static USER_AGENT: OnceLock<String> = OnceLock::new();
static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
static DEVTOOLS_ACCESS: Mutex<Option<(String, bool)>> = Mutex::new(None);
static QUITTING: AtomicBool = AtomicBool::new(false);

pub fn data_dir() -> &'static Path {
    DATA_DIR.get().expect("data dir is set in setup")
}

pub fn is_packaged() -> bool {
    !cfg!(debug_assertions)
}

pub fn api_client() -> &'static reqwest::Client {
    CLIENT.get_or_init(|| {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert("X-Application", reqwest::header::HeaderValue::from_static("true"));
        reqwest::Client::builder()
            .user_agent(USER_AGENT.get().cloned().unwrap_or_default())
            .default_headers(headers)
            .timeout(Duration::from_secs(30))
            .build()
            .expect("http client")
    })
}

#[cfg(windows)]
pub fn os_release() -> String {
    let v = windows_version::OsVersion::current();
    format!("{}.{}.{}", v.major, v.minor, v.build)
}

#[cfg(unix)]
pub fn os_release() -> String {
    unsafe {
        let mut name: libc::utsname = std::mem::zeroed();
        if libc::uname(&mut name) != 0 {
            return String::new();
        }
        std::ffi::CStr::from_ptr(name.release.as_ptr()).to_string_lossy().into_owned()
    }
}

pub fn locale() -> String {
    sys_locale::get_locale().unwrap_or_else(|| "en-US".into())
}

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

fn focus_main(app: &AppHandle) {
    if let Some(w) = main_window(app) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn is_allowed_external_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") {
        return true;
    }
    let Some(query) = lower.strip_prefix("roblox://experiences/start?placeid=") else { return false };
    let Some((place, job)) = query.split_once("&gameinstanceid=") else { return false };
    !place.is_empty()
        && place.bytes().all(|b| b.is_ascii_digit())
        && !job.is_empty()
        && job.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

fn open_url(app: &AppHandle, url: &str) {
    if let Err(e) = app.opener().open_url(url, None::<&str>) {
        eprintln!("[shell] failed to open {url}: {e}");
    }
}

async fn refresh_devtools_access() {
    let Some(token) = auth::load_token() else {
        *DEVTOOLS_ACCESS.lock().unwrap() = None;
        return;
    };
    let response = api_client().get(format!("{API_BASE}/v2/users/me")).header("Authorization", &token).send().await;
    let allowed = match response {
        Ok(r) => r.json::<Value>().await.ok().is_some_and(|data| {
            data["flags"].as_array().is_some_and(|flags| {
                flags.iter().any(|f| {
                    f["enabled"].as_bool() == Some(true) && f["flag"].as_str().is_some_and(|n| PRIVILEGED_FLAGS.contains(&n))
                })
            })
        }),
        Err(e) => {
            eprintln!("[devtools-access] failed to check user flags: {e}");
            false
        }
    };
    *DEVTOOLS_ACCESS.lock().unwrap() = Some((token, allowed));
}

fn devtools_allowed() -> bool {
    if !is_packaged() {
        return true;
    }
    let Some(token) = auth::load_token() else { return false };
    DEVTOOLS_ACCESS.lock().unwrap().as_ref().is_some_and(|(t, allowed)| *t == token && *allowed)
}

fn deliver_protocol_url(app: &AppHandle, url: &str) {
    let _ = app.emit_to("main", "protocol:url", url);
    let Ok(parsed) = tauri::Url::parse(url) else { return };
    if parsed.host_str() != Some("auth") {
        return;
    }
    let param = |name: &str| parsed.query_pairs().find(|(k, _)| k == name).map(|(_, v)| v.into_owned());
    if let Some(token) = param("token").filter(|t| !t.is_empty()) {
        analytics::track("login_success", None);
        auth::save_token(&token);
        let _ = app.emit_to("main", "auth:login-success", &token);
        discord::refresh();
        tauri::async_runtime::spawn(refresh_devtools_access());
    } else if let Some(error) = param("error").filter(|e| !e.is_empty()) {
        let short = error.len() <= 40 && error.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-');
        analytics::track("login_error", Some(serde_json::json!({ "reason": if short { error.as_str() } else { "other" } })));
        let _ = app.emit_to("main", "auth:login-error", &error);
    }
}

fn handle_protocol_url(app: &AppHandle, url: &str) {
    if !url.starts_with(&format!("{PROTOCOL}://")) {
        return;
    }
    focus_main(app);
    deliver_protocol_url(app, url);
}

pub fn before_quit() {
    if QUITTING.swap(true, Ordering::SeqCst) {
        return;
    }
    analytics::track_app_close();
    let discord = std::thread::spawn(|| discord::stop(Duration::from_secs(3)));
    tauri::async_runtime::block_on(async {
        let _ = tokio::time::timeout(Duration::from_secs(3), analytics::flush()).await;
    });
    let _ = discord.join();
}

#[cfg(target_os = "linux")]
fn ensure_linux_protocol_handler(icon_png: &Path) {
    use std::process::{Command, Stdio};
    let Some(app_image) = std::env::var_os("APPIMAGE") else { return };
    let Some(home) = std::env::var_os("HOME").map(PathBuf::from) else { return };
    let apps_dir = home.join(".local/share/applications");
    let entry = format!(
        "[Desktop Entry]\nName=Jailbreak Changelogs\nExec=\"{}\" %u\nTerminal=false\nType=Application\nIcon=jailbreak-changelogs\nStartupWMClass=jailbreak-changelogs\nMimeType=x-scheme-handler/{PROTOCOL};\nCategories=Network;\n",
        app_image.to_string_lossy()
    );
    let quiet = |cmd: &str, args: &[&str]| Command::new(cmd).args(args).stdout(Stdio::null()).stderr(Stdio::null()).status();
    let registered = std::fs::create_dir_all(&apps_dir)
        .and_then(|_| std::fs::write(apps_dir.join("jailbreak-changelogs.desktop"), entry))
        .and_then(|_| quiet("update-desktop-database", &[&apps_dir.to_string_lossy()]))
        .and_then(|_| quiet("xdg-mime", &["default", "jailbreak-changelogs.desktop", &format!("x-scheme-handler/{PROTOCOL}")]));
    if let Err(e) = registered {
        eprintln!("[linux-protocol] failed to register URL scheme handler: {e}");
    }
    let hicolor = home.join(".local/share/icons/hicolor");
    let icon_dir = hicolor.join("512x512/apps");
    let installed = std::fs::create_dir_all(&icon_dir)
        .and_then(|_| std::fs::copy(icon_png, icon_dir.join("jailbreak-changelogs.png")))
        .and_then(|_| quiet("gtk-update-icon-cache", &[&hicolor.to_string_lossy()]));
    if let Err(e) = installed {
        eprintln!("[linux-protocol] failed to install app icon: {e}");
    }
}

#[cfg(windows)]
fn remove_velopack_install() {
    let Some(local) = std::env::var_os("LOCALAPPDATA").map(PathBuf::from) else { return };
    let current_exe = std::env::current_exe().ok();
    let installs: Vec<PathBuf> = ["com.jailbreakchangelogs.desktop", "jailbreak-changelogs-desktop"]
        .iter()
        .map(|name| local.join(name))
        .filter(|root| root.join("Update.exe").is_file() && root.join("current").join("Jailbreak Changelogs.exe").is_file())
        .filter(|root| !current_exe.as_ref().is_some_and(|exe| exe.starts_with(root)))
        .collect();
    for root in installs {
        uninstall_velopack(root.join("Update.exe"));
    }
}

#[cfg(windows)]
fn uninstall_velopack(update_exe: PathBuf) {
    use std::os::windows::process::CommandExt;
    std::thread::spawn(move || {
        for _ in 0..60 {
            std::thread::sleep(Duration::from_secs(10));
            if roblox::process_start_time("Jailbreak Changelogs.exe").is_some() {
                continue;
            }
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            match std::process::Command::new(&update_exe).args(["uninstall", "--silent"]).creation_flags(CREATE_NO_WINDOW).status() {
                Ok(s) if s.success() => println!("[migration] removed the previous Electron install"),
                other => eprintln!("[migration] could not remove the previous Electron install: {other:?}"),
            }
            return;
        }
    });
}

#[cfg(windows)]
pub const WEBVIEW2_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,CalculateNativeWinOcclusion";

#[cfg(windows)]
pub fn webview2_data_dir(app: &AppHandle) -> tauri::Result<PathBuf> {
    Ok(app.path().local_data_dir()?.join("jailbreak-changelogs").join("WebView2"))
}

fn create_main_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let navigation_app = app.clone();
    let new_window_app = app.clone();
    let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Jailbreak Changelogs")
        .inner_size(1100.0, 720.0)
        .min_inner_size(720.0, 480.0)
        .visible(false)
        .background_color(tauri::window::Color(0x12, 0x13, 0x17, 0xff))
        .user_agent(USER_AGENT.get().unwrap())
        .initialization_script(format!("window.__JBCL_PLATFORM__ = {NODE_PLATFORM:?};"))
        .disable_drag_drop_handler()
        .on_navigation(move |url| {
            let internal = matches!(url.scheme(), "tauri" | "ipc" | "asset")
                || matches!(url.host_str(), Some("tauri.localhost" | "ipc.localhost" | "asset.localhost"))
                || (!is_packaged() && url.host_str() == Some("localhost"));
            if !internal && is_allowed_external_url(url.as_str()) {
                open_url(&navigation_app, url.as_str());
            }
            internal
        })
        .on_new_window(move |url, _| {
            if is_allowed_external_url(url.as_str()) {
                open_url(&new_window_app, url.as_str());
            }
            tauri::webview::NewWindowResponse::Deny
        })
        .on_page_load(|window, payload| {
            if payload.event() == tauri::webview::PageLoadEvent::Finished {
                let _ = window.show();
            }
        });

    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(tauri::LogicalPosition::new(14.0, 18.0));
    #[cfg(not(target_os = "macos"))]
    let builder = builder.decorations(false);
    #[cfg(windows)]
    let builder = builder
        .additional_browser_args(WEBVIEW2_ARGS)
        .data_directory(webview2_data_dir(app)?);

    builder.build()
}

#[tauri::command]
fn open_external(app: AppHandle, url: String) {
    if is_allowed_external_url(&url) {
        open_url(&app, &url);
    }
}

#[tauri::command]
fn auth_login(app: AppHandle) {
    open_url(&app, OAUTH_LOGIN_URL);
}

#[tauri::command]
fn auth_get_token() -> Option<String> {
    auth::load_token()
}

#[tauri::command]
fn auth_logout() {
    auth::clear_token();
}

#[tauri::command]
fn updater_check_now(app: AppHandle) {
    tauri::async_runtime::spawn(updater::check(app, "poll"));
}

#[tauri::command]
fn updater_download(app: AppHandle) {
    tauri::async_runtime::spawn(updater::download(app));
}

#[tauri::command]
fn updater_quit_and_install(app: AppHandle) {
    updater::quit_and_install(&app);
}

#[derive(Deserialize)]
struct NotificationOptions {
    id: String,
    title: String,
    body: Option<String>,
}

#[tauri::command]
fn notifications_show(app: AppHandle, options: NotificationOptions) -> Result<(), String> {
    let icon = app.path().resource_dir().map_err(|e| e.to_string())?.join("icon.png");
    notify::show(&app, options.id, &options.title, options.body.as_deref(), &icon);
    Ok(())
}

#[tauri::command]
async fn scanner_status() -> Value {
    scanner::status().await
}

#[tauri::command]
async fn scanner_install(app: AppHandle) -> Value {
    scanner::install(app).await
}

#[tauri::command]
async fn scanner_snip(app: AppHandle) -> Value {
    scanner::snip(app).await
}

#[tauri::command]
fn scanner_get_auto() -> scanner::AutoScanSettings {
    scanner::get_auto()
}

#[tauri::command]
fn scanner_set_auto_enabled(enabled: bool) -> scanner::AutoScanSettings {
    scanner::set_auto_enabled(enabled)
}

#[tauri::command]
async fn scanner_pick_auto_area(app: AppHandle) -> scanner::AutoScanSettings {
    scanner::pick_auto_area(app).await
}

#[derive(Deserialize)]
struct PickedRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[tauri::command]
fn scanner_pick_done(window: tauri::Window, rect: Option<PickedRect>) {
    if window.label() == "picker" {
        scanner::pick_done(rect.map(|r| (r.x, r.y, r.width, r.height)));
    }
}

#[tauri::command]
fn analytics_track(name: String, props: Option<Value>) {
    analytics::track(&name, props);
}

#[tauri::command]
fn analytics_get_enabled() -> bool {
    analytics::is_enabled()
}

#[tauri::command]
fn analytics_set_enabled(enabled: bool) {
    analytics::set_enabled(enabled);
}

#[tauri::command]
fn discord_set_preference(key: String, value: bool) {
    discord::set_preference(&key, value);
}

#[tauri::command]
fn legacy_local_storage() -> Option<HashMap<String, String>> {
    legacy::local_storage()
}

#[tauri::command]
fn legacy_local_storage_done() {
    legacy::mark_local_storage_imported();
}

#[tauri::command]
fn devtools_open(window: WebviewWindow) {
    if devtools_allowed() {
        window.open_devtools();
    }
}

#[tauri::command]
fn app_reload(window: WebviewWindow) {
    let _ = window.reload();
}

pub fn run() {
    let _ = rustls::crypto::ring::default_provider().install_default();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            analytics::track("app_open", Some(serde_json::json!({ "cold_start": false })));
            if !argv.iter().any(|a| a.starts_with(&format!("{PROTOCOL}://"))) {
                focus_main(app);
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            open_external,
            auth_login,
            auth_get_token,
            auth_logout,
            updater_check_now,
            updater_download,
            updater_quit_and_install,
            notifications_show,
            scanner_status,
            scanner_install,
            scanner_snip,
            scanner_get_auto,
            scanner_set_auto_enabled,
            scanner_pick_auto_area,
            scanner_pick_done,
            analytics_track,
            analytics_get_enabled,
            analytics_set_enabled,
            discord_set_preference,
            legacy_local_storage,
            legacy_local_storage_done,
            devtools_open,
            app_reload,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let dir = app.path().config_dir()?.join("jailbreak-changelogs");
            std::fs::create_dir_all(&dir)?;
            let _ = DATA_DIR.set(dir);
            let _ = USER_AGENT.set(format!(
                "JailbreakChangelogsApp/{} ({NODE_PLATFORM}; {NODE_ARCH})",
                app.package_info().version
            ));

            let resources = app.path().resource_dir()?;
            legacy::clear_electron_caches();
            #[cfg(windows)]
            {
                notify::register_windows_toast_identity(APP_USER_MODEL_ID, &resources.join("icon.ico"));
                if let Err(e) = app.deep_link().register(PROTOCOL) {
                    eprintln!("[protocol] failed to register: {e}");
                }
                remove_velopack_install();
            }
            #[cfg(target_os = "linux")]
            ensure_linux_protocol_handler(&resources.join("icon.png"));
            let _ = resources;

            create_main_window(&handle)?;
            analytics::init(&handle);
            scanner::init(&handle);
            discord::start();
            updater::start(&handle);
            tauri::async_runtime::spawn(refresh_devtools_access());

            let roblox_app = handle.clone();
            roblox::start(move |activity| {
                let _ = roblox_app.emit_to("main", "roblox:activity-changed", &activity);
                scanner::set_roblox_place(activity.place_id.clone());
                discord::set_roblox_activity(&activity);
            });

            let link_app = handle.clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    handle_protocol_url(&link_app, url.as_str());
                }
            });
            if let Some(urls) = app.deep_link().get_current().ok().flatten() {
                for url in urls {
                    handle_protocol_url(&handle, url.as_str());
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the app");

    app.run(|app, event| match event {
        #[cfg(target_os = "macos")]
        RunEvent::WindowEvent { label, event: WindowEvent::CloseRequested { api, .. }, .. } if label == "main" => {
            api.prevent_close();
            if let Some(w) = main_window(app) {
                let _ = w.hide();
            }
        }
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => focus_main(app),
        RunEvent::WindowEvent { label, event: WindowEvent::Focused(false), .. } if label == "main" => {
            tauri::async_runtime::spawn(analytics::flush());
        }
        RunEvent::ExitRequested { .. } => before_quit(),
        _ => {
            let _ = app;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::is_allowed_external_url;

    #[test]
    fn only_web_and_roblox_join_links_open_externally() {
        assert!(is_allowed_external_url("https://jailbreakchangelogs.com/values"));
        assert!(is_allowed_external_url("HTTP://example.com"));
        assert!(is_allowed_external_url("roblox://experiences/start?placeId=606849621&gameInstanceId=a1b2-c3_d4"));
        assert!(!is_allowed_external_url("roblox://experiences/start?placeId=606849621&gameInstanceId=a b"));
        assert!(!is_allowed_external_url("roblox://experiences/start?placeId=60x&gameInstanceId=a"));
        assert!(!is_allowed_external_url("file:///C:/Windows/System32/calc.exe"));
        assert!(!is_allowed_external_url("javascript:alert(1)"));
        assert!(!is_allowed_external_url("jailbreakchangelogs://auth?token=x"));
    }
}
