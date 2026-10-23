use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::oneshot;

use crate::data_dir;

const MAX_WIDTH: u32 = 4000;
const MAX_HEIGHT: u32 = 3000;
const TRADING_PLACE_ID: &str = "9780994092";
const AUTO_SCAN_INTERVAL: Duration = Duration::from_millis(150);
const AUTO_SCAN_CHANGE_THRESHOLD: f64 = 2.0;
const OCR_IDLE_UNLOAD: Duration = Duration::from_secs(120);

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScanArea {
    display_id: f64,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq)]
pub struct AutoScanSettings {
    #[serde(default)]
    enabled: bool,
    #[serde(default)]
    area: Option<ScanArea>,
}

static APP: OnceLock<AppHandle> = OnceLock::new();
static SETTINGS: Mutex<Option<AutoScanSettings>> = Mutex::new(None);
static PLACE_ID: Mutex<Option<String>> = Mutex::new(None);
static AUTO_RUNNING: AtomicBool = AtomicBool::new(false);
static PICKING: AtomicBool = AtomicBool::new(false);
static PICK_RESULT: Mutex<Option<oneshot::Sender<Option<(f64, f64, f64, f64)>>>> = Mutex::new(None);

#[cfg(not(all(target_os = "macos", target_arch = "x86_64")))]
mod engine {
    use super::*;
    use crate::ocr::{Image, Ocr};
    use std::io::{Cursor, Read};
    use std::path::PathBuf;

    #[derive(Deserialize)]
    struct Pack {
        url: String,
        sha256: String,
        size: u64,
        library: String,
    }

    const MODEL_FILES: [&str; 5] = ["det.onnx", "rec.onnx", "dict.txt", "NOTICE.md", "ONNXRUNTIME-LICENSE.txt"];
    #[cfg(target_os = "macos")]
    const PROVIDER: &str = "coreml";
    #[cfg(not(target_os = "macos"))]
    const PROVIDER: &str = "cpu";

    static OCR: Mutex<Option<Result<(Ocr, Instant), String>>> = Mutex::new(None);
    static INSTALLING: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

    fn pack() -> Option<Pack> {
        serde_json::from_str(env!("OCR_PACK")).ok()
    }

    fn packs_dir() -> Result<PathBuf, String> {
        let app = APP.get().ok_or("not ready")?;
        Ok(app.path().local_data_dir().map_err(|e| e.to_string())?.join("jailbreak-changelogs").join("ocr"))
    }

    fn install_dir(pack: &Pack) -> Result<PathBuf, String> {
        Ok(packs_dir()?.join(&pack.sha256[..16]))
    }

    fn installed(pack: &Pack) -> Option<PathBuf> {
        let dir = install_dir(pack).ok()?;
        let complete = ["det.onnx", "rec.onnx", "dict.txt", pack.library.as_str()].iter().all(|f| dir.join(f).is_file());
        complete.then_some(dir)
    }

    fn with_ocr<T>(f: impl FnOnce(&mut Ocr) -> T) -> Result<T, String> {
        let mut guard = OCR.lock().unwrap();
        if guard.is_none() {
            let pack = pack().ok_or("The scanner isn't included in this build.")?;
            let dir = installed(&pack).ok_or("The trade scanner hasn't been downloaded yet.")?;
            let loaded = Ocr::load(&dir.join(&pack.library), &dir.join("det.onnx"), &dir.join("rec.onnx"), &dir.join("dict.txt"));
            if let Err(e) = &loaded {
                eprintln!("[scanner] init failed: {e}");
            } else {
                spawn_idle_unload();
            }
            *guard = Some(loaded.map(|o| (o, Instant::now())));
        }
        match guard.as_mut().unwrap() {
            Ok((ocr, used)) => {
                *used = Instant::now();
                Ok(f(ocr))
            }
            Err(_) => Err("The scanner couldn't start on this computer.".into()),
        }
    }

