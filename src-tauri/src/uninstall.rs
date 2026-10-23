use std::path::PathBuf;

use tauri::AppHandle;
#[cfg(not(windows))]
use tauri::Manager;

#[cfg(any(windows, target_os = "macos"))]
fn current_exe() -> Option<PathBuf> {
    std::env::current_exe().ok()
}

#[cfg(windows)]
fn uninstaller() -> Option<PathBuf> {
    let path = current_exe()?.parent()?.join("uninstall.exe");
    path.is_file().then_some(path)
}

#[cfg(target_os = "macos")]
fn app_bundle() -> Option<PathBuf> {
    current_exe()?.ancestors().find(|p| p.extension().is_some_and(|e| e == "app")).map(PathBuf::from)
}

#[cfg(target_os = "linux")]
fn app_image() -> Option<PathBuf> {
    std::env::var_os("APPIMAGE").map(PathBuf::from).filter(|p| p.is_file())
}

pub fn supported() -> bool {
    if !crate::is_packaged() {
        return false;
    }
    #[cfg(windows)]
    return uninstaller().is_some();
    #[cfg(target_os = "macos")]
    return app_bundle().is_some();
    #[cfg(target_os = "linux")]
    return app_image().is_some();
}

#[cfg(not(windows))]
fn remove_data(app: &AppHandle) {
    let path = app.path();
    let mut dirs = vec![crate::data_dir().to_path_buf()];
    dirs.extend(path.local_data_dir().ok().map(|d| d.join("jailbreak-changelogs")));
    dirs.extend(
        [path.app_data_dir(), path.app_local_data_dir(), path.app_config_dir(), path.app_cache_dir(), path.app_log_dir()]
            .into_iter()
            .flatten(),
    );
    #[cfg(target_os = "macos")]
    if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
        dirs.push(home.join("Library/WebKit").join(&app.config().identifier));
    }
    for dir in dirs {
        let _ = std::fs::remove_dir_all(dir);
    }
}

pub fn run(app: &AppHandle, purge: bool) -> Result<(), String> {
    if !supported() {
        return Err("This copy of the app can't be uninstalled from here.".into());
    }
    crate::analytics::track("app_uninstall", Some(serde_json::json!({ "purge": purge })));
    if purge {
        crate::auth::clear_token();
    }

    #[cfg(windows)]
    {
        let uninstaller = uninstaller().ok_or("The uninstaller is missing.")?;
        crate::before_quit();
        let mut command = std::process::Command::new(&uninstaller);
        command.arg("/S");
        if purge {
            command.arg("/PURGE");
        }
        command.spawn().map_err(|e| format!("Couldn't start the uninstaller: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        let bundle = app_bundle().ok_or("The app bundle wasn't found.")?;
        let trash = PathBuf::from(std::env::var_os("HOME").ok_or("No home folder.")?).join(".Trash");
        let name = bundle.file_name().ok_or("The app bundle wasn't found.")?.to_owned();
        let mut target = trash.join(&name);
        let mut n = 2;
        while target.exists() {
            target = trash.join(format!("{} {n}.app", bundle.file_stem().unwrap_or_default().to_string_lossy()));
            n += 1;
        }
        std::fs::rename(&bundle, &target).map_err(|e| format!("Couldn't move the app to the Trash: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        let image = app_image().ok_or("The AppImage wasn't found.")?;
        std::fs::remove_file(&image).map_err(|e| format!("Couldn't delete the AppImage: {e}"))?;
        if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
            let apps = home.join(".local/share/applications");
            let _ = std::fs::remove_file(apps.join("jailbreak-changelogs.desktop"));
            let _ = std::fs::remove_file(home.join(".local/share/icons/hicolor/512x512/apps/jailbreak-changelogs.png"));
            let _ = std::process::Command::new("update-desktop-database").arg(&apps).status();
        }
    }

    #[cfg(not(windows))]
    if purge {
        crate::before_quit();
        remove_data(app);
    }

    app.exit(0);
    Ok(())
}
