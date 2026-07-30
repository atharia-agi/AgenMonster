//! Tauri main entry — boots the desktop pet window.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use agenmonster_desktop_lib::agent_bridge::AgentBridge;
use monster_runtime::Runtime;
use std::sync::{Arc, Mutex};
use tauri::Manager;

fn main() {
    tracing_subscriber::fmt().with_env_filter("info").init();

    let runtime = Arc::new(Mutex::new(Runtime::new()));
    let mut agent = AgentBridge::new(runtime.clone());
    agent.init_memory();
    let agent = Arc::new(Mutex::new(agent));

    let state = agenmonster_desktop_lib::commands::AppState {
        runtime: runtime.clone(),
        agent: agent.clone(),
        loadout: Arc::new(Mutex::new(monster_equipment::EquipmentLoadout::new())),
        equipped_ids: Arc::new(Mutex::new(Vec::new())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            agenmonster_desktop_lib::commands::boot_runtime,
            agenmonster_desktop_lib::commands::send_task,
            agenmonster_desktop_lib::commands::get_state,
            agenmonster_desktop_lib::commands::set_stage,
            agenmonster_desktop_lib::commands::get_skills,
            agenmonster_desktop_lib::commands::get_memory_stats,
            agenmonster_desktop_lib::commands::get_energy,
            agenmonster_desktop_lib::commands::spend_energy,
            agenmonster_desktop_lib::commands::get_full_state,
            agenmonster_desktop_lib::commands::feed_tokens,
            agenmonster_desktop_lib::commands::get_personality,
            agenmonster_desktop_lib::commands::trigger_event,
            agenmonster_desktop_lib::commands::get_equipment,
            agenmonster_desktop_lib::commands::equip_item,
            agenmonster_desktop_lib::commands::unequip_item,
            agenmonster_desktop_lib::commands::get_loadout,
            agenmonster_desktop_lib::commands::save_state_native,
            agenmonster_desktop_lib::commands::load_state_native,
            agenmonster_desktop_lib::commands::save_memory_native,
            agenmonster_desktop_lib::commands::load_memory_native,
            agenmonster_desktop_lib::commands::save_goals_native,
            agenmonster_desktop_lib::commands::load_goals_native,
            agenmonster_desktop_lib::commands::export_backup_native,
            agenmonster_desktop_lib::commands::get_app_paths,
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { .. } => {
                let _ = window.hide();
            }
            _ => {}
        })
        .setup(|app| {
            let _window = app.get_webview_window("pet");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run agenmonster");
}
