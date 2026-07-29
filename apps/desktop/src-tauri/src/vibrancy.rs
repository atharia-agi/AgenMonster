//! Vibrancy — macOS/Windows window effects.

#[cfg(target_os = "macos")]
pub fn apply_vibrancy(_window: &tauri::Window) {
    // macOS vibrancy
}

#[cfg(target_os = "windows")]
pub fn apply_mica(_window: &tauri::Window) {
    // Windows Mica/Acrylic
}

#[cfg(target_os = "linux")]
pub fn apply_none() {}