    fn spawn_idle_unload() {
        std::thread::spawn(|| loop {
            std::thread::sleep(Duration::from_secs(30));
            let mut guard = OCR.lock().unwrap();
            match guard.as_ref() {
                Some(Ok((_, used))) if used.elapsed() >= OCR_IDLE_UNLOAD => {
                    *guard = None;
                    return;
                }
                Some(Ok(_)) => {}
                _ => return,
            }
        });
    }

    pub fn status() -> Value {
        let Some(pack) = pack() else {
            return json!({ "available": false, "reason": "The scanner isn't included in this build." });
        };
        if installed(&pack).is_some() {
            std::thread::spawn(|| {
                let _ = with_ocr(|_| ());
            });
            json!({ "available": true, "provider": PROVIDER })
        } else {
            json!({ "available": false, "reason": "The trade scanner needs a one-time download.", "installSize": pack.size })
        }
    }

    async fn download(app: &AppHandle, pack: &Pack) -> Result<Vec<u8>, String> {
        let local = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("ocr-pack").join(format!("{}.zip", pack.sha256));
        if cfg!(debug_assertions) && local.is_file() {
            return fs::read(&local).map_err(|e| e.to_string());
        }
        let mut res = crate::api_client().get(&pack.url).send().await.map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            return Err(format!("download failed ({})", res.status()));
        }
        let mut bytes = Vec::with_capacity(pack.size as usize);
        let mut last = 0u64;
        while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
            bytes.extend_from_slice(&chunk);
            if bytes.len() as u64 > pack.size {
                return Err("download is larger than expected".into());
            }
            let percent = bytes.len() as u64 * 100 / pack.size.max(1);
            if percent != last {
                last = percent;
                let _ = app.emit_to("main", "scanner:install-progress", json!({ "transferred": bytes.len(), "total": pack.size }));
            }
        }
        Ok(bytes)
    }

    fn extract(pack: &Pack, bytes: Vec<u8>) -> Result<(), String> {
        let digest = ring::digest::digest(&ring::digest::SHA256, &bytes);
        let hex: String = digest.as_ref().iter().map(|b| format!("{b:02x}")).collect();
        if hex != pack.sha256 {
            return Err("the download didn't match its checksum".into());
        }
        let target = install_dir(pack)?;
        let staging = target.with_extension("partial");
        let _ = fs::remove_dir_all(&staging);
        fs::create_dir_all(&staging).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).map_err(|e| e.to_string())?;
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let name = file.name().to_owned();
            if name != pack.library && !MODEL_FILES.contains(&name.as_str()) {
                return Err(format!("unexpected file in scanner download: {name}"));
            }
            let mut data = Vec::with_capacity(file.size() as usize);
            file.read_to_end(&mut data).map_err(|e| e.to_string())?;
            fs::write(staging.join(&name), data).map_err(|e| e.to_string())?;
        }
        let _ = fs::remove_dir_all(&target);
        fs::rename(&staging, &target).map_err(|e| e.to_string())?;
        if let Ok(entries) = fs::read_dir(packs_dir()?) {
            for entry in entries.flatten() {
                if entry.path() != target {
                    let _ = fs::remove_dir_all(entry.path());
                }
            }
        }
        Ok(())
    }

    pub async fn install(app: AppHandle) -> Value {
        let _installing = INSTALLING.lock().await;
        let Some(pack) = pack() else { return status() };
        if installed(&pack).is_none() {
            let result = match download(&app, &pack).await {
                Ok(bytes) => tauri::async_runtime::spawn_blocking(move || {
                    let pack = pack;
                    extract(&pack, bytes)
                })
                .await
                .unwrap_or_else(|e| Err(e.to_string())),
                Err(e) => Err(e),
            };
            if let Err(e) = result {
                eprintln!("[scanner] install failed: {e}");
                return json!({ "available": false, "reason": "The scanner couldn't be downloaded. Please try again.", "installSize": pack_size() });
            }
        }
        status()
    }

    fn pack_size() -> u64 {
        pack().map_or(0, |p| p.size)
    }

    pub fn run(rgba: &[u8], width: u32, height: u32) -> Value {
        let img = Image { rgba, width: width as usize, height: height as usize };
        match with_ocr(|ocr| ocr.scan(&img)) {
            Ok(Ok(detections)) => json!({ "ok": true, "width": width, "height": height, "detections": detections }),
            Ok(Err(e)) => {
                eprintln!("[scanner] scan failed: {e}");
                json!({ "ok": false, "code": "scan_failed", "message": "Couldn't read that area. Please try again." })
            }
            Err(reason) => json!({ "ok": false, "code": "unavailable", "message": reason }),
        }
    }
}

