//! Common types shared across crates.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Stage {
    Egg,
    Hatchling,
    Baby,
    Child,
    Teen,
    Adult,
    Mega,
}

impl Stage {
    pub fn as_str(&self) -> &str {
        match self {
            Stage::Egg => "egg", Stage::Hatchling => "hatchling",
            Stage::Baby => "baby", Stage::Child => "child",
            Stage::Teen => "teen", Stage::Adult => "adult",
            Stage::Mega => "mega",
        }
    }

    pub fn all() -> &'static [Stage] {
        &[Stage::Egg, Stage::Hatchling, Stage::Baby, Stage::Child,
          Stage::Teen, Stage::Adult, Stage::Mega]
    }

    pub fn next(&self) -> Option<Stage> {
        match self {
            Stage::Egg => Some(Stage::Hatchling),
            Stage::Hatchling => Some(Stage::Baby),
            Stage::Baby => Some(Stage::Child),
            Stage::Child => Some(Stage::Teen),
            Stage::Teen => Some(Stage::Adult),
            Stage::Adult => Some(Stage::Mega),
            Stage::Mega => None,
        }
    }

    pub fn index(&self) -> usize {
        match self {
            Stage::Egg => 0, Stage::Hatchling => 1, Stage::Baby => 2,
            Stage::Child => 3, Stage::Teen => 4, Stage::Adult => 5,
            Stage::Mega => 6,
        }
    }
}

impl std::fmt::Display for Stage {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl std::str::FromStr for Stage {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "egg" => Ok(Stage::Egg), "hatchling" => Ok(Stage::Hatchling),
            "baby" => Ok(Stage::Baby), "child" => Ok(Stage::Child),
            "teen" => Ok(Stage::Teen), "adult" => Ok(Stage::Adult),
            "mega" => Ok(Stage::Mega),
            _ => Err(format!("unknown stage: {s}")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetState {
    pub stage: Stage,
    pub mood: String,
    pub energy: u32,
    pub skills_count: usize,
    pub memory_blocks: usize,
    pub uptime_secs: u64,
}

impl Default for PetState {
    fn default() -> Self {
        Self {
            stage: Stage::Egg, mood: "idle".into(), energy: 1000,
            skills_count: 0, memory_blocks: 0, uptime_secs: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMeta {
    pub id: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub tags: Vec<String>,
    pub downloads: u64,
    pub stars: u64,
}
