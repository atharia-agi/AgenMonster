// Main desktop entry — wires runtime + Tauri + UI events.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;
use std::path::PathBuf;

mod commands;
mod vibrancy;

#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let mut dir: PathBuf = directories_next()?;
    dir.push("AgenMonster");
    std::fs::create_dir_all(&dir).ok();

    let mut rt = monster_runtime::Runtime::new();
    rt.init_selector();

    let app = tauri::Builder::default()
        .manage(rt)
        .setup(move |app| {
            if let Ok(pet) = tauri::WebviewWindowBuilder::new(app, "pet-floating",
                tauri::WebviewUrl::App("index.html?window=floating".into()))
                .always_on_top(true)
                .decorations(false)
                .skip_taskbar(true)
                .transparent(true)
                .title("AgenMonster")
                .inner_size(256.0, 256.0)
                .resizable(false)
                .build() {
                vibrancy::apply_window_vibrancy(&pet);
            }
            if let Ok(_chat) = tauri::WebviewWindowBuilder::new(app, "chat-main",
                tauri::WebviewUrl::App("index.html?window=chat".into()))
                .title("AgenMonster")
                .inner_size(740.0, 720.0)
                .build() {};
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_shortcuts(["CmdOrCtrl+Shift+A"])?
            .build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::publish_user_task,
            commands::pet_clicked,
            commands::pet_dragged,
            commands::get_monster_status,
            commands::get_energy,
            commands::ask_question,
        ])
        .run(tauri::generate_context!())
        .expect("AgenMonster failed to start");

    Ok(())
}

#[cfg(target_family = "unix")]
fn directories_next() -> std::io::Result<std::path::PathBuf> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
    Ok(std::path::PathBuf::from(home).join(".config"))
}
#[cfg(target_family = "windows")]
fn directories_next() -> std::io::Result<std::path::PathBuf> {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    Ok(std::path::PathBuf::from(appdata))
}
