//! Camera: 2D pan & zoom for the floating pet. Always centred, but uses
//! easing to soften sudden resolution transitions.

#[derive(Debug, Default)]
pub struct Camera {
    pub x: f32,
    pub y: f32,
    pub zoom: f32,
    pub target_x: f32,
    pub target_y: f32,
    pub target_zoom: f32,
}

impl Camera {
    pub fn look_at(&mut self, x: f32, y: f32) {
        self.target_x = x;
        self.target_y = y;
    }
    pub fn set_zoom(&mut self, z: f32) {
        self.target_zoom = z.clamp(0.5, 2.5);
    }
    pub fn step(&mut self, dt: f32) {
        let k = (dt * 6.0).min(1.0);
        self.x += (self.target_x - self.x) * k;
        self.y += (self.target_y - self.y) * k;
        self.zoom += (self.target_zoom - self.zoom) * k;
    }
}
