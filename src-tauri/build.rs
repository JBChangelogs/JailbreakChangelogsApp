const COMMANDS: &[&str] = &[
    "open_external",
    "auth_login",
    "auth_get_token",
    "auth_logout",
    "updater_check_now",
    "updater_download",
    "updater_quit_and_install",
    "notifications_show",
    "scanner_status",
    "scanner_install",
    "scanner_snip",
    "scanner_get_auto",
    "scanner_set_auto_enabled",
    "scanner_pick_auto_area",
    "scanner_pick_done",
    "analytics_track",
    "analytics_get_enabled",
    "analytics_set_enabled",
    "discord_set_preference",
    "legacy_local_storage",
    "legacy_local_storage_done",
    "devtools_open",
    "app_reload",
    "app_can_uninstall",
    "app_uninstall",
];

fn main() {
    let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("ocr-pack.json");
    println!("cargo:rerun-if-changed={}", manifest.display());
    let pack = std::fs::read_to_string(&manifest).unwrap_or_default();
    println!("cargo:rustc-env=OCR_PACK={}", pack.replace(['\n', '\r'], ""));
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)))
        .expect("failed to run tauri-build");
}
