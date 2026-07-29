use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationDef {
    pub name: String,
    pub sprite_sheet: String,
    pub frames: Vec<AnimationFrame>,
    pub duration_ms: u32,
    pub looped: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationFrame {
    pub index: u32,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
    pub origin_x: i32,
    pub origin_y: i32,
    pub hold_ms: u32,
}
