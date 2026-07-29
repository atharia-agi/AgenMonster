//! Stage = the scenegraph that draws the pet, speech bubble, particles,
//! evolution FX, etc. Each frame pulls the latest Animator + Camera state.

use crate::Frame;

pub struct Stage {
    pub show_pet: bool,
    pub speech: Option<Speech>,
    pub particles: Vec<Particle>,
}

pub struct Speech {
    pub text: String,
    pub at_ms: u64,
    pub expires_ms: u64,
}

pub struct Particle {
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub life_s: f32,
}

impl Default for Stage {
    fn default() -> Self {
        Self {
            show_pet: true,
            speech: None,
            particles: vec![],
        }
    }
}

impl Stage {
    pub fn compose(&self, _frame: &Frame) -> SceneSnapshot {
        SceneSnapshot::default()
    }
}

#[derive(Default)]
pub struct SceneSnapshot {}
