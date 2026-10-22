use std::collections::HashMap;
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use discord_rich_presence::activity::{Activity, Assets, Button, Timestamps};
use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use serde_json::Value;

use crate::{api_client, roblox::RobloxActivity, API_BASE};

const CLIENT_ID: &str = "1281308669299920907";
const LOCATION_REFRESH: Duration = Duration::from_secs(10);
const JAILBREAK_PLACE_ID: &str = "606849621";
const ROBLOX_SMALL_IMAGE_KEY: &str = "controller2";
const RECONNECT_BASE: Duration = Duration::from_secs(2);
const RECONNECT_MAX: Duration = Duration::from_secs(30);

pub const PREFERENCE_KEYS: [&str; 6] = [
    "rich_presence_enabled",
    "rich_presence_show_details",
    "rich_presence_show_state",
    "rich_presence_show_roblox_badge",
    "rich_presence_show_join_button",
    "rich_presence_show_website_button",
];

enum Msg {
    Update,
    Stop(Sender<()>),
}

static TX: OnceLock<Sender<Msg>> = OnceLock::new();
static PREFS: Mutex<Option<HashMap<&'static str, bool>>> = Mutex::new(None);
static ROBLOX: Mutex<Option<(String, Option<String>)>> = Mutex::new(None);

fn pref(key: &str) -> bool {
    PREFS.lock().unwrap().as_ref().and_then(|p| p.get(key).copied()).unwrap_or(true)
}

fn nudge() {
    if let Some(tx) = TX.get() {
        let _ = tx.send(Msg::Update);
    }
}

pub fn set_preference(key: &str, value: bool) {
    let Some(&key) = PREFERENCE_KEYS.iter().find(|k| **k == key) else { return };
    PREFS.lock().unwrap().get_or_insert_with(HashMap::new).insert(key, value);
    nudge();
}

pub fn refresh() {
    nudge();
}

pub fn set_roblox_activity(activity: &RobloxActivity) {
    *ROBLOX.lock().unwrap() = activity.place_id.clone().map(|p| (p, activity.job_id.clone()));
    nudge();
}

const STATIC_LOCATIONS: &[(&str, &str)] = &[
    ("/", "browsing the home page"),
    ("/values", "checking the value list"),
    ("/values/calculator", "using the trade calculator"),
    ("/faq", "viewing the FAQ"),
    ("/privacy", "reading the privacy policy"),
    ("/tos", "reading the terms of service"),
    ("/contributors", "viewing the contributors page"),
    ("/supporting", "viewing ways to support us"),
    ("/servers", "browsing trading servers"),
    ("/bot", "viewing the Discord bot page"),
    ("/settings", "viewing settings"),
    ("/trading", "browsing the trading hub"),
    ("/hyperchrome-pity", "tracking HyperChrome pity"),
    ("/users", "browsing users"),
    ("/testimonials", "reading testimonials"),
    ("/robberies", "viewing robberies"),
    ("/bounties", "viewing bounties"),
    ("/inventories", "checking someone's inventory"),
    ("/messages", "viewing messages"),
    ("/og", "using the OG finder"),
    ("/dupes", "viewing the dupe list"),
    ("/changelogs/timeline", "viewing the changelog timeline"),
    ("/items/suggestions", "viewing item suggestions"),
];

fn decode_uri_component(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        let hex = bytes.get(i + 1..i + 3).and_then(|h| std::str::from_utf8(h).ok()).and_then(|h| u8::from_str_radix(h, 16).ok());
        match (bytes[i], hex) {
            (b'%', Some(b)) => {
                out.push(b);
                i += 3;
            }
            (b, _) => {
                out.push(b);
                i += 1;
            }
        }
    }
    String::from_utf8(out).unwrap_or_else(|_| s.to_owned())
}

fn humanize_slug(slug: &str) -> String {
    match slug {
        "dupefinder" => return "Dupe Finder".into(),
        "calculator" => return "Value Calculator".into(),
        _ => {}
    }
    let mut out = String::new();
    let mut in_run = false;
    let mut prev_word = false;
    for c in decode_uri_component(slug).chars() {
        if c == '-' || c == '_' {
            if !in_run {
                out.push(' ');
            }
            in_run = true;
            prev_word = false;
            continue;
        }
        in_run = false;
        let word = c.is_ascii_alphanumeric();
        if word && !prev_word {
            out.push(c.to_ascii_uppercase());
        } else {
            out.push(c);
        }
        prev_word = word;
    }
    out
}

