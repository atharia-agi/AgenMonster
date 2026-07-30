//! Computer tools — screenshot, click, type.

pub struct ComputerTools;

impl ComputerTools {
    pub fn screenshot(&self) -> Vec<u8> {
        vec![]
    }

    pub fn click(&self, _x: u32, _y: u32) -> bool {
        true
    }
    pub fn type_text(&self, _text: &str) -> bool {
        true
    }
    pub fn scroll(&self, _delta: i32) -> bool {
        true
    }
    pub fn key_press(&self, _key: &str) -> bool {
        true
    }
}