#[cfg(all(target_os = "macos", target_arch = "x86_64"))]
mod engine {
    use serde_json::{json, Value};
    use tauri::AppHandle;
    const REASON: &str = "Scanning needs a Mac with Apple silicon.";
    pub fn status() -> Value {
        json!({ "available": false, "reason": REASON })
    }
    pub async fn install(_: AppHandle) -> Value {
        status()
    }
    pub fn run(_: &[u8], _: u32, _: u32) -> Value {
        json!({ "ok": false, "code": "unavailable", "message": REASON })
    }
}

pub async fn status() -> Value {
    engine::status()
}

pub async fn install(app: AppHandle) -> Value {
    engine::install(app).await
}

async fn run_ocr(image: xcap::image::RgbaImage) -> Value {
    let (width, height) = image.dimensions();
    if width > MAX_WIDTH || height > MAX_HEIGHT {
        return json!({ "ok": false, "code": "image_too_large", "message": "That area is too large to scan." });
    }
    tauri::async_runtime::spawn_blocking(move || engine::run(image.as_raw(), width, height))
        .await
        .unwrap_or(Value::Null)
}

fn xcap_monitor_at(physical: (i32, i32), scale: f64) -> Option<xcap::Monitor> {
    let near = |a: i32, b: f64| (a as f64 - b).abs() <= 1.0;
    xcap::Monitor::all().ok()?.into_iter().find(|m| {
        let (x, y) = (m.x().unwrap_or(i32::MIN), m.y().unwrap_or(i32::MIN));
        (near(x, physical.0 as f64) && near(y, physical.1 as f64))
            || (near(x, physical.0 as f64 / scale) && near(y, physical.1 as f64 / scale))
    })
}

fn logical_width(app: &AppHandle, monitor: &xcap::Monitor) -> Option<f64> {
    app.available_monitors().ok()?.into_iter().find_map(|m| {
        let scale = m.scale_factor();
        let pos = (m.position().x, m.position().y);
        let same = xcap_monitor_at(pos, scale).is_some_and(|x| x.id().ok() == monitor.id().ok());
        same.then(|| m.size().width as f64 / scale)
    })
}

fn find_monitor(display_id: f64) -> Option<xcap::Monitor> {
    let monitors = xcap::Monitor::all().ok()?;
    let index = monitors
        .iter()
        .position(|m| m.id().ok().map(f64::from) == Some(display_id))
        .or_else(|| (monitors.len() == 1).then_some(0))
        .or_else(|| monitors.iter().position(|m| m.is_primary().unwrap_or(false)))?;
    monitors.into_iter().nth(index)
}

fn pixels_per_point(monitor: &xcap::Monitor, pixel_width: u32) -> Option<f64> {
    Some(pixel_width as f64 / logical_width(APP.get()?, monitor)?)
}

fn area_rect(area: &ScanArea, k: f64, max_w: u32, max_h: u32) -> Option<(u32, u32, u32, u32)> {
    let x = (area.x * k).round().max(0.0) as u32;
    let y = (area.y * k).round().max(0.0) as u32;
    let w = ((area.width * k).round() as u32).min(max_w.saturating_sub(x));
    let h = ((area.height * k).round() as u32).min(max_h.saturating_sub(y));
    (w > 0 && h > 0).then_some((x, y, w, h))
}

struct Frozen {
    image: xcap::image::RgbaImage,
    k: f64,
}

fn capture_monitor(display_id: f64) -> Option<Frozen> {
    let monitor = find_monitor(display_id)?;
    let image = monitor.capture_image().ok()?;
    let k = pixels_per_point(&monitor, image.width())?;
    Some(Frozen { image, k })
}

