use std::path::PathBuf;

use tauri::AppHandle;

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

pub fn run(app: &AppHandle) -> Result<(), String> {
    if !supported() {
        return Err("This copy of the app can't be uninstalled from here.".into());
    }
    crate::analytics::track("app_uninstall", None);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let uninstaller = uninstaller().ok_or("The uninstaller is missing.")?;
        let script = format!("ping -n 3 127.0.0.1 >nul & \"{}\" /S", uninstaller.display());
        std::process::Command::new("cmd")
            .args(["/C", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
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

    app.exit(0);
    Ok(())
}
