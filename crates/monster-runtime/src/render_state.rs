//! Render subsystem — tracks display state for the frontend.

pub struct RenderSubsystem {
    pub stage: String,
    pub width: u32,
    pub height: u32,
    pub frame: u64,
    pub fps: f32,
}

impl RenderSubsystem {
    pub fn new(stage: &str, width: u32, height: u32) -> Self {
        Self {
            stage: stage.to_string(),
            width,
            height,
            frame: 0,
            fps: 60.0,
        }
    }

    pub fn update_stage(&mut self, stage: &str) {
        self.stage = stage.to_string();
    }

    pub fn tick(&mut self) {
        self.frame += 1;
    }

    pub fn state_json(&self) -> String {
        format!(
            r#"{{"stage":"{}","width":{},"height":{},"frame":{},"fps":{}}}"#,
            self.stage, self.width, self.height, self.frame, self.fps
        )
    }
}

impl Default for RenderSubsystem {
    fn default() -> Self { Self::new("egg", 200, 200) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render() {
        let mut r = RenderSubsystem::new("egg", 200, 200);
        assert_eq!(r.stage, "egg");
        r.tick();
        assert_eq!(r.frame, 1);
        r.update_stage("hatchling");
        assert_eq!(r.stage, "hatchling");
    }
}
