//! Agent crate — core task executor + planner + context.

pub mod loop_main;
pub mod loop_extra;
pub mod plan;

pub use loop_main::{AgentLoop, AgentContext, ToolCall, AgentStepResult};
pub use plan::{Plan, PlanStep};
