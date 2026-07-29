//! Render subsystem — orchestrates sprite + background + effects.

pub struct RenderSubsystem {
    pub stage: String,
    pub width: u32,
    pub height: u32,
    pub scale: f32,
    pub visible: bool,
    pub opacity: f32,
}

impl RenderSubsystem {
    pub fn new(stage: &str, width: u32, height: u32) -> Self {
        Self {
            stage: stage.to_string(),
            width, height,
            scale: 1.0,
            visible: true,
            opacity: 1.0,
        }
    }

    pub fn update_stage(&mut self, stage: &str) {
        self.stage = stage.to_string();
    }

    pub fn set_scale(&mut self, scale: f32) {
        self.scale = scale.clamp(0.25, 4.0);
    }

    pub fn set_opacity(&mut self, opacity: f32) {
        self.opacity = opacity.clamp(0.0, 1.0);
    }

    pub fn show(&mut self) { self.visible = true; }
    pub fn hide(&mut self) { self.visible = false; }

    pub fn render_frame(&self, frame: u32, time_s: f32) -> Vec<u8> {
        let bg = crate::background::Background::new(&self.stage, self.width, self.height);
        bg.render_frame(frame, time_s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_subsystem() {
        let mut rs = RenderSubsystem::new("egg", 200, 200);
        assert!(rs.visible);
        rs.set_scale(2.0);
        assert_eq!(rs.scale, 2.0);
        rs.set_opacity(0.5);
        assert_eq!(rs.opacity, 0.5);
        rs.hide();
        assert!(!rs.visible);
    }
}
