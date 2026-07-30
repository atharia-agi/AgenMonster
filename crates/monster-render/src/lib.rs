//! Render subsystem — manages the pixel pet canvas, background,
//! cutscene overlays, and speech bubbles.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderState {
    pub stage: String,
    pub mood: String,
    pub bob_offset: f32,
    pub is_blinking: bool,
    pub speech: Option<String>,
    pub bg_scroll: f32,
    pub cutscene_active: bool,
    pub cutscene_progress: f32,
}

impl Default for RenderState {
    fn default() -> Self {
        Self {
            stage: "egg".into(),
            mood: "idle".into(),
            bob_offset: 0.0,
            is_blinking: false,
            speech: None,
            bg_scroll: 0.0,
            cutscene_active: false,
            cutscene_progress: 0.0,
        }
    }
}

pub struct RenderSubsystem {
    state: tokio::sync::RwLock<RenderState>,
}

impl Default for RenderSubsystem {
    fn default() -> Self {
        Self::new()
    }
}

impl RenderSubsystem {
    pub fn new() -> Self {
        Self {
            state: tokio::sync::RwLock::new(RenderState::default()),
        }
    }

    pub async fn state(&self) -> RenderState {
        self.state.read().await.clone()
    }

    pub async fn update_stage(&self, stage: &str) {
        let mut s = self.state.write().await;
        s.stage = stage.into();
    }

    pub async fn update_mood(&self, mood: &str) {
        let mut s = self.state.write().await;
        s.mood = mood.into();
    }

    pub async fn set_speech(&self, text: &str) {
        let mut s = self.state.write().await;
        s.speech = Some(text.into());
    }

    pub async fn clear_speech(&self) {
        self.state.write().await.speech = None;
    }

    pub async fn start_cutscene(&self) {
        let mut s = self.state.write().await;
        s.cutscene_active = true;
        s.cutscene_progress = 0.0;
    }

    pub async fn end_cutscene(&self) {
        let mut s = self.state.write().await;
        s.cutscene_active = false;
        s.cutscene_progress = 1.0;
    }

    pub async fn update_bob(&self, offset: f32) {
        self.state.write().await.bob_offset = offset;
    }

    pub async fn update_blink(&self, blinking: bool) {
        self.state.write().await.is_blinking = blinking;
    }

    pub async fn update_bg_scroll(&self, scroll: f32) {
        self.state.write().await.bg_scroll = scroll;
    }
}
