use std::sync::Mutex;

const SERVICE: &str = "com.jailbreakchangelogs.desktop";
const ACCOUNT: &str = "auth-token";

static TOKEN: Mutex<Option<Option<String>>> = Mutex::new(None);

fn entry() -> Option<keyring::Entry> {
    keyring::Entry::new(SERVICE, ACCOUNT)
        .map_err(|e| eprintln!("[auth] credential store unavailable: {e}"))
        .ok()
}

pub fn load_token() -> Option<String> {
    let mut cached = TOKEN.lock().unwrap();
    if let Some(token) = cached.as_ref() {
        return token.clone();
    }
    let token = entry()
        .and_then(|e| e.get_password().ok())
        .or_else(|| {
            let imported = crate::legacy::import_token()?;
            store(&imported);
            Some(imported)
        });
    *cached = Some(token.clone());
    token
}

fn store(token: &str) {
    if let Some(Err(e)) = entry().map(|e| e.set_password(token)) {
        eprintln!("[auth] could not persist the session: {e}");
    }
}

pub fn save_token(token: &str) {
    store(token);
    *TOKEN.lock().unwrap() = Some(Some(token.to_owned()));
}

pub fn clear_token() {
    if let Some(e) = entry() {
        let _ = e.delete_credential();
    }
    crate::legacy::mark_token_imported();
    *TOKEN.lock().unwrap() = Some(None);
}
