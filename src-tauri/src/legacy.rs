use std::collections::HashMap;
use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::data_dir;

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Marker {
    version: u32,
    token_imported: bool,
    local_storage_imported: bool,
}

const MARKER_FILE: &str = "tauri-migration.json";

fn read_marker() -> Marker {
    fs::read(data_dir().join(MARKER_FILE))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

fn update_marker(f: impl FnOnce(&mut Marker)) {
    let mut marker = read_marker();
    marker.version = 1;
    f(&mut marker);
    if let Err(e) = fs::write(data_dir().join(MARKER_FILE), serde_json::to_vec(&marker).unwrap()) {
        eprintln!("[legacy] failed to write marker: {e}");
    }
}

pub fn mark_token_imported() {
    update_marker(|m| m.token_imported = true);
}

pub fn import_token() -> Option<String> {
    if read_marker().token_imported {
        return None;
    }
    let token = fs::read(data_dir().join("auth-token.enc"))
        .ok()
        .and_then(|blob| match decrypt(&blob) {
            Ok(t) => Some(t),
            Err(e) => {
                eprintln!("[legacy] could not import the Electron session: {e}");
                None
            }
        })
        .filter(|t| !t.is_empty());
    mark_token_imported();
    token
}

#[cfg(windows)]
fn decrypt(blob: &[u8]) -> Result<String, String> {
    use aes_gcm::aead::{Aead, KeyInit};
    use base64::Engine;

    let body = blob.strip_prefix(b"v10").ok_or("unknown token format")?;
    if body.len() < 12 + 16 {
        return Err("token file too short".into());
    }
    let state: serde_json::Value =
        serde_json::from_slice(&fs::read(data_dir().join("Local State")).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
    let wrapped = base64::engine::general_purpose::STANDARD
        .decode(state["os_crypt"]["encrypted_key"].as_str().ok_or("no os_crypt key")?)
        .map_err(|e| e.to_string())?;
    let key = dpapi_unprotect(wrapped.strip_prefix(b"DPAPI").ok_or("unexpected key format")?)?;
    let cipher = aes_gcm::Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let (nonce, ciphertext) = body.split_at(12);
    let plain = cipher
        .decrypt(aes_gcm::Nonce::from_slice(nonce), ciphertext)
        .map_err(|_| "token did not decrypt")?;
    String::from_utf8(plain).map_err(|e| e.to_string())
}

#[cfg(windows)]
fn dpapi_unprotect(data: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{CryptUnprotectData, CRYPT_INTEGER_BLOB};

    let input = CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 };
    let mut output = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
    unsafe {
        if CryptUnprotectData(&input, std::ptr::null_mut(), std::ptr::null(), std::ptr::null(), std::ptr::null(), 0, &mut output) == 0 {
            return Err("DPAPI could not unwrap the key".into());
        }
        let key = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        LocalFree(output.pbData as _);
        Ok(key)
    }
}

#[cfg(unix)]
fn decrypt(blob: &[u8]) -> Result<String, String> {
    use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};

    let body = blob.strip_prefix(b"v10").ok_or("unsupported token format")?;
    #[cfg(target_os = "macos")]
    let (password, iterations) = (keychain_password()?, 1003);
    #[cfg(not(target_os = "macos"))]
    let (password, iterations) = (b"peanuts".to_vec(), 1);
    let mut key = [0u8; 16];
    pbkdf2::pbkdf2_hmac::<sha1::Sha1>(&password, b"saltysalt", iterations, &mut key);
    let plain = cbc::Decryptor::<aes::Aes128>::new(&key.into(), &[b' '; 16].into())
        .decrypt_padded_vec_mut::<Pkcs7>(body)
        .map_err(|_| "token did not decrypt")?;
    String::from_utf8(plain).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn keychain_password() -> Result<Vec<u8>, String> {
    for name in ["jailbreak-changelogs", "Jailbreak Changelogs"] {
        let service = format!("{name} Safe Storage");
        for account in [format!("{name} Key"), name.to_owned()] {
            if let Ok(p) = security_framework::passwords::get_generic_password(&service, &account) {
                return Ok(p);
            }
        }
    }
    Err("Electron's Keychain key was not found".into())
}

pub fn local_storage() -> Option<HashMap<String, String>> {
    if read_marker().local_storage_imported {
        return None;
    }
    let source = data_dir().join("Local Storage").join("leveldb");
    if !source.is_dir() {
        mark_local_storage_imported();
        return None;
    }
    match read_local_storage(&source) {
        Ok(entries) => Some(entries),
        Err(e) => {
            eprintln!("[legacy] could not read Electron localStorage: {e}");
            None
        }
    }
}

pub fn mark_local_storage_imported() {
    update_marker(|m| m.local_storage_imported = true);
}

fn read_local_storage(source: &Path) -> Result<HashMap<String, String>, String> {
    let copy = std::env::temp_dir().join(format!("jbcl-localstorage-{}", std::process::id()));
    let _ = fs::remove_dir_all(&copy);
    fs::create_dir_all(&copy).map_err(|e| e.to_string())?;
    for file in fs::read_dir(source).map_err(|e| e.to_string())?.flatten() {
        if file.file_name() != "LOCK" {
            fs::copy(file.path(), copy.join(file.file_name())).map_err(|e| e.to_string())?;
        }
    }
    let result = (|| {
        use rusty_leveldb::LdbIterator;
        let mut db = rusty_leveldb::DB::open(&copy, rusty_leveldb::Options::default()).map_err(|e| e.to_string())?;
        let mut iter = db.new_iter().map_err(|e| e.to_string())?;
        let mut entries = HashMap::new();
        while iter.advance() {
            if let Some((key, value)) = iter.current() {
                if let Some(k) = key.strip_prefix(b"_file://\0".as_slice()) {
                    if let (Some(k), Some(v)) = (decode_chromium_string(k), decode_chromium_string(&value)) {
                        entries.insert(k, v);
                    }
                }
            }
        }
        Ok(entries)
    })();
    let _ = fs::remove_dir_all(&copy);
    result
}

fn decode_chromium_string(bytes: &[u8]) -> Option<String> {
    match bytes.split_first()? {
        (0, rest) if rest.len() % 2 == 0 => {
            String::from_utf16(&rest.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect::<Vec<_>>()).ok()
        }
        (1, rest) => Some(rest.iter().map(|&b| b as char).collect()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::decode_chromium_string;

    #[test]
    fn decodes_both_chromium_string_formats() {
        assert_eq!(decode_chromium_string(b"\x01theme").as_deref(), Some("theme"));
        assert_eq!(decode_chromium_string(b"\x00h\x00i\x00").as_deref(), Some("hi"));
        assert_eq!(decode_chromium_string(b"\x00h").as_deref(), None);
        assert_eq!(decode_chromium_string(b"").as_deref(), None);
    }
}
