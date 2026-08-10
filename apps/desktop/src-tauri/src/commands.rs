//! Desktop commands — Tauri IPC command handlers.
//! Includes: state management, agent bridge, equipment, personality, emotion.

use crate::agent_bridge::AgentBridge;
use monster_equipment::Equipment;
use monster_runtime::Runtime;
use serde_json::Value;
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct AppState {
    pub runtime: Arc<Mutex<Runtime>>,
    pub agent: Arc<Mutex<AgentBridge>>,
    pub loadout: Arc<Mutex<monster_equipment::EquipmentLoadout>>,
    pub equipped_ids: Arc<Mutex<Vec<String>>>,
}

#[tauri::command]
pub fn boot_runtime(state: State<AppState>) -> String {
    let rt = state.runtime.lock().unwrap();
    rt.state_json()
}

#[tauri::command]
pub fn send_task(state: State<AppState>, message: String) -> String {
    let (response, tokens) = {
        let agent = state.agent.lock().unwrap();
        agent.process_message_sync(&message)
    };

    // Feed tokens to monster
    if tokens > 0 {
        let mut rt = state.runtime.lock().unwrap();
        let usage = monster_runtime::TokenUsage {
            provider: "desktop".into(),
            model: "auto".into(),
            input_tokens: tokens / 2,
            output_tokens: tokens / 2,
            total_tokens: tokens,
            cost_usd: 0.0,
            timestamp: chrono::Utc::now().to_rfc3339(),
            task_type: "desktop".into(),
        };
        rt.feed_tokens(usage);
        if rt.xp >= rt.xp_to_next {
            rt.try_evolve();
        }
        serde_json::json!({
            "status": "ok",
            "response": response,
            "stage": rt.stage,
            "mood": rt.mood,
            "xp": rt.xp,
            "xp_to_next": rt.xp_to_next,
            "energy": rt.economy.energy,
        })
        .to_string()
    } else {
        serde_json::json!({
            "status": "ok",
            "response": response,
        })
        .to_string()
    }
}

#[tauri::command]
pub fn get_state(state: State<AppState>) -> String {
    let rt = state.runtime.lock().unwrap();
    rt.state_json()
}

#[tauri::command]
pub fn set_stage(state: State<AppState>, stage: String) -> String {
    let mut rt = state.runtime.lock().unwrap();
    rt.stage = stage.clone();
    rt.render.update_stage(&stage);
    rt.idle.update_stage(&stage);
    rt.state_json()
}

#[tauri::command]
pub fn get_skills() -> String {
    let skills_dir = std::path::Path::new("skills");
    let loaded = monster_skills::SkillLoader::load_from_dir(skills_dir).unwrap_or_default();
    let mut skill_list = Vec::new();
    for skill in &loaded {
        skill_list.push(serde_json::json!({
            "name": skill.id(),
            "version": skill.version(),
            "description": skill.description(),
            "triggers": skill.triggers(),
        }));
    }
    serde_json::json!({ "skills": skill_list }).to_string()
}

#[tauri::command]
pub fn get_memory_stats(state: State<AppState>) -> String {
    let agent = state.agent.lock().unwrap();
    let rt = state.runtime.lock().unwrap();
    serde_json::json!({
        "total_blocks": rt.tick_count,
        "memory_initialized": agent.memory_initialized,
        "db_path": app_data_dir().join("memory.db").to_string_lossy(),
    })
    .to_string()
}

#[tauri::command]
pub fn get_energy(state: State<AppState>) -> String {
    let rt = state.runtime.lock().unwrap();
    serde_json::json!({
        "energy": rt.economy.energy,
        "max": rt.economy.max_energy,
        "regen_rate": rt.economy.regen_per_hour,
    })
    .to_string()
}

#[tauri::command]
pub fn spend_energy(state: State<AppState>, cost: u32) -> String {
    let mut rt = state.runtime.lock().unwrap();
    let success = rt.spend_energy(cost);
    serde_json::json!({
        "success": success,
        "energy": rt.economy.energy,
    })
    .to_string()
}

// ── NEW COMMANDS (Round 23) ──────────────────────────────────

/// Get full game state as JSON — single call for frontend to hydrate.
#[tauri::command]
pub fn get_full_state(state: State<AppState>) -> String {
    let rt = state.runtime.lock().unwrap();
    let p = monster_runtime::personality_for_stage(&rt.stage);
    serde_json::json!({
        "stage": rt.stage,
        "mood": rt.mood,
        "xp": rt.xp,
        "xp_to_next": rt.xp_to_next,
        "energy": rt.economy.energy,
        "max_energy": rt.economy.max_energy,
        "hunger_level": rt.hunger_level,
        "personality": p.name.to_lowercase(),
        "personality_traits": p.traits,
        "dream_text": rt.dream_text,
        "dominant_task": rt.tokens.dominant_task(),
        "tick_count": rt.tick_count,
    })
    .to_string()
}

