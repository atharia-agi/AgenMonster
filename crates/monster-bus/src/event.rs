//! Bus event types — all payloads that flow through the system.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BusEvent {
    PetInteraction {
        text: String,
        mood: String,
    },
    UserTask {
        text: String,
    },
    AgentThink {
        thought: String,
    },
    ToolCall {
        name: String,
        args: serde_json::Value,
        result: Option<String>,
    },
    Skill {
        id: String,
        action: SkillAction,
    },
    Memory {
        action: MemoryAction,
        block_id: Option<String>,
    },
    Render {
        frame: RenderFrame,
    },
    TelemetryTick,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SkillAction {
    Loaded,
    Executed,
    Evolved,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MemoryAction {
    Ingest,
    Recall,
    Decay,
    Archive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderFrame {
    pub stage: String,
    pub mood: String,
    pub bob_offset: f32,
    pub is_blinking: bool,
}
