//! Per-stage personality profiles. Loaded from JSON at runtime.
//! Defines behavioral traits, preferred mood, default speech,
//! and idle animation parameters for each evolution stage.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StagePersonality {
    pub name: String,
    pub traits: Vec<String>,
    pub preferred_mood: String,
    pub default_speech: Vec<String>,
    pub bob_amplitude: f32,
    pub bob_speed_ms: u32,
    pub blink_min_ms: u32,
    pub blink_max_ms: u32,
    pub attention_grab_chance: f32,
    pub attention_phrases: Vec<String>,
}

impl Default for StagePersonality {
    fn default() -> Self {
        Self {
            name: "egg".into(),
            traits: vec!["curious".into(), "quiet".into()],
            preferred_mood: "idle".into(),
            default_speech: vec!["...".into()],
            bob_amplitude: 2.0,
            bob_speed_ms: 500,
            blink_min_ms: 3000,
            blink_max_ms: 7000,
            attention_grab_chance: 0.01,
            attention_phrases: vec!["...".into()],
        }
    }
}

pub fn personality_for_stage(stage: &str) -> StagePersonality {
    match stage {
        "egg" => StagePersonality {
            name: "egg".into(),
            traits: vec!["curious".into(), "sleepy".into(), "fragile".into()],
            preferred_mood: "sleepy".into(),
            default_speech: vec!["...".into(), "*wobble*".into(), "...mm?".into()],
            bob_amplitude: 1.5,
            bob_speed_ms: 800,
            blink_min_ms: 4000,
            blink_max_ms: 8000,
            attention_grab_chance: 0.005,
            attention_phrases: vec!["...".into(), "*crack*".into()],
        },
        "hatchling" => StagePersonality {
            name: "hatchling".into(),
            traits: vec!["playful".into(), "clumsy".into(), "eager".into()],
            preferred_mood: "happy".into(),
            default_speech: vec!["!".into(), "bark!".into(), "play?".into()],
            bob_amplitude: 3.0,
            bob_speed_ms: 400,
            blink_min_ms: 2000,
            blink_max_ms: 5000,
            attention_grab_chance: 0.03,
            attention_phrases: vec!["bark!".into(), "play!".into(), "?".into()],
        },
        "baby" => StagePersonality {
            name: "baby".into(),
            traits: vec!["gentle".into(), "curious".into(), "social".into()],
            preferred_mood: "idle".into(),
            default_speech: vec!["~".into(), "hmm".into(), "nice".into()],
            bob_amplitude: 2.5,
            bob_speed_ms: 600,
            blink_min_ms: 2500,
            blink_max_ms: 6000,
            attention_grab_chance: 0.02,
            attention_phrases: vec!["hmm?".into(), "oh!".into(), "~".into()],
        },
        "child" => StagePersonality {
            name: "child".into(),
            traits: vec!["focused".into(), "methodical".into(), "proud".into()],
            preferred_mood: "idle".into(),
            default_speech: vec!["ready.".into(), "let's go.".into(), "hmm...".into()],
            bob_amplitude: 2.0,
            bob_speed_ms: 550,
            blink_min_ms: 3000,
            blink_max_ms: 6000,
            attention_grab_chance: 0.025,
            attention_phrases: vec!["task?".into(), "ready!".into(), "...?".into()],
        },
        "teen" => StagePersonality {
            name: "teen".into(),
            traits: vec!["confident".into(), "cheeky".into(), "powerful".into()],
            preferred_mood: "proud".into(),
            default_speech: vec!["obviously.".into(), "easy.".into(), "watch this.".into()],
            bob_amplitude: 2.5,
            bob_speed_ms: 450,
            blink_min_ms: 3000,
            blink_max_ms: 7000,
            attention_grab_chance: 0.04,
            attention_phrases: vec!["obviously.".into(), "let me.".into(), "huh?".into()],
        },
        "adult" => StagePersonality {
            name: "adult".into(),
            traits: vec![
                "wise".into(),
                "calm".into(),
                "powerful".into(),
                "mysterious".into(),
            ],
            preferred_mood: "idle".into(),
            default_speech: vec![".".into(), "I see.".into(), "hmm.".into()],
            bob_amplitude: 1.5,
            bob_speed_ms: 700,
            blink_min_ms: 4000,
            blink_max_ms: 9000,
            attention_grab_chance: 0.02,
            attention_phrases: vec!["...".into(), "fascinating.".into(), "indeed.".into()],
        },
        "mega" => StagePersonality {
            name: "mega".into(),
            traits: vec!["transcendent".into(), "omniscient".into(), "serene".into()],
            preferred_mood: "proud".into(),
            default_speech: vec!["⚡".into(), "omniscience achieved.".into(), "∞".into()],
            bob_amplitude: 1.0,
            bob_speed_ms: 900,
            blink_min_ms: 5000,
            blink_max_ms: 12000,
            attention_grab_chance: 0.015,
            attention_phrases: vec!["⚡".into(), "all paths.".into(), "∞".into()],
        },
        _ => StagePersonality::default(),
    }
}
