//! macOS Liquid Glass vibrancy tuning. Activates when running on macOS 26+.
//! Other platforms get a no-op.

#[cfg(target_os = "macos")]
pub fn apply_vibrancy_for_pet_window(window: &tauri::WebviewWindow) {
    use window_vibrancy::{NSVisualEffectMaterial, apply_vibrancy};
    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);
}

#[cfg(target_os = "macos")]
pub fn apply_liquid_glass(window: &tauri::WebviewWindow) {
    // Liquid Glass variant on macOS 26+
    use window_vibrancy::{apply_vibrancy, Vibrancy};
    let _ = apply_vibrancy(&window, Vibrancy::Sidebar, None, None);
}

#[cfg(not(target_os = "macos"))]
pub fn apply_vibrancy_for_pet_window(_window: &tauri::WebviewWindow) {}
#[cfg(not(target_os = "macos"))]
pub fn apply_liquid_glass(_window: &tauri::WebviewWindow) {}

/// Apply Window vibrancy to a Tauri window if available.
pub fn apply_window_vibrancy(window: &tauri::WebviewWindow) {
    apply_vibrancy_for_pet_window(window);
    apply_liquid_glass(window);
}