fn crop_frozen(frozen: &Frozen, area: &ScanArea) -> Option<xcap::image::RgbaImage> {
    let (x, y, w, h) = area_rect(area, frozen.k, frozen.image.width(), frozen.image.height())?;
    Some(xcap::image::imageops::crop_imm(&frozen.image, x, y, w, h).to_image())
}

fn capture_area(area: &ScanArea) -> Option<xcap::image::RgbaImage> {
    #[cfg(windows)]
    {
        let monitor = find_monitor(area.display_id)?;
        let (width, height) = (monitor.width().ok()?, monitor.height().ok()?);
        let (x, y, w, h) = area_rect(area, pixels_per_point(&monitor, width)?, width, height)?;
        monitor.capture_region(x, y, w, h).ok()
    }
    #[cfg(not(windows))]
    {
        crop_frozen(&capture_monitor(area.display_id)?, area)
    }
}

pub fn pick_done(rect: Option<(f64, f64, f64, f64)>) {
    let valid = rect.filter(|(x, y, w, h)| [*x, *y, *w, *h].iter().all(|v| v.is_finite() && *v >= 0.0));
    if let Some(tx) = PICK_RESULT.lock().unwrap().take() {
        let _ = tx.send(valid);
    }
}

async fn pick_area(app: &AppHandle, freeze: bool) -> Option<(ScanArea, Option<Frozen>)> {
    if PICKING.swap(true, Ordering::SeqCst) {
        return None;
    }
    let result = async {
        let cursor = app.cursor_position().ok()?;
        let monitor = app.monitor_from_point(cursor.x, cursor.y).ok().flatten().or_else(|| app.primary_monitor().ok().flatten())?;
        let (pos, size, scale) = (*monitor.position(), *monitor.size(), monitor.scale_factor());
        let display_id = xcap_monitor_at((pos.x, pos.y), scale)?.id().ok()? as f64;
        let frozen = if freeze {
            tauri::async_runtime::spawn_blocking(move || capture_monitor(display_id)).await.ok().flatten()
        } else {
            None
        };
        let (tx, rx) = oneshot::channel();
        *PICK_RESULT.lock().unwrap() = Some(tx);
        let builder = WebviewWindowBuilder::new(app, "picker", WebviewUrl::App("picker.html".into()))
            .title("Select an area")
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
            .data_directory(crate::webview2_data_dir(app).ok()?);
        let overlay = builder.build().ok()?;
        let _ = overlay.set_position(pos);
        let _ = overlay.set_size(size);
        let _ = overlay.show();
        let _ = overlay.set_focus();
        overlay.on_window_event(|e| {
            if matches!(e, tauri::WindowEvent::Destroyed) {
                pick_done(None);
            }
        });
        let rect = rx.await.ok().flatten();
        let _ = overlay.destroy();
        let (x, y, width, height) = rect?;
        Some((ScanArea { display_id, x, y, width, height }, frozen))
    }
    .await;
    PICKING.store(false, Ordering::SeqCst);
    result
}

