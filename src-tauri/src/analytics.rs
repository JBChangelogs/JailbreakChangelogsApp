use std::fs;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::AppHandle;

use crate::{api_client, data_dir, is_packaged, API_BASE};

const FLUSH_INTERVAL: Duration = Duration::from_secs(30);
const MAX_BATCH: usize = 100;
const MAX_QUEUE: usize = 1000;
const MAX_PROPS: usize = 10;

#[derive(Serialize, Deserialize, Clone)]
struct Event {
    name: String,
    ts: u64,
    props: Map<String, Value>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct State {
    install_id: String,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_version: Option<String>,
}

struct Analytics {
    state: State,
    context: Value,
    queue: Vec<Event>,
}

static ANALYTICS: Mutex<Option<Analytics>> = Mutex::new(None);
static FLUSHING: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64
}

fn write_json(name: &str, value: &impl Serialize) {
    if let Err(e) = fs::write(data_dir().join(name), serde_json::to_vec(value).unwrap()) {
        eprintln!("[analytics] failed to write {name}: {e}");
    }
}

fn clean_props(props: Option<Value>) -> Map<String, Value> {
    let Some(Value::Object(map)) = props else { return Map::new() };
    map.into_iter()
        .filter(|(_, v)| v.is_string() || v.is_number() || v.is_boolean())
        .take(MAX_PROPS)
        .collect()
}

pub fn track(name: &str, props: Option<Value>) {
    let mut guard = ANALYTICS.lock().unwrap();
    let Some(a) = guard.as_mut() else { return };
    if !a.state.enabled || name.is_empty() {
        return;
    }
    let event = Event { name: name.to_owned(), ts: now_ms(), props: clean_props(props) };
    if !is_packaged() {
        println!("[analytics] {} {:?}", event.name, event.props);
        return;
    }
    a.queue.push(event);
    if a.queue.len() > MAX_QUEUE {
        let excess = a.queue.len() - MAX_QUEUE;
        a.queue.drain(..excess);
    }
    write_json("analytics-queue.json", &a.queue);
}

pub async fn flush() {
    if !is_packaged() {
        return;
    }
    let Ok(_flushing) = FLUSHING.try_lock() else { return };
    loop {
        let (context, batch) = {
            let guard = ANALYTICS.lock().unwrap();
            let Some(a) = guard.as_ref() else { return };
            if !a.state.enabled || a.queue.is_empty() {
                return;
            }
            (a.context.clone(), a.queue.iter().take(MAX_BATCH).cloned().collect::<Vec<_>>())
        };
        let mut request = api_client()
            .post(format!("{API_BASE}/v2/analytics/events"))
            .json(&serde_json::json!({ "context": context, "events": batch }));
        if let Some(token) = crate::auth::load_token() {
            request = request.header("Authorization", token);
        }
        match request.send().await {
            Ok(res) if res.status().is_success() || res.status().as_u16() == 422 => {}
            _ => return,
        }
        let mut guard = ANALYTICS.lock().unwrap();
        let Some(a) = guard.as_mut() else { return };
        let sent = batch.len().min(a.queue.len());
        a.queue.drain(..sent);
        write_json("analytics-queue.json", &a.queue);
    }
}

pub fn is_enabled() -> bool {
    ANALYTICS.lock().unwrap().as_ref().map_or(true, |a| a.state.enabled)
}

pub fn set_enabled(enabled: bool) {
    let mut guard = ANALYTICS.lock().unwrap();
    let Some(a) = guard.as_mut() else { return };
    a.state.enabled = enabled;
    write_json("analytics.json", &a.state);
    if !enabled {
        a.queue.clear();
        write_json("analytics-queue.json", &a.queue);
    }
}

static STARTED_AT: Mutex<u64> = Mutex::new(0);

pub fn track_app_close() {
    let session_ms = now_ms() - *STARTED_AT.lock().unwrap();
    track("app_close", Some(serde_json::json!({ "session_ms": session_ms })));
}

pub fn init(app: &AppHandle) {
    *STARTED_AT.lock().unwrap() = now_ms();
    let read = |name: &str| fs::read(data_dir().join(name)).ok();
    let saved: Map<String, Value> = read("analytics.json").and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
    let version = app.package_info().version.to_string();
    let previous = saved.get("lastVersion").and_then(Value::as_str).map(str::to_owned);
    let state = State {
        install_id: saved
            .get("installId")
            .and_then(Value::as_str)
            .map(str::to_owned)
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        enabled: saved.get("enabled").and_then(Value::as_bool).unwrap_or(true),
        last_version: Some(version.clone()),
    };
    write_json("analytics.json", &state);
    let queue: Vec<Event> = read("analytics-queue.json").and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
    let context = serde_json::json!({
        "install_id": state.install_id,
        "app_version": version,
        "platform": crate::NODE_PLATFORM,
        "arch": crate::NODE_ARCH,
        "os_release": crate::os_release(),
        "locale": crate::locale(),
    });
    *ANALYTICS.lock().unwrap() = Some(Analytics { state, context, queue });

    track("app_open", Some(serde_json::json!({ "cold_start": true })));
    if let Some(from) = previous.filter(|p| *p != version) {
        track("update_installed", Some(serde_json::json!({ "from": from, "to": version })));
    }

    tauri::async_runtime::spawn(async {
        loop {
            flush().await;
            tokio::time::sleep(FLUSH_INTERVAL).await;
        }
    });
}
