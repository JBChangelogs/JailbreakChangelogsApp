use serde::Serialize;

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct RobloxActivity {
    pub job_id: Option<String>,
    pub place_id: Option<String>,
    pub game: Option<String>,
}

const GAME_ICONS_URL: &str = "https://thumbnails.roblox.com/v1/places/gameicons?placeIds=606849621,9780994092&size=150x150&format=Png&returnPolicy=PlaceHolder";

static GAME_ICONS: std::sync::Mutex<Option<std::collections::HashMap<String, String>>> = std::sync::Mutex::new(None);

pub async fn game_icons() -> std::collections::HashMap<String, String> {
    if let Some(icons) = GAME_ICONS.lock().unwrap().clone() {
        return icons;
    }
    let mut icons = std::collections::HashMap::new();
    let Ok(res) = crate::api_client().get(GAME_ICONS_URL).send().await else { return icons };
    let Ok(body) = res.json::<serde_json::Value>().await else { return icons };
    for entry in body["data"].as_array().into_iter().flatten() {
        if let (Some(id), Some(url)) = (entry["targetId"].as_u64(), entry["imageUrl"].as_str()) {
            icons.insert(id.to_string(), url.to_string());
        }
    }
    if !icons.is_empty() {
        *GAME_ICONS.lock().unwrap() = Some(icons.clone());
    }
    icons
}

pub fn known_game(place_id: &str) -> Option<&'static str> {
    match place_id {
        "606849621" => Some("Jailbreak"),
        "9780994092" => Some("Trading"),
        _ => None,
    }
}

#[cfg(any(windows, test))]
const JOIN_PREFIX: &str = "Joining game '";
#[cfg(any(windows, test))]
const LEAVE_PATTERN: &str = "leaveUGCGameInternal";

#[cfg(any(windows, test))]
fn find_joins(text: &str) -> Vec<(usize, String, String)> {
    let mut found = Vec::new();
    let mut from = 0;
    while let Some(i) = text[from..].find(JOIN_PREFIX) {
        let start = from + i;
        from = start + JOIN_PREFIX.len();
        let rest = &text[from..];
        let job = rest.get(..36).filter(|j| j.bytes().all(|b| b.is_ascii_hexdigit() || b == b'-'));
        let Some(job) = job else { continue };
        let Some(after) = rest[36..].strip_prefix("' place ") else { continue };
        let digits: String = after.chars().take_while(char::is_ascii_digit).collect();
        if !digits.is_empty() {
            found.push((start, job.to_owned(), digits));
        }
    }
    found
}

#[cfg(windows)]
pub use watcher::start;

