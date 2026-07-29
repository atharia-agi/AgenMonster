//! Bus topics — all channels the system uses.

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Topic {
    PetInteraction,
    UserTask,
    AgentThink,
    ToolCall,
    Skill,
    Memory,
    Render,
    Telemetry,
    Custom,
}

impl Topic {
    pub fn all() -> &'static [Topic] {
        &[
            Topic::PetInteraction, Topic::UserTask, Topic::AgentThink,
            Topic::ToolCall, Topic::Skill, Topic::Memory, Topic::Render,
            Topic::Telemetry, Topic::Custom,
        ]
    }

    pub fn as_str(&self) -> &str {
        match self {
            Topic::PetInteraction => "pet_interaction",
            Topic::UserTask => "user_task",
            Topic::AgentThink => "agent_think",
            Topic::ToolCall => "tool_call",
            Topic::Skill => "skill",
            Topic::Memory => "memory",
            Topic::Render => "render",
            Topic::Telemetry => "telemetry",
            Topic::Custom => "custom",
        }
    }
}
