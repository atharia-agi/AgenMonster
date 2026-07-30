#![allow(clippy::new_without_default)]
//! Tools crate — web, OS, browser, code, voice, MCP tools.

pub mod audio_input;
pub mod audio_output;
pub mod base64_tools;
pub mod browser;
pub mod clipboard;
pub mod code;
pub mod code_graph;
pub mod computer;
pub mod cron;
pub mod datetime;
pub mod docs_fetch;
pub mod env_tools;
pub mod file_watch;
pub mod fs_tools;
pub mod git_info;
pub mod hash_generate;
pub mod http_request;
pub mod json_query;
pub mod mcp;
pub mod memory;
pub mod memory_tools;
pub mod multimedia;
pub mod network_info;
pub mod os;
pub mod process_kill;
pub mod random_string;
pub mod registry;
pub mod skill_tools;
pub mod string_utils;
pub mod sys_info;
pub mod voice;
pub mod web;

pub use registry::{get_memory_handle, init_memory_handle, ToolInput, ToolOutput, ToolRegistry};

pub fn bootstrap_all() -> ToolRegistry {
    ToolRegistry::bootstrap_global()
}
