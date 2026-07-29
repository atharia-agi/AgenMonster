//! OS tools — process, env, clipboard.

pub struct OsTools;

impl OsTools {
    pub fn process_list(&self) -> Vec<String> {
        vec!["init".into(), "systemd".into()]
    }

    pub fn env_get(&self, key: &str) -> Option<String> {
        std::env::var(key).ok()
    }

    pub fn clipboard_get(&self) -> String {
        String::new()
    }

    pub fn clipboard_set(&self, _text: &str) -> bool {
        true
    }
}
