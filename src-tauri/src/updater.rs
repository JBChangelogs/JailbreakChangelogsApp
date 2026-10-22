use std::sync::Mutex;
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::{Update, UpdaterExt};

const CHECK_INTERVAL: Duration = Duration::from_secs(30 * 60);

static PENDING: Mutex<Option<(Update, Vec<u8>)>> = Mutex::new(None);
static AVAILABLE: Mutex<Option<Update>> = Mutex::new(None);
static CHECKING: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

fn send(app: &AppHandle, status: serde_json::Value) {
    let _ = app.emit_to("main", "updater:status", status);
}

pub async fn check(app: AppHandle, source: &'static str) {
    if !crate::is_packaged() {
        return;
    }
    if let Some((update, bytes)) = PENDING.lock().unwrap().as_ref() {
        let status = json!({ "state": "downloaded", "source": source, "version": update.version, "size": bytes.len(), "notes": update.body });
        return send(&app, status);
    }
    let Ok(_checking) = CHECKING.try_lock() else { return };
    send(&app, json!({ "state": "checking", "source": source }));
    let update = match app.updater() {
        Ok(updater) => updater.check().await,
        Err(e) => Err(e),
    };
    let update = match update {
        Ok(Some(update)) => update,
        Ok(None) => return send(&app, json!({ "state": "not-available", "source": source })),
        Err(e) => {
            eprintln!("[updater] check failed: {e}");
            return send(&app, json!({ "state": "not-available", "source": source }));
        }
    };
    send(&app, json!({ "state": "available", "source": source, "version": update.version, "notes": update.body }));
    if source == "startup" {
        download_update(app, update, source).await;
    } else {
        *AVAILABLE.lock().unwrap() = Some(update);
    }
}

pub async fn download(app: AppHandle) {
    let Some(update) = AVAILABLE.lock().unwrap().take() else { return };
    download_update(app, update, "poll").await;
}

async fn download_update(app: AppHandle, update: Update, source: &'static str) {
    let version = update.version.clone();
    let notes = update.body.clone();
    send(&app, json!({ "state": "downloading", "source": source, "version": version, "notes": notes }));
    let mut received = 0u64;
    let mut last_percent = None;
    let progress_app = app.clone();
    let progress_version = version.clone();
    let progress_notes = notes.clone();
    let bytes = update
        .download(
            move |chunk, total| {
                received += chunk as u64;
                if let Some(total) = total.filter(|t| *t > 0) {
                    let percent = (received as f64 * 100.0 / total as f64).min(100.0);
                    let tenth = (percent * 10.0) as u64;
                    if last_percent != Some(tenth) {
                        last_percent = Some(tenth);
                        send(
                            &progress_app,
                            json!({
                                "state": "downloading",
                                "source": source,
                                "version": progress_version,
                                "notes": progress_notes,
                                "percent": (percent * 10.0).round() / 10.0,
                                "transferred": received,
                                "total": total
                            }),
                        );
                    }
                }
            },
            || {},
        )
        .await;
    match bytes {
        Ok(bytes) => {
            let size = bytes.len();
            *PENDING.lock().unwrap() = Some((update, bytes));
            send(&app, json!({ "state": "downloaded", "source": source, "version": version, "size": size, "notes": notes }));
        }
        Err(e) => {
            eprintln!("[updater] download failed: {e}");
            send(&app, json!({ "state": "error", "message": "The update couldn't be downloaded." }));
        }
    }
}

pub fn start(app: &AppHandle) {
    if !crate::is_packaged() {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        check(app.clone(), "startup").await;
        loop {
            tokio::time::sleep(CHECK_INTERVAL).await;
            check(app.clone(), "poll").await;
        }
    });
}

pub fn quit_and_install(app: &AppHandle) {
    let Some((update, bytes)) = PENDING.lock().unwrap().take() else { return };
    crate::before_quit();
    match update.install(bytes) {
        Ok(()) => app.restart(),
        Err(e) => {
            eprintln!("[updater] install failed: {e}");
            send(app, json!({ "state": "error", "message": "The update couldn't be installed." }));
        }
    }
}
