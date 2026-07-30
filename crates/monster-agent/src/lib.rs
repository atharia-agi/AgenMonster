//! Agent crate — core task executor + planner + context.

pub mod loop_extra;
pub mod loop_main;
pub mod plan;

pub use loop_main::{AgentContext, AgentLoop, AgentStepResult, ToolCall};
pub use plan::{Plan, PlanStep};