#[cfg(not(windows))]
pub fn start(_on_activity: impl Fn(RobloxActivity) + Send + 'static) {}

#[cfg(windows)]
mod watcher {
    use super::*;
    use std::collections::{HashMap, HashSet};
    use std::fs::{self, File};
    use std::io::{Read, Seek, SeekFrom};
    use std::path::PathBuf;
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    const TARGET_PROCESS: &str = "RobloxPlayerBeta.exe";
    const LOG_CREATE_BUFFER_MS: u64 = 5_000;
    const POLL_INTERVAL: Duration = Duration::from_secs(2);
    const LAUNCH_TIME_FALLBACK_WINDOW_MS: u64 = 12 * 60 * 60 * 1000;
    const REQUIRED_CONSECUTIVE_POLLS: u32 = 2;

    fn now_ms() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64
    }

    pub fn process_start_time(name: &str) -> Option<Option<u64>> {
        use windows_sys::Win32::Foundation::{CloseHandle, FILETIME, INVALID_HANDLE_VALUE};
        use windows_sys::Win32::System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
        };
        use windows_sys::Win32::System::Threading::{GetProcessTimes, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

        let mut running = false;
        let mut earliest: Option<u64> = None;
        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snapshot == INVALID_HANDLE_VALUE {
                return None;
            }
            let mut entry: PROCESSENTRY32W = std::mem::zeroed();
            entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
            let mut ok = Process32FirstW(snapshot, &mut entry) != 0;
            while ok {
                let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
                if String::from_utf16_lossy(&entry.szExeFile[..len]).eq_ignore_ascii_case(name) {
                    running = true;
                    let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, entry.th32ProcessID);
                    if !process.is_null() {
                        let zero = FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 };
                        let (mut created, mut exited, mut kernel, mut user) = (zero, zero, zero, zero);
                        if GetProcessTimes(process, &mut created, &mut exited, &mut kernel, &mut user) != 0 {
                            let ticks = ((created.dwHighDateTime as u64) << 32) | created.dwLowDateTime as u64;
                            let ms = ticks.saturating_sub(116_444_736_000_000_000) / 10_000;
                            earliest = Some(earliest.map_or(ms, |e| e.min(ms)));
                        }
                        CloseHandle(process);
                    }
                }
                ok = Process32NextW(snapshot, &mut entry) != 0;
            }
            CloseHandle(snapshot);
        }
        running.then_some(earliest)
    }

    fn recent_log_files(dir: &PathBuf, not_before: u64) -> Vec<PathBuf> {
        let Ok(entries) = fs::read_dir(dir) else { return Vec::new() };
        let mut files: Vec<(PathBuf, u64)> = entries
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().ends_with(".log"))
            .filter_map(|e| {
                let mtime = e.metadata().ok()?.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_millis() as u64;
                (mtime >= not_before).then(|| (e.path(), mtime))
            })
            .collect();
        files.sort_by_key(|(_, m)| *m);
        files.into_iter().map(|(p, _)| p).collect()
    }

    fn read_from(path: &PathBuf, from: u64) -> Option<(String, u64)> {
        let mut file = File::open(path).ok()?;
        file.seek(SeekFrom::Start(from)).ok()?;
        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes).ok()?;
        let complete = bytes.iter().rposition(|&b| b == b'\n').map_or(0, |i| i + 1);
        bytes.truncate(complete);
        Some((String::from_utf8_lossy(&bytes).into_owned(), from + complete as u64))
    }

    struct Watcher<F: Fn(RobloxActivity)> {
        on_activity: F,
        in_game: bool,
        seen_job_ids: HashSet<String>,
    }

    impl<F: Fn(RobloxActivity)> Watcher<F> {
        fn report(&mut self, job_id: &str, place_id: &str) {
            if !self.seen_job_ids.insert(job_id.to_owned()) {
                return;
            }
            self.in_game = true;
            (self.on_activity)(RobloxActivity {
                job_id: Some(job_id.to_owned()),
                place_id: Some(place_id.to_owned()),
                game: known_game(place_id).map(str::to_owned),
            });
        }

        fn clear_activity(&mut self) {
            if !self.in_game {
                return;
            }
            self.in_game = false;
            self.seen_job_ids.clear();
            (self.on_activity)(RobloxActivity::default());
        }

        fn scan(&mut self, fresh: &str) {
            let mut events: Vec<(usize, Option<(String, String)>)> =
                find_joins(fresh).into_iter().map(|(at, job, place)| (at, Some((job, place)))).collect();
            events.extend(fresh.match_indices(LEAVE_PATTERN).map(|(at, _)| (at, None)));
            events.sort_by_key(|(at, _)| *at);
            for (_, join) in events {
                match join {
                    Some((job, place)) => self.report(&job, &place),
                    None => self.clear_activity(),
                }
            }
        }
    }

    pub fn start(on_activity: impl Fn(RobloxActivity) + Send + 'static) {
        let Some(local) = std::env::var_os("LOCALAPPDATA") else { return };
        let log_dir = PathBuf::from(local).join("Roblox").join("logs");
        std::thread::Builder::new()
            .name("roblox-watcher".into())
            .spawn(move || {
                let mut w = Watcher { on_activity, in_game: false, seen_job_ids: HashSet::new() };
                let (mut was_running, mut initializing) = (false, false);
                let (mut present_streak, mut missing_streak) = (0u32, 0u32);
                let mut session_start = 0u64;
                let mut baselines: HashMap<PathBuf, u64> = HashMap::new();
                loop {
                    let launch = process_start_time(TARGET_PROCESS);
                    if launch.is_some() {
                        present_streak += 1;
                        missing_streak = 0;
                    } else {
                        missing_streak += 1;
                        present_streak = 0;
                    }
                    let running = if was_running {
                        missing_streak < REQUIRED_CONSECUTIVE_POLLS
                    } else {
                        present_streak >= REQUIRED_CONSECUTIVE_POLLS
                    };

                    if running && !was_running {
                        let launch_time = launch.flatten();
                        session_start = match launch_time {
                            Some(t) => t.saturating_sub(LOG_CREATE_BUFFER_MS),
                            None => now_ms().saturating_sub(LAUNCH_TIME_FALLBACK_WINDOW_MS),
                        };
                        println!(
                            "[roblox-watcher] Roblox detected running - scanning log files{}",
                            if launch_time.is_none() { " (launch time unavailable, using fallback window)" } else { "" }
                        );
                        baselines.clear();
                        initializing = true;
                    } else if !running && was_running {
                        w.clear_activity();
                    }
                    was_running = running;

                    if running || initializing {
                        let files = recent_log_files(&log_dir, session_start);
                        let mut already_in_game: Option<(String, String)> = None;
                        for path in &files {
                            let len = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
                            match baselines.get(path).copied() {
                                None => {
                                    let Some((content, end)) = read_from(path, 0) else { continue };
                                    baselines.insert(path.clone(), end);
                                    if initializing {
                                        if let Some((_, job, place)) = find_joins(&content).pop() {
                                            let leave = content.rfind(LEAVE_PATTERN).map_or(-1, |i| i as i64);
                                            let joined = content.rfind(&format!("'{job}'")).map_or(-1, |i| i as i64);
                                            if leave < joined {
                                                already_in_game = Some((job, place));
                                            }
                                        }
                                    }
                                }
                                Some(known) => {
                                    let from = if len < known { 0 } else { known };
                                    if len == from {
                                        continue;
                                    }
                                    let Some((fresh, end)) = read_from(path, from) else { continue };
                                    baselines.insert(path.clone(), end);
                                    w.scan(&fresh);
                                }
                            }
                        }
                        if initializing {
                            match already_in_game {
                                Some((job, place)) => w.report(&job, &place),
                                None => println!("[roblox-watcher] no existing join among {} recent log file(s)", files.len()),
                            }
                            initializing = false;
                        }
                    }
                    std::thread::sleep(POLL_INTERVAL);
                }
            })
            .expect("spawn roblox watcher");
    }
}

#[cfg(test)]
mod tests {
    use super::find_joins;

    #[test]
    fn parses_join_lines() {
        let log = "x Joining game 'a1b2c3d4-0000-1111-2222-333344445555' place 606849621 at 1.2.3.4\n\
                   Joining game 'bad' place 1\nJoining game 'a1b2c3d4-0000-1111-2222-33334444555Z' place 2\n";
        let joins = find_joins(log);
        assert_eq!(joins.len(), 1);
        assert_eq!(joins[0].1, "a1b2c3d4-0000-1111-2222-333344445555");
        assert_eq!(joins[0].2, "606849621");
    }
}
