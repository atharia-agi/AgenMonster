//! Tools crate — web, OS, browser, code, voice, MCP tools.

pub mod registry;
pub mod web;
pub mod os;
pub mod computer;
pub mod code;
pub mod voice;
pub mod mcp;
pub mod browser;
pub mod fs_tools;
pub mod audio_input;
pub mod audio_output;
pub mod multimedia;
pub mod memory_tools;
pub mod skill_tools;
pub mod cron;
pub mod datetime;
pub mod http_request;
pub mod json_query;
pub mod hash_generate;
pub mod random_string;
pub mod env_tools;
pub mod file_watch;
pub mod network_info;
pub mod process_kill;
pub mod clipboard;
pub mod memory;
pub mod sys_info;
pub mod git_info;
pub mod base64_tools;
pub mod string_utils;
pub mod docs_fetch;
pub mod code_graph;

pub use registry::{ToolRegistry, ToolInput, ToolOutput, init_memory_handle, get_memory_handle};

pub fn bootstrap_all() -> ToolRegistry {
    ToolRegistry::bootstrap_global()
}