/// Manually feed tokens (e.g., from quick action "Feed Token").
#[tauri::command]
pub fn feed_tokens(state: State<AppState>, amount: u32) -> String {
    let mut rt = state.runtime.lock().unwrap();
    let usage = monster_runtime::TokenUsage {
        provider: "manual".into(),
        model: "feed".into(),
        input_tokens: amount,
        output_tokens: 0,
        total_tokens: amount,
        cost_usd: 0.0,
        timestamp: chrono::Utc::now().to_rfc3339(),
        task_type: "feed".into(),
    };
    rt.feed_tokens(usage);
    let evolved = if rt.xp >= rt.xp_to_next {
        rt.try_evolve();
        true
    } else {
        false
    };
    serde_json::json!({
        "status": "ok",
        "energy": rt.economy.energy,
        "xp": rt.xp,
        "xp_to_next": rt.xp_to_next,
        "stage": rt.stage,
        "mood": rt.mood,
        "evolved": evolved,
    })
    .to_string()
}

/// Get personality info for current stage.
#[tauri::command]
pub fn get_personality(state: State<AppState>) -> String {
    let rt = state.runtime.lock().unwrap();
    let p = monster_runtime::personality_for_stage(&rt.stage);
    serde_json::json!({
        "id": p.name.to_lowercase(),
        "name": p.name,
        "traits": p.traits,
        "preferred_mood": p.preferred_mood,
        "default_speech": p.default_speech,
        "attention_phrases": p.attention_phrases,
    })
    .to_string()
}

/// Trigger an emotion event (from frontend actions).
#[tauri::command]
pub fn trigger_event(state: State<AppState>, event: String) -> String {
    let mut rt = state.runtime.lock().unwrap();
    match event.as_str() {
        "task_success" => {
            rt.mood = "happy".into();
            rt.xp += 50;
        }
        "task_fail" => {
            rt.mood = "frustrated".into();
        }
        "token_eat" => {
            rt.economy.energy = rt.economy.energy.saturating_add(10);
            rt.mood = "happy".into();
        }
        "sleep" => {
            rt.mood = "sleepy".into();
        }
        "evolve" => {
            rt.try_evolve();
        }
        _ => {}
    }
    serde_json::json!({
        "stage": rt.stage,
        "mood": rt.mood,
        "xp": rt.xp,
        "energy": rt.economy.energy,
    })
    .to_string()
}

/// Get all available equipment.
#[tauri::command]
pub fn get_equipment() -> String {
    let items = Equipment::all();
    serde_json::json!({ "items": items }).to_string()
}

/// Equip an item to a slot.
#[tauri::command]
pub fn equip_item(state: State<AppState>, item_id: String) -> String {
    let item = match Equipment::get(&item_id) {
        Some(i) => i,
        None => return serde_json::json!({"error": "unknown item"}).to_string(),
    };
    let slot = format!("{:?}", item.slot);
    let name = item.name.clone();
    let icon = item.icon.clone();
    let mut loadout = state.loadout.lock().unwrap();
    loadout.equip(item);
    // Track equipped IDs
    let mut ids = state.equipped_ids.lock().unwrap();
    ids.retain(|id| {
        let item = Equipment::get(id);
        item.map(|i| format!("{:?}", i.slot) != slot)
            .unwrap_or(false)
    });
    ids.push(item_id.clone());
    serde_json::json!({
        "status": "ok",
        "equipped": item_id,
        "slot": slot,
        "name": name,
        "icon": icon,
        "loadout": loadout.to_json(),
        "effects": {
            "energy_bonus": loadout.total_effects().energy_bonus,
            "learning_speed": loadout.total_effects().learning_speed,
        },
    })
    .to_string()
}

/// Get current loadout.
#[tauri::command]
pub fn get_loadout(state: State<AppState>) -> String {
    let loadout = state.loadout.lock().unwrap();
    loadout.to_json()
}

/// Unequip item from a slot.
#[tauri::command]
pub fn unequip_item(state: State<AppState>, slot: String) -> String {
    let mut loadout = state.loadout.lock().unwrap();
    let removed = match slot.as_str() {
        "Head" => loadout.head.take(),
        "Body" => loadout.body.take(),
        "Held" => loadout.held.take(),
        "Back" => loadout.back.take(),
        "Accessory" => loadout.accessory.take(),
        _ => None,
    };
    if let Some(item) = removed {
        let mut ids = state.equipped_ids.lock().unwrap();
        ids.retain(|id| id != &item.id);
        serde_json::json!({
            "status": "ok",
            "unequipped": item.id,
            "slot": slot,
            "loadout": loadout.to_json(),
        })
        .to_string()
    } else {
        serde_json::json!({"status": "empty", "slot": slot}).to_string()
    }
}

