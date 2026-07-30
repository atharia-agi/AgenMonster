//! Sprite sheet — stores sprite frames, frame timing, hitbox data.

use std::collections::HashMap;

pub struct SpriteSheet {
    pub name: String,
    pub frame_width: u32,
    pub frame_height: u32,
    pub frames: Vec<Vec<u8>>, // RGBA pixel data per frame
    pub frame_durations_ms: Vec<u32>,
    pub hitboxes: Vec<Hitbox>,
}

pub struct Hitbox {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl SpriteSheet {
    pub fn new(name: &str, fw: u32, fh: u32) -> Self {
        Self {
            name: name.to_string(),
            frame_width: fw,
            frame_height: fh,
            frames: Vec::new(),
            frame_durations_ms: Vec::new(),
            hitboxes: Vec::new(),
        }
    }

    pub fn frame_count(&self) -> usize {
        self.frames.len()
    }

    pub fn total_duration_ms(&self) -> u32 {
        self.frame_durations_ms.iter().sum()
    }

    pub fn frame_at_time(&self, time_ms: u32) -> usize {
        let mut acc = 0u32;
        for (i, dur) in self.frame_durations_ms.iter().enumerate() {
            acc += dur;
            if time_ms < acc {
                return i;
            }
        }
        0
    }
}

pub struct SpriteRegistry {
    sheets: HashMap<String, SpriteSheet>,
}

impl Default for SpriteRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl SpriteRegistry {
    pub fn new() -> Self {
        Self {
            sheets: HashMap::new(),
        }
    }

    pub fn register(&mut self, sheet: SpriteSheet) {
        self.sheets.insert(sheet.name.clone(), sheet);
    }

    pub fn get(&self, name: &str) -> Option<&SpriteSheet> {
        self.sheets.get(name)
    }

    pub fn names(&self) -> Vec<&str> {
        self.sheets.keys().map(|s| s.as_str()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sprite_sheet_basics() {
        let mut sheet = SpriteSheet::new("test", 32, 32);
        sheet.frames.push(vec![0; 32 * 32 * 4]);
        sheet.frames.push(vec![0; 32 * 32 * 4]);
        sheet.frame_durations_ms.push(100);
        sheet.frame_durations_ms.push(100);

        assert_eq!(sheet.frame_count(), 2);
        assert_eq!(sheet.total_duration_ms(), 200);
        assert_eq!(sheet.frame_at_time(50), 0);
        assert_eq!(sheet.frame_at_time(150), 1);
    }

    #[test]
    fn test_sprite_registry() {
        let mut reg = SpriteRegistry::new();
        let sheet = SpriteSheet::new("egg_idle", 32, 32);
        reg.register(sheet);

        assert!(reg.get("egg_idle").is_some());
        assert!(reg.get("missing").is_none());
        assert_eq!(reg.names().len(), 1);
    }
}
