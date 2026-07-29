//! Idle bobbing, eye blink, tail wag generator. Independent of any
//! backend so it can drive a remote UI over FFI.

use crate::Frame;

#[derive(Debug, Default)]
pub struct Animator {
    pub phase: f32,
    pub mood_phase: f32,
    pub cursor_target: (f32, f32),
    pub cursor_now: (f32, f32),
}

impl Animator {
    pub fn step(&mut self, dt: f32) -> Frame {
        self.phase += dt;
        self.mood_phase += dt * 0.3;
        // smoothed cursor follow
        let k = (dt * 8.0).min(1.0);
        self.cursor_now.0 += (self.cursor_target.0 - self.cursor_now.0) * k;
        self.cursor_now.1 += (self.cursor_target.1 - self.cursor_now.1) * k;
        Frame {
            atlas_id: "default".into(),
            frame_index: ((self.phase * 8.0) as u32) % 16,
            origin_x: 0,
            origin_y: 0,
        }
    }
}