fn app_data_dir() -> std::path::PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("workspace")
}

fn ensure_app_dir() {
    let dir = app_data_dir();
    let _ = std::fs::create_dir_all(&dir);
}

#[tauri::command]
pub fn save_state_native(_state: State<AppState>, payload: String) -> String {
    ensure_app_dir();
    let path = app_data_dir().join("state.json");
    if let Err(e) = std::fs::write(&path, &payload) {
        return serde_json::json!({"status": "error", "error": e.to_string()}).to_string();
    }
    serde_json::json!({"status": "ok", "path": path.to_string_lossy()}).to_string()
}

#[tauri::command]
pub fn load_state_native(_state: State<AppState>) -> String {
    let path = app_data_dir().join("state.json");
    match std::fs::read_to_string(&path) {
        Ok(data) => serde_json::json!({"status": "ok", "data": data}).to_string(),
        Err(_) => serde_json::json!({"status": "empty"}).to_string(),
    }
}

#[tauri::command]
pub fn save_memory_native(_state: State<AppState>, payload: String) -> String {
    ensure_app_dir();
    let path = app_data_dir().join("memory.json");
    if let Err(e) = std::fs::write(&path, &payload) {
        return serde_json::json!({"status": "error", "error": e.to_string()}).to_string();
    }
    serde_json::json!({"status": "ok", "path": path.to_string_lossy()}).to_string()
}

#[tauri::command]
pub fn load_memory_native(_state: State<AppState>) -> String {
    let path = app_data_dir().join("memory.json");
    match std::fs::read_to_string(&path) {
        Ok(data) => serde_json::json!({"status": "ok", "data": data}).to_string(),
        Err(_) => serde_json::json!({"status": "empty"}).to_string(),
    }
}

#[tauri::command]
pub fn save_goals_native(_state: State<AppState>, payload: String) -> String {
    ensure_app_dir();
    let path = app_data_dir().join("goals.json");
    if let Err(e) = std::fs::write(&path, &payload) {
        return serde_json::json!({"status": "error", "error": e.to_string()}).to_string();
    }
    serde_json::json!({"status": "ok", "path": path.to_string_lossy()}).to_string()
}

#[tauri::command]
pub fn load_goals_native(_state: State<AppState>) -> String {
    let path = app_data_dir().join("goals.json");
    match std::fs::read_to_string(&path) {
        Ok(data) => serde_json::json!({"status": "ok", "data": data}).to_string(),
        Err(_) => serde_json::json!({"status": "empty"}).to_string(),
    }
}

#[tauri::command]
pub fn export_backup_native(_state: State<AppState>) -> String {
    ensure_app_dir();
    let dir = app_data_dir();
    let mut backup = serde_json::json!({
        "version": 2,
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "state": serde_json::Value::Null,
        "memory": serde_json::Value::Null,
        "goals": serde_json::Value::Null,
        "evolution": serde_json::Value::Null,
    });
    let state_path = dir.join("state.json");
    let memory_path = dir.join("memory.json");
    let goals_path = dir.join("goals.json");
    let evolution_path = dir.join("evolution.json");
    if let Ok(data) = std::fs::read_to_string(&state_path) {
        if let Ok(parsed) = serde_json::from_str::<Value>(&data) {
            backup["state"] = parsed;
        }
    }
    if let Ok(data) = std::fs::read_to_string(&memory_path) {
        if let Ok(parsed) = serde_json::from_str::<Value>(&data) {
            backup["memory"] = parsed;
        }
    }
    if let Ok(data) = std::fs::read_to_string(&goals_path) {
        if let Ok(parsed) = serde_json::from_str::<Value>(&data) {
            backup["goals"] = parsed;
        }
    }
    if let Ok(data) = std::fs::read_to_string(&evolution_path) {
        if let Ok(parsed) = serde_json::from_str::<Value>(&data) {
            backup["evolution"] = parsed;
        }
    }
    let backup_path = dir.join(format!(
        "backup-{}.json",
        chrono::Utc::now().format("%Y%m%d-%H%M%S")
    ));
    let json = backup.to_string();
    if let Err(e) = std::fs::write(&backup_path, &json) {
        return serde_json::json!({"status": "error", "error": e.to_string()}).to_string();
    }
    serde_json::json!({"status": "ok", "path": backup_path.to_string_lossy(), "data": backup})
        .to_string()
}

#[tauri::command]
pub fn get_app_paths() -> String {
    let dir = app_data_dir();
    serde_json::json!({
        "data_dir": dir.to_string_lossy(),
        "state": dir.join("state.json").to_string_lossy(),
        "memory": dir.join("memory.json").to_string_lossy(),
        "goals": dir.join("goals.json").to_string_lossy(),
        "evolution": dir.join("evolution.json").to_string_lossy(),
    })
    .to_string()
}
