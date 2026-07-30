//! Idle engine — drives bob/blink/attention for runtime pet.

pub struct IdleEngine {
    pub bob_offset: f32,
    pub is_blinking: bool,
    pub attention_phrase: Option<String>,
    pub mood: String,
    stage: String,
    blink_accum_ms: u32,
    attention_accum_ms: u32,
}

impl IdleEngine {
    pub fn new(stage: &str) -> Self {
        use crate::personality::personality_for_stage;
        let p = personality_for_stage(stage);
        Self {
            bob_offset: 0.0,
            is_blinking: false,
            attention_phrase: None,
            mood: p.preferred_mood.to_string(),
            stage: stage.to_string(),
            blink_accum_ms: 0,
            attention_accum_ms: 0,
        }
    }

    pub fn tick(&mut self, delta_ms: u32, rng: &mut impl rand::Rng) {
        use crate::personality::personality_for_stage;
        let p = personality_for_stage(&self.stage);

        let t = (self.blink_accum_ms + self.attention_accum_ms) as f32 / 1000.0;
        self.bob_offset = (t / (p.bob_speed_ms as f32 / 1000.0)).sin() * p.bob_amplitude;

        self.blink_accum_ms += delta_ms;
        if !self.is_blinking
            && self.blink_accum_ms
                > p.blink_min_ms
                    + rng.gen_range(0..p.blink_max_ms.saturating_sub(p.blink_min_ms).max(1))
        {
            self.is_blinking = true;
            self.blink_accum_ms = 0;
        }
        if self.is_blinking && self.blink_accum_ms > 150 {
            self.is_blinking = false;
            self.blink_accum_ms = 0;
        }

        self.attention_accum_ms += delta_ms;
        self.attention_phrase = None;
        if self.attention_accum_ms > 5000 {
            self.attention_accum_ms = 0;
            if rng.gen::<f32>() < p.attention_grab_chance {
                let idx = rng.gen_range(0..p.attention_phrases.len().max(1));
                self.attention_phrase = Some(p.attention_phrases[idx].to_string());
            }
        }
    }

    pub fn update_stage(&mut self, stage: &str) {
        use crate::personality::personality_for_stage;
        self.stage = stage.to_string();
        self.mood = personality_for_stage(stage).preferred_mood.to_string();
        self.blink_accum_ms = 0;
        self.attention_accum_ms = 0;
    }

    pub fn default_speech(&self) -> String {
        use crate::personality::personality_for_stage;
        let p = personality_for_stage(&self.stage);
        p.default_speech[0].clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idle_engine_tick() {
        let mut engine = IdleEngine::new("egg");
        let mut rng = rand::thread_rng();
        engine.tick(16, &mut rng);
        assert!(!engine.is_blinking);
    }

    #[test]
    fn test_update_stage() {
        let mut engine = IdleEngine::new("egg");
        engine.update_stage("teen");
        assert_eq!(engine.stage, "teen");
        assert_eq!(engine.mood, "proud");
    }

    #[test]
    fn test_default_speech() {
        let engine = IdleEngine::new("egg");
        assert!(!engine.default_speech().is_empty());
    }
}
