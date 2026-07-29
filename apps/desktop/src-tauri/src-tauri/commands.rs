// Bridge between frontend (Svelte + Tauri) and the Rust runtime.

use monster_runtime::Runtime;

#[tauri::command]
async fn publish_user_task(text: String) -> Result<String, String> {
    Ok(format!("Task received: {text}"))
}

#[tauri::command]
async fn pet_clicked(x: f32, y: f32) -> Result<String, String> {
    Ok(format!("Pet clicked at ({x}, {y})"))
}

#[tauri::command]
async fn pet_dragged(x: f32, y: f32) -> Result<String, String> {
    Ok(format!("Pet dragged to ({x}, {y})"))
}

#[tauri::command]
async fn get_monster_status(rt: tauri::State<'_, Runtime>) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "stage": rt.stage,
        "mood": rt.mood,
        "xp": rt.xp,
        "xp_to_next": rt.xp_to_next,
        "hunger": rt.hunger_level,
        "tick": rt.tick_count,
    }))
}

#[tauri::command]
async fn get_energy(rt: tauri::State<'_, Runtime>) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "current": rt.economy.energy,
        "max": rt.economy.max_energy,
        "regen": rt.economy.regen_per_hour,
    }))
}

#[tauri::command]
async fn ask_question(question: String) -> Result<String, String> {
    Ok(format!("AgenMonster received: {question}"))
}