#[derive(Default, Clone)]
struct Identity {
    discord_id: Option<String>,
    roblox_id: Option<String>,
}

fn location_phrase(path: Option<&str>, identity: &Identity) -> Option<String> {
    let path = path.filter(|p| !p.is_empty())?;
    let path = path.split('?').next().unwrap().split('#').next().unwrap();
    let trimmed = path.trim_end_matches('/');
    let clean = if trimmed.is_empty() { "/" } else { trimmed };
    if let Some((_, phrase)) = STATIC_LOCATIONS.iter().find(|(p, _)| *p == clean) {
        return Some((*phrase).into());
    }
    let s: Vec<&str> = clean.split('/').filter(|s| !s.is_empty()).collect();
    let is_own = |id: &Option<String>, seg: &str| id.as_deref() == Some(seg);
    Some(match s.as_slice() {
        ["changelogs", id, ..] => format!("viewing changelog #{id}"),
        ["items", "changelogs", id, ..] => format!("viewing item changelog #{id}"),
        ["items", "suggestions", id, ..] => format!("looking at item suggestion #{id}"),
        ["seasons", id, ..] => format!("checking season {id}"),
        ["trading", "ad", id, ..] => format!("viewing trade ad #{id}"),
        ["values", slug, ..] => format!("checking {}'s value", humanize_slug(slug)),
        ["inventories", id, ..] if is_own(&identity.roblox_id, id) => "checking their own inventory".into(),
        ["inventories", _, ..] => "checking someone's inventory".into(),
        ["ogs" | "og", id, ..] if is_own(&identity.roblox_id, id) => "checking their own OGs".into(),
        ["ogs" | "og", _, ..] => "checking someone's OGs".into(),
        ["users", id, ..] if is_own(&identity.discord_id, id) => "viewing their own profile".into(),
        ["users", _, ..] => "viewing a profile".into(),
        _ => "browsing the site".into(),
    })
}

fn format_location(path: Option<&str>, identity: &Identity) -> Option<String> {
    let phrase = location_phrase(path, identity)?;
    let mut chars = phrase.chars();
    Some(chars.next().map(|c| c.to_uppercase().collect::<String>() + chars.as_str()).unwrap_or_default())
}

static IDENTITY: Mutex<Option<(String, Identity)>> = Mutex::new(None);

async fn get_json(path: &str, token: &str) -> Option<Value> {
    let res = api_client().get(format!("{API_BASE}{path}")).header("Authorization", token).send().await;
    match res {
        Ok(r) => r.json().await.ok(),
        Err(e) => {
            eprintln!("[discord-rpc] failed to load {path}: {e}");
            None
        }
    }
}

async fn own_identity(token: &str) -> Identity {
    if let Some((t, id)) = IDENTITY.lock().unwrap().as_ref() {
        if t == token {
            return id.clone();
        }
    }
    let Some(data) = get_json("/v2/users/me", token).await else { return Identity::default() };
    let identity = Identity {
        discord_id: data["id"].as_str().map(str::to_owned),
        roblox_id: data["roblox"]["roblox_id"].as_str().map(str::to_owned),
    };
    *IDENTITY.lock().unwrap() = Some((token.to_owned(), identity.clone()));
    identity
}

struct Presence {
    details: Option<String>,
    state: Option<String>,
    badge: Option<(String, String)>,
    buttons: Vec<(String, String)>,
}

async fn compute() -> Option<Presence> {
    if !pref("rich_presence_enabled") {
        return None;
    }
    let roblox = ROBLOX.lock().unwrap().clone();
    let game = roblox.as_ref().and_then(|(place, _)| crate::roblox::known_game(place));
    let mut buttons = Vec::new();
    if let (Some((place, Some(job))), Some(_)) = (&roblox, game) {
        if place == JAILBREAK_PLACE_ID && pref("rich_presence_show_join_button") {
            buttons.push(("Join Server".to_owned(), format!("roblox://experiences/start?placeId={place}&gameInstanceId={job}")));
        }
    }
    if pref("rich_presence_show_website_button") {
        buttons.push(("Visit website".to_owned(), "https://jailbreakchangelogs.com".to_owned()));
    }
    let badge = game
        .filter(|_| pref("rich_presence_show_roblox_badge"))
        .map(|g| (ROBLOX_SMALL_IMAGE_KEY.to_owned(), format!("Inside {g}")));
    let mut presence = Presence { details: None, state: None, badge, buttons };
    let Some(token) = crate::auth::load_token() else { return Some(presence) };
    let (location, identity) = tokio::join!(get_json("/v2/users/me/location", &token), own_identity(&token));
    if pref("rich_presence_show_details") {
        presence.details = format_location(location.as_ref().and_then(|l| l["location"].as_str()), &identity);
    }
    presence.state = location
        .as_ref()
        .and_then(|l| l["app_location"].as_str())
        .filter(|s| !s.is_empty() && pref("rich_presence_show_state"))
        .map(|s| format!("{} (App)", humanize_slug(s)));
    Some(presence)
}