async fn with_app_hidden<T>(app: &AppHandle, f: impl std::future::Future<Output = T>) -> T {
    let main = app.get_webview_window("main");
    if let Some(w) = &main {
        let _ = w.minimize();
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
    let result = f.await;
    if let Some(w) = &main {
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
    result
}

pub async fn snip(app: AppHandle) -> Value {
    let captured = with_app_hidden(&app, async {
        let (area, frozen) = pick_area(&app, true).await?;
        Some(match frozen {
            Some(frozen) => crop_frozen(&frozen, &area),
            None => {
                tokio::time::sleep(Duration::from_millis(150)).await;
                tauri::async_runtime::spawn_blocking(move || capture_area(&area)).await.ok().flatten()
            }
        })
    })
    .await;
    match captured {
        None => Value::Null,
        Some(None) => json!({ "ok": false, "code": "capture_failed", "message": "Couldn't capture the screen." }),
        Some(Some(image)) => run_ocr(image).await,
    }
}

pub fn get_auto() -> AutoScanSettings {
    *SETTINGS.lock().unwrap().get_or_insert_with(|| {
        fs::read(data_dir().join("scanner.json"))
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .unwrap_or(AutoScanSettings { enabled: false, area: None })
    })
}

fn save(next: AutoScanSettings) -> AutoScanSettings {
    *SETTINGS.lock().unwrap() = Some(next);
    if let Err(e) = fs::write(data_dir().join("scanner.json"), serde_json::to_vec(&next).unwrap()) {
        eprintln!("[scanner] failed to save settings: {e}");
    }
    update_auto_scan();
    next
}

pub fn set_auto_enabled(enabled: bool) -> AutoScanSettings {
    save(AutoScanSettings { enabled, ..get_auto() })
}

pub async fn pick_auto_area(app: AppHandle) -> AutoScanSettings {
    match with_app_hidden(&app, pick_area(&app, false)).await {
        Some((area, _)) => save(AutoScanSettings { area: Some(area), ..get_auto() }),
        None => get_auto(),
    }
}

fn fingerprint(image: &xcap::image::RgbaImage) -> Vec<u8> {
    let (w, h) = image.dimensions();
    let (tw, th) = (96u32.min(w), (h * 96.min(w) / w.max(1)).max(1));
    let mut grey = Vec::with_capacity((tw * th) as usize);
    for ty in 0..th {
        for tx in 0..tw {
            let p = image.get_pixel(tx * w / tw, ty * h / th).0;
            grey.push(((p[0] as u32 + p[1] as u32 + p[2] as u32) / 3) as u8);
        }
    }
    grey
}

fn same_frame(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && !a.is_empty() && {
        let diff: u64 = a.iter().zip(b).map(|(x, y)| (*x as i32 - *y as i32).unsigned_abs() as u64).sum();
        (diff as f64 / a.len() as f64) < AUTO_SCAN_CHANGE_THRESHOLD
    }
}

fn update_auto_scan() {
    let AutoScanSettings { enabled, area } = get_auto();
    let should_run = enabled && area.is_some() && PLACE_ID.lock().unwrap().as_deref() == Some(TRADING_PLACE_ID);
    if should_run == AUTO_RUNNING.swap(should_run, Ordering::SeqCst) || !should_run {
        return;
    }
    let Some(app) = APP.get().cloned() else { return };
    tauri::async_runtime::spawn(async move {
        let mut last: Option<(Vec<u8>, Value)> = None;
        while AUTO_RUNNING.load(Ordering::SeqCst) {
            if let Some(area) = get_auto().area {
                let image = tauri::async_runtime::spawn_blocking(move || capture_area(&area)).await.ok().flatten();
                if let Some(image) = image {
                    let print = fingerprint(&image);
                    let result = match &last {
                        Some((prev, result)) if same_frame(prev, &print) => result.clone(),
                        _ => run_ocr(image).await,
                    };
                    let _ = app.emit_to("main", "scanner:auto-result", &result);
                    last = Some((print, result));
                }
            }
            tokio::time::sleep(AUTO_SCAN_INTERVAL).await;
        }
    });
}

pub fn init(app: &AppHandle) {
    let _ = APP.set(app.clone());
    update_auto_scan();
}

pub fn set_roblox_place(place_id: Option<String>) {
    *PLACE_ID.lock().unwrap() = place_id;
    update_auto_scan();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_electron_scanner_json() {
        let s: AutoScanSettings =
            serde_json::from_str(r#"{"enabled":true,"area":{"displayId":2528732444,"x":10,"y":20.5,"width":300,"height":200}}"#).unwrap();
        assert!(s.enabled);
        assert_eq!(s.area.unwrap().display_id, 2528732444.0);
        let empty: AutoScanSettings = serde_json::from_str("{}").unwrap();
        assert!(!empty.enabled && empty.area.is_none());
    }

    #[test]
    fn detects_unchanged_frames() {
        assert!(same_frame(&[10, 10, 10], &[11, 9, 10]));
        assert!(!same_frame(&[10, 10, 10], &[20, 20, 20]));
        assert!(!same_frame(&[], &[]));
    }
}
