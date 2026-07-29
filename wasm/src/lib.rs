//! WASM entry point — compiles to wasm32-unknown-unknown.
//! Exports boot/send/state for browser-based pet.

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn boot() -> i32 {
    0
}

#[wasm_bindgen]
pub fn send(task: &str) -> String {
    format!("received: {task}")
}

#[wasm_bindgen]
pub fn state() -> String {
    serde_json::json!({
        "status": "running",
        "stage": "egg",
        "energy": 1000,
    }).to_string()
}