fn apply(client: &mut DiscordIpcClient, session_start: i64) -> Result<(), discord_rich_presence::error::Error> {
    match tauri::async_runtime::block_on(compute()) {
        None => client.clear_activity(),
        Some(Presence { details, state, badge, buttons }) => {
            let mut activity = Activity::new().timestamps(Timestamps::new().start(session_start));
            if let Some(d) = details.as_deref() {
                activity = activity.details(d);
            }
            if let Some(s) = state.as_deref() {
                activity = activity.state(s);
            }
            if let Some((key, text)) = badge.as_ref() {
                activity = activity.assets(Assets::new().small_image(key.as_str()).small_text(text.as_str()));
            }
            if !buttons.is_empty() {
                activity = activity.buttons(buttons.iter().map(|(l, u)| Button::new(l.as_str(), u.as_str())).collect());
            }
            client.set_activity(activity)
        }
    }
}

fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64
}

pub fn start() {
    let (tx, rx) = mpsc::channel();
    if TX.set(tx).is_err() {
        return;
    }
    std::thread::Builder::new()
        .name("discord-rpc".into())
        .spawn(move || {
            let mut delay = RECONNECT_BASE;
            loop {
                let mut client = DiscordIpcClient::new(CLIENT_ID);
                let connected = client.connect();
                if let Err(e) = &connected {
                    eprintln!("[discord-rpc] could not connect (Discord probably not running): {e}");
                }
                if connected.is_ok() {
                    delay = RECONNECT_BASE;
                    let session_start = now_ms();
                    loop {
                        if let Err(e) = apply(&mut client, session_start) {
                            eprintln!("[discord-rpc] failed to set activity: {e}");
                            break;
                        }
                        match rx.recv_timeout(LOCATION_REFRESH) {
                            Ok(Msg::Update) | Err(RecvTimeoutError::Timeout) => {}
                            Ok(Msg::Stop(done)) => {
                                let _ = client.clear_activity();
                                let _ = client.close();
                                let _ = done.send(());
                                return;
                            }
                            Err(RecvTimeoutError::Disconnected) => return,
                        }
                    }
                    let _ = client.close();
                }
                match rx.recv_timeout(delay) {
                    Ok(Msg::Stop(done)) => {
                        let _ = done.send(());
                        return;
                    }
                    Err(RecvTimeoutError::Disconnected) => return,
                    _ => {}
                }
                delay = (delay * 2).min(RECONNECT_MAX);
            }
        })
        .expect("spawn discord thread");
}

pub fn stop(timeout: Duration) {
    let Some(tx) = TX.get() else { return };
    let (done_tx, done_rx) = mpsc::channel();
    if tx.send(Msg::Stop(done_tx)).is_ok() {
        let _ = done_rx.recv_timeout(timeout);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_locations_like_the_electron_app() {
        let me = Identity { discord_id: Some("1".into()), roblox_id: Some("2".into()) };
        assert_eq!(format_location(Some("/values/"), &me).as_deref(), Some("Checking the value list"));
        assert_eq!(format_location(Some("/values/torpedo-engine?x=1"), &me).as_deref(), Some("Checking Torpedo Engine's value"));
        assert_eq!(format_location(Some("/values/calculator"), &me).as_deref(), Some("Using the trade calculator"));
        assert_eq!(format_location(Some("/users/1"), &me).as_deref(), Some("Viewing their own profile"));
        assert_eq!(format_location(Some("/users/9"), &me).as_deref(), Some("Viewing a profile"));
        assert_eq!(format_location(Some("/inventories/2"), &me).as_deref(), Some("Checking their own inventory"));
        assert_eq!(format_location(Some("/weird/path"), &me).as_deref(), Some("Browsing the site"));
        assert_eq!(format_location(Some(""), &me), None);
        assert_eq!(humanize_slug("hyper%20blue__level-3"), "Hyper Blue Level 3");
        assert_eq!(humanize_slug("dupefinder"), "Dupe Finder");
    }
}
