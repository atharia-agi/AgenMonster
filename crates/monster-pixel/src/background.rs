//! Background renderer — stage-specific animated backgrounds.

pub struct Background {
    stage: String,
    pub width: u32,
    pub height: u32,
}

impl Background {
    pub fn new(stage: &str, width: u32, height: u32) -> Self {
        Self {
            stage: stage.to_string(),
            width,
            height,
        }
    }

    pub fn render_frame(&self, _frame: u32, _time_s: f32) -> Vec<u8> {
        // Returns RGBA pixel data for the background
        vec![0; (self.width * self.height * 4) as usize]
    }

    pub fn pattern_name(&self) -> &'static str {
        crate::tile_patterns::pattern_for_stage(&self.stage)
    }

    pub fn update_stage(&mut self, stage: &str) {
        self.stage = stage.to_string();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_background() {
        let bg = Background::new("egg", 200, 200);
        assert_eq!(bg.pattern_name(), "egg_dots");
        let frame = bg.render_frame(0, 0.0);
        assert_eq!(frame.len(), 200 * 200 * 4);
    }
}
