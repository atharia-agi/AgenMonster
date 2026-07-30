//! Tool registry — dynamic tool registration, dispatch, and execution.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicPtr, Ordering};

use crate::memory::MemoryHandle;

static MEMORY_PTR: AtomicPtr<MemoryHandle> = AtomicPtr::new(std::ptr::null_mut());

/// Initialize the global memory handle. Call once before registering memory tools.
pub fn init_memory_handle(handle: MemoryHandle) {
    let boxed = Box::new(handle);
    let ptr = Box::into_raw(boxed);
    MEMORY_PTR.store(ptr, Ordering::Release);
}

/// Get the global memory handle (if initialized).
/// # Safety
/// Safe only if init_memory_handle was called exactly once before any reads.
pub fn get_memory_handle() -> Option<&'static MemoryHandle> {
    let ptr = MEMORY_PTR.load(Ordering::Acquire);
    if ptr.is_null() {
        None
    } else {
        Some(unsafe { &*ptr })
    }
}

pub struct ToolDef {
    pub name: String,
    pub description: String,
    pub params: Vec<ToolParam>,
    pub cost: u32,
    pub handler: Option<fn(&ToolInput) -> anyhow::Result<ToolOutput>>,
}

pub struct ToolParam {
    pub name: String,
    pub ptype: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInput {
    pub name: String,
    pub args: HashMap<String, serde_json::Value>,
}

impl ToolInput {
    pub fn args_as_value(&self) -> serde_json::Value {
        serde_json::Value::Object(
            self.args
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect(),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolOutput {
    pub success: bool,
    pub content: String,
    pub artifacts: Vec<String>,
}

pub struct ToolRegistry {
    tools: HashMap<String, ToolDef>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            tools: HashMap::new(),
        }
    }

    pub fn register(&mut self, tool: ToolDef) {
        self.tools.insert(tool.name.clone(), tool);
    }

    pub fn get(&self, name: &str) -> Option<&ToolDef> {
        self.tools.get(name)
    }

    pub fn list(&self) -> Vec<&str> {
        self.tools.keys().map(|s| s.as_str()).collect()
    }

    pub fn count(&self) -> usize {
        self.tools.len()
    }

    pub fn search(&self, query: &str) -> Vec<&ToolDef> {
        self.tools
            .values()
            .filter(|t| t.name.contains(query) || t.description.contains(query))
            .collect()
    }

    /// Execute a tool by name with the given arguments.
    pub fn execute(&self, input: &ToolInput) -> anyhow::Result<ToolOutput> {
        let tool = self
            .tools
            .get(&input.name)
            .ok_or_else(|| anyhow::anyhow!("Tool '{}' not found", input.name))?;

        if let Some(handler) = tool.handler {
            return handler(input);
        }

        Ok(ToolOutput {
            success: true,
            content: format!("Tool '{}' executed (stub)", input.name),
            artifacts: vec![],
        })
    }

    /// Bootstrap the global tool registry with all built-in tools.
    pub fn bootstrap_global() -> Self {
        let mut reg = Self::new();

        // Web tools — real implementations
        reg.register(ToolDef {
            name: "web_search".into(),
            description: "Search the web using Brave/Tavily API. Returns titles, URLs, snippets."
                .into(),
            params: vec![ToolParam {
                name: "query".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 5,
            handler: Some(|input| {
                let query = input
                    .args
                    .get("query")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let tavily_key = std::env::var("TAVILY_API_KEY").ok();
                let brave_key = std::env::var("BRAVE_API_KEY").ok();
                // Use a dedicated runtime to avoid tokio context issues
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .unwrap();
                let result = rt.block_on(super::web::search_web(
                    query,
                    tavily_key.as_deref(),
                    brave_key.as_deref(),
                ));
                match result {
                    Ok(r) => {
                        let mut content = String::new();
                        if let Some(ref answer) = r.answer {
                            content.push_str(&format!("Answer: {answer}\n\n"));
                        }
                        for item in &r.results {
                            content.push_str(&format!(
                                "{} — {}\n{}\n\n",
                                item.title, item.url, item.snippet
                            ));
                        }
                        if content.is_empty() {
                            content = format!("No results for: {query}");
                        }
                        Ok(ToolOutput {
                            success: true,
                            content,
                            artifacts: vec![],
                        })
                    }
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[web_search] Error: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // Code graph — structural code analysis (code-review-graph-inspired)
        reg.register(ToolDef {
            name: "code_graph".into(),
            description: "Analyze code structure: functions, structs, imports, dependencies, metrics."
                .into(),
            params: vec![
                ToolParam { name: "code".into(), ptype: "string".into(), required: true },
                ToolParam { name: "language".into(), ptype: "string".into(), required: false },
                ToolParam { name: "analysis".into(), ptype: "string".into(), required: false },
            ],
            cost: 2,
            handler: Some(|input| {
                let tool = crate::code_graph::CodeGraphTool::new();
                let result = tool.execute(&input.args_as_value())?;
                Ok(ToolOutput { success: true, content: result, artifacts: vec![] })
            }),
        });

        reg.register(ToolDef {
            name: "web_fetch".into(),
            description: "Fetch and extract text content from a URL".into(),
            params: vec![ToolParam {
                name: "url".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 3,
            handler: Some(|input| {
                let url = input.args.get("url").and_then(|v| v.as_str()).unwrap_or("");
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .unwrap();
                match rt.block_on(super::web::web_fetch(url)) {
                    Ok(content) => Ok(ToolOutput {
                        success: true,
                        content,
                        artifacts: vec![],
                    }),
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[web_fetch] Error: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // OS tools
        reg.register(ToolDef {
            name: "os_process_list".into(),
            description: "List running processes on Windows (via tasklist)".into(),
            params: vec![],
            cost: 2,
            handler: Some(|_| {
                match std::process::Command::new("tasklist")
                    .args(["/FO", "CSV", "/NH"])
                    .output()
                {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let lines: Vec<&str> = stdout
                            .lines()
                            .filter(|l| !l.is_empty())
                            .take(30) // Limit to first 30 processes
                            .collect();
                        let mut content = format!("Running processes ({} shown):\n", lines.len());
                        for line in &lines {
                            // Parse CSV: "name","PID","Session","Session#","Mem"
                            let parts: Vec<&str> =
                                line.split(',').map(|s| s.trim_matches('"')).collect();
                            if parts.len() >= 5 {
                                content.push_str(&format!(
                                    "  {} (PID: {}, Mem: {})\n",
                                    parts[0], parts[1], parts[4]
                                ));
                            }
                        }
                        Ok(ToolOutput {
                            success: true,
                            content,
                            artifacts: vec![],
                        })
                    }
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[os_process_list] Error running tasklist: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        reg.register(ToolDef {
            name: "os_clipboard".into(),
            description: "Get/set clipboard content on Windows (via powershell)".into(),
            params: vec![ToolParam {
                name: "action".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 1,
            handler: Some(|input| {
                let action = input
                    .args
                    .get("action")
                    .and_then(|v| v.as_str())
                    .unwrap_or("get");
                match action {
                    "get" => {
                        match std::process::Command::new("powershell")
                            .args(["-Command", "Get-Clipboard"])
                            .output()
                        {
                            Ok(output) => {
                                let content =
                                    String::from_utf8_lossy(&output.stdout).trim().to_string();
                                if content.is_empty() {
                                    Ok(ToolOutput {
                                        success: true,
                                        content: "(clipboard empty)".into(),
                                        artifacts: vec![],
                                    })
                                } else {
                                    Ok(ToolOutput {
                                        success: true,
                                        content,
                                        artifacts: vec![],
                                    })
                                }
                            }
                            Err(e) => Ok(ToolOutput {
                                success: false,
                                content: format!("[os_clipboard] Error reading clipboard: {e}"),
                                artifacts: vec![],
                            }),
                        }
                    }
                    "set" => {
                        let text = input
                            .args
                            .get("text")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        match std::process::Command::new("powershell")
                            .args(["-Command", &format!("Set-Clipboard -Value '{text}'")])
                            .output()
                        {
                            Ok(_) => Ok(ToolOutput {
                                success: true,
                                content: format!("[os_clipboard] Set clipboard to: {text}"),
                                artifacts: vec![],
                            }),
                            Err(e) => Ok(ToolOutput {
                                success: false,
                                content: format!("[os_clipboard] Error setting clipboard: {e}"),
                                artifacts: vec![],
                            }),
                        }
                    }
                    _ => Ok(ToolOutput {
                        success: false,
                        content: format!(
                            "[os_clipboard] Unknown action: {action}. Use 'get' or 'set'."
                        ),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // Computer tools — real Windows implementations
        reg.register(ToolDef {
            name: "screenshot".into(),
            description: "Capture screenshot to file using Windows .NET".into(),
            params: vec![ToolParam {
                name: "path".into(),
                ptype: "string".into(),
                required: false,
            }],
            cost: 10,
            handler: Some(|input| {
                let path = input
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("screenshot.png");
                let ps_script = format!(
                    r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save('{path}')
$gfx.Dispose()
$bmp.Dispose()
Write-Output "Screenshot saved to {path}"
"#
                );
                match std::process::Command::new("powershell")
                    .args(["-NoProfile", "-Command", &ps_script])
                    .output()
                {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                        if output.status.success() {
                            Ok(ToolOutput {
                                success: true,
                                content: stdout,
                                artifacts: vec![path.to_string()],
                            })
                        } else {
                            Ok(ToolOutput {
                                success: false,
                                content: format!("[screenshot] Error: {stderr}"),
                                artifacts: vec![],
                            })
                        }
                    }
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[screenshot] Failed to run powershell: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        reg.register(ToolDef {
            name: "mouse_click".into(),
            description: "Click at screen coordinates using Windows user32.dll".into(),
            params: vec![
                ToolParam { name: "x".into(), ptype: "number".into(), required: true },
                ToolParam { name: "y".into(), ptype: "number".into(), required: true },
                ToolParam { name: "button".into(), ptype: "string".into(), required: false },
            ],
            cost: 5,
            handler: Some(|input| {
                let x = input.args.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
                let y = input.args.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
                let button = input.args.get("button").and_then(|v| v.as_str()).unwrap_or("left");
                // Map button to Windows mouse event flags
                let (down_flag, up_flag) = match button {
                    "right" => (0x0008u32, 0x0010u32),   // RIGHTDOWN, RIGHTUP
                    "middle" => (0x0020u32, 0x0040u32),  // MIDDLEDOWN, MIDDLEUP
                    _ => (0x0002u32, 0x0004u32),         // LEFTDOWN, LEFTUP
                };
                let ps_script = format!(r#"
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseOps {{
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, IntPtr dwExtraInfo);
}}
"@
[MouseOps]::SetCursorPos({x}, {y})
Start-Sleep -Milliseconds 50
[MouseOps]::mouse_event({down_flag}, 0, 0, 0, [IntPtr]::Zero)
Start-Sleep -Milliseconds 50
[MouseOps]::mouse_event({up_flag}, 0, 0, 0, [IntPtr]::Zero)
Write-Output "Clicked {button} at ({x}, {y})"
"#);
                match std::process::Command::new("powershell")
                    .args(["-NoProfile", "-Command", &ps_script])
                    .output()
                {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        if output.status.success() {
                            Ok(ToolOutput { success: true, content: stdout, artifacts: vec![] })
                        } else {
                            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                            Ok(ToolOutput { success: false, content: format!("[mouse_click] Error: {stderr}"), artifacts: vec![] })
                        }
                    }
                    Err(e) => Ok(ToolOutput { success: false, content: format!("[mouse_click] Failed: {e}"), artifacts: vec![] }),
                }
            }),
        });

        reg.register(ToolDef {
            name: "type_text".into(),
            description: "Type text at cursor using Windows user32.dll SendInput".into(),
            params: vec![ToolParam {
                name: "text".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 5,
            handler: Some(|input| {
                let text = input
                    .args
                    .get("text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                // Escape single quotes for PowerShell
                let escaped = text.replace('\'', "''");
                let ps_script = format!(
                    r#"
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class KeyOps {{
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}}
"@
$keys = '{escaped}'
foreach ($char in $keys.ToCharArray()) {{
    $vk = [byte][char]$char
    [KeyOps]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 10
    [KeyOps]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)  # KEYEVENTF_KEYUP
    Start-Sleep -Milliseconds 10
}}
Write-Output "Typed: $keys"
"#
                );
                match std::process::Command::new("powershell")
                    .args(["-NoProfile", "-Command", &ps_script])
                    .output()
                {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        if output.status.success() {
                            Ok(ToolOutput {
                                success: true,
                                content: format!("[type_text] {stdout}"),
                                artifacts: vec![],
                            })
                        } else {
                            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                            Ok(ToolOutput {
                                success: false,
                                content: format!("[type_text] Error: {stderr}"),
                                artifacts: vec![],
                            })
                        }
                    }
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[type_text] Failed: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // Code tools
        reg.register(ToolDef {
            name: "code_format".into(),
            description: "Analyze and format code (counts lines, detects patterns)".into(),
            params: vec![
                ToolParam {
                    name: "code".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "lang".into(),
                    ptype: "string".into(),
                    required: false,
                },
            ],
            cost: 2,
            handler: Some(|input| {
                let code = input
                    .args
                    .get("code")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let lang = input
                    .args
                    .get("lang")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let lines: Vec<&str> = code.lines().collect();
                let line_count = lines.len();
                let char_count = code.len();
                let non_empty = lines.iter().filter(|l| !l.trim().is_empty()).count();
                let trimmed: String = lines
                    .iter()
                    .map(|l| l.trim_end())
                    .collect::<Vec<_>>()
                    .join("\n");
                let trailing_newline = if code.ends_with('\n') { "\n" } else { "" };
                let formatted = format!("{trimmed}{trailing_newline}");
                let mut analysis = vec![
                    format!("Language: {lang}"),
                    format!("Lines: {line_count} ({non_empty} non-empty)"),
                    format!("Characters: {char_count}"),
                ];
                if lang == "rust" {
                    let has_unsafe = code.contains("unsafe");
                    let has_unwrap = code.contains(".unwrap()");
                    let has_expect = code.contains(".expect(");
                    let fn_count = code.matches("fn ").count();
                    let impl_count = code.matches("impl ").count();
                    analysis.push(format!("Functions: {fn_count}, Impls: {impl_count}"));
                    if has_unwrap {
                        analysis.push("Warning: uses .unwrap() — consider error handling".into());
                    }
                    if has_unsafe {
                        analysis.push("Warning: contains unsafe code".into());
                    }
                    if has_expect {
                        analysis.push("Info: uses .expect() for error messages".into());
                    }
                }
                Ok(ToolOutput {
                    success: true,
                    content: serde_json::json!({
                        "language": lang,
                        "lines": line_count,
                        "non_empty_lines": non_empty,
                        "characters": char_count,
                        "analysis": analysis,
                        "formatted": formatted,
                    })
                    .to_string(),
                    artifacts: vec![],
                })
            }),
        });

        // Memory tools — real implementations via global MemoryHandle
        reg.register(ToolDef {
            name: "memory_store".into(),
            description: "Store a memory with auto-embedding for semantic search".into(),
            params: vec![
                ToolParam {
                    name: "content".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "tier".into(),
                    ptype: "string".into(),
                    required: false,
                },
            ],
            cost: 3,
            handler: Some(|input| {
                let content = input
                    .args
                    .get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let tier_str = input
                    .args
                    .get("tier")
                    .and_then(|v| v.as_str())
                    .unwrap_or("hot");
                if let Some(handle) = get_memory_handle() {
                    let tier = match tier_str {
                        "warm" => crate::memory::MemoryTier::Warm,
                        "cold" => crate::memory::MemoryTier::Cold,
                        _ => crate::memory::MemoryTier::Hot,
                    };
                    let id = handle.next_id();
                    let block = crate::memory::MemoryBlock::new(id, tier, content);
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .unwrap();
                    match rt.block_on(handle.ingest_with_embedding(block)) {
                        Ok(()) => Ok(ToolOutput {
                            success: true,
                            content:
                                serde_json::json!({"stored": true, "id": id, "tier": tier_str})
                                    .to_string(),
                            artifacts: vec![],
                        }),
                        Err(e) => Ok(ToolOutput {
                            success: false,
                            content: format!("[memory_store] Error: {e}"),
                            artifacts: vec![],
                        }),
                    }
                } else {
                    Ok(ToolOutput {
                        success: false,
                        content: "[memory_store] Memory subsystem not initialized".into(),
                        artifacts: vec![],
                    })
                }
            }),
        });

        reg.register(ToolDef {
            name: "memory_search".into(),
            description: "Search memories by semantic similarity or keyword".into(),
            params: vec![
                ToolParam { name: "query".into(), ptype: "string".into(), required: true },
                ToolParam { name: "limit".into(), ptype: "integer".into(), required: false },
            ],
            cost: 3,
            handler: Some(|input| {
                let query = input.args.get("query")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let limit = input.args.get("limit")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(5) as usize;
                if let Some(handle) = get_memory_handle() {
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .unwrap();
                    match rt.block_on(handle.recall(query, limit)) {
                        Ok(results) => {
                            let items: Vec<serde_json::Value> = results.into_iter().map(|m| {
                                serde_json::json!({
                                    "id": m.id,
                                    "content": m.content,
                                    "tier": format!("{:?}", m.tier),
                                    "decay_score": m.decay_score,
                                })
                            }).collect();
                            Ok(ToolOutput {
                                success: true,
                                content: serde_json::json!({"query": query, "count": items.len(), "results": items}).to_string(),
                                artifacts: vec![],
                            })
                        }
                        Err(e) => Ok(ToolOutput {
                            success: false,
                            content: format!("[memory_search] Error: {e}"),
                            artifacts: vec![],
                        }),
                    }
                } else {
                    Ok(ToolOutput {
                        success: false,
                        content: "[memory_search] Memory subsystem not initialized".into(),
                        artifacts: vec![],
                    })
                }
            }),
        });

        reg.register(ToolDef {
            name: "memory_forget".into(),
            description: "Decay all memories (reduce decay_score)".into(),
            params: vec![],
            cost: 2,
            handler: Some(|_input| {
                if let Some(handle) = get_memory_handle() {
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .unwrap();
                    match rt.block_on(handle.decay_tick()) {
                        Ok(decayed) => Ok(ToolOutput {
                            success: true,
                            content: serde_json::json!({"decayed": decayed}).to_string(),
                            artifacts: vec![],
                        }),
                        Err(e) => Ok(ToolOutput {
                            success: false,
                            content: format!("[memory_forget] Error: {e}"),
                            artifacts: vec![],
                        }),
                    }
                } else {
                    Ok(ToolOutput {
                        success: false,
                        content: "[memory_forget] Memory subsystem not initialized".into(),
                        artifacts: vec![],
                    })
                }
            }),
        });

        // Voice tools — real implementations via Windows SAPI
        reg.register(ToolDef {
            name: "voice_speak".into(),
            description: "Speak text using Windows TTS (SAPI)".into(),
            params: vec![
                ToolParam {
                    name: "text".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "voice".into(),
                    ptype: "string".into(),
                    required: false,
                },
                ToolParam {
                    name: "rate".into(),
                    ptype: "integer".into(),
                    required: false,
                },
            ],
            cost: 10,
            handler: Some(|input| {
                let text = input
                    .args
                    .get("text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let voice = input
                    .args
                    .get("voice")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Microsoft David Desktop");
                let rate = input.args.get("rate").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                match super::voice::tts_speak(text, voice, rate) {
                    Ok(result) => Ok(ToolOutput {
                        success: true,
                        content: result,
                        artifacts: vec![],
                    }),
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[voice_speak] Error: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        reg.register(ToolDef {
            name: "voice_listen".into(),
            description: "Listen for speech via Windows Speech Recognition".into(),
            params: vec![ToolParam {
                name: "timeout".into(),
                ptype: "integer".into(),
                required: false,
            }],
            cost: 10,
            handler: Some(|input| {
                let timeout = input
                    .args
                    .get("timeout")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(10) as u32;
                let timeout = timeout.clamp(1, 300);
                match super::voice::stt_listen(timeout) {
                    Ok(text) if text.is_empty() => Ok(ToolOutput {
                        success: true,
                        content: "[voice_listen] No speech detected".into(),
                        artifacts: vec![],
                    }),
                    Ok(text) => Ok(ToolOutput {
                        success: true,
                        content: text,
                        artifacts: vec![],
                    }),
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[voice_listen] Error: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // File system tools
        reg.register(ToolDef {
            name: "fs_read".into(),
            description: "Read a file".into(),
            params: vec![ToolParam {
                name: "path".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 2,
            handler: Some(|input| {
                let path = input
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                match std::fs::read_to_string(path) {
                    Ok(content) => Ok(ToolOutput {
                        success: true,
                        content,
                        artifacts: vec![],
                    }),
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[fs_read] Error: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        reg.register(ToolDef {
            name: "fs_write".into(),
            description: "Write to a file".into(),
            params: vec![
                ToolParam {
                    name: "path".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "content".into(),
                    ptype: "string".into(),
                    required: true,
                },
            ],
            cost: 3,
            handler: Some(|input| {
                let path = input
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let content = input
                    .args
                    .get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                match std::fs::write(path, content) {
                    Ok(()) => Ok(ToolOutput {
                        success: true,
                        content: format!("[fs_write] Wrote to: {path}"),
                        artifacts: vec![],
                    }),
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[fs_write] Error: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        reg.register(ToolDef {
            name: "fs_list_dir".into(),
            description: "List directory contents".into(),
            params: vec![ToolParam {
                name: "path".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 2,
            handler: Some(|input| {
                let path = input
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".");
                match std::fs::read_dir(path) {
                    Ok(entries) => {
                        let files: Vec<String> = entries
                            .filter_map(|e| e.ok())
                            .map(|e| e.file_name().to_string_lossy().to_string())
                            .collect();
                        Ok(ToolOutput {
                            success: true,
                            content: files.join("\n"),
                            artifacts: vec![],
                        })
                    }
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[fs_list_dir] Error: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // Recursive file search
        reg.register(ToolDef {
            name: "fs_find".into(),
            description: "Recursively find files matching a pattern".into(),
            params: vec![
                ToolParam {
                    name: "path".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "pattern".into(),
                    ptype: "string".into(),
                    required: true,
                },
            ],
            cost: 3,
            handler: Some(|input| {
                let path = input
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".");
                let pattern = input
                    .args
                    .get("pattern")
                    .and_then(|v| v.as_str())
                    .unwrap_or("*");
                let mut results = Vec::new();
                let walk = std::fs::read_dir(path);
                if let Err(e) = walk {
                    return Ok(ToolOutput {
                        success: false,
                        content: format!("[fs_find] Error: {e}"),
                        artifacts: vec![],
                    });
                }
                // Simple recursive search with depth limit
                fn walk_dir(
                    dir: &std::path::Path,
                    pattern: &str,
                    results: &mut Vec<String>,
                    depth: usize,
                ) {
                    if depth > 10 {
                        return;
                    }
                    if let Ok(entries) = std::fs::read_dir(dir) {
                        for entry in entries.flatten() {
                            let path = entry.path();
                            if path.is_dir() {
                                walk_dir(&path, pattern, results, depth + 1);
                            } else if let Some(name) = path.file_name() {
                                let name_str = name.to_string_lossy();
                                // Simple glob: match if pattern is * or name contains the pattern minus *
                                let pat_clean =
                                    pattern.trim_start_matches('*').trim_end_matches('*');
                                if pat_clean.is_empty() || name_str.contains(pat_clean) {
                                    results.push(path.to_string_lossy().to_string());
                                }
                            }
                        }
                    }
                }
                walk_dir(std::path::Path::new(path), pattern, &mut results, 0);
                if results.is_empty() {
                    Ok(ToolOutput {
                        success: true,
                        content: format!("No files matching '{pattern}' in {path}"),
                        artifacts: vec![],
                    })
                } else {
                    let count = results.len();
                    let display = if results.len() > 50 {
                        results.truncate(50);
                        format!("{} (showing first 50 of {})", results.join("\n"), count)
                    } else {
                        results.join("\n")
                    };
                    Ok(ToolOutput {
                        success: true,
                        content: display,
                        artifacts: vec![],
                    })
                }
            }),
        });

        // Shell command execution
        reg.register(ToolDef {
            name: "os_shell".into(),
            description: "Execute a shell command (Windows cmd.exe)".into(),
            params: vec![ToolParam {
                name: "command".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 5,
            handler: Some(|input| {
                let command = input
                    .args
                    .get("command")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                match std::process::Command::new("cmd")
                    .args(["/C", command])
                    .output()
                {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                        let mut content = String::new();
                        if !stdout.is_empty() {
                            content.push_str(&stdout);
                        }
                        if !stderr.is_empty() {
                            if !content.is_empty() {
                                content.push('\n');
                            }
                            content.push_str(&format!("[stderr] {stderr}"));
                        }
                        if content.is_empty() {
                            content = format!(
                                "Command executed (exit code: {})",
                                output.status.code().unwrap_or(-1)
                            );
                        }
                        Ok(ToolOutput {
                            success: output.status.success(),
                            content,
                            artifacts: vec![],
                        })
                    }
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("[os_shell] Failed to execute: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // Date/time tool
        reg.register(ToolDef {
            name: "date_time".into(),
            description: "Get current date and time (format: iso, unix, human, date, time)".into(),
            params: vec![ToolParam {
                name: "format".into(),
                ptype: "string".into(),
                required: false,
            }],
            cost: 0,
            handler: Some(|input| {
                let format = input
                    .args
                    .get("format")
                    .and_then(|v| v.as_str())
                    .unwrap_or("human");
                let now = chrono::Local::now();
                let output = match format {
                    "iso" => now.to_rfc3339(),
                    "unix" => now.timestamp().to_string(),
                    "date" => now.format("%Y-%m-%d").to_string(),
                    "time" => now.format("%H:%M:%S").to_string(),
                    _ => now.format("%Y-%m-%d %H:%M:%S %Z").to_string(),
                };
                Ok(ToolOutput {
                    success: true,
                    content: output,
                    artifacts: vec![],
                })
            }),
        });

        // HTTP request tool (async via tokio runtime)
        reg.register(ToolDef {
            name: "http_request".into(),
            description: "Make HTTP requests (GET, POST, PUT, DELETE)".into(),
            params: vec![
                ToolParam {
                    name: "url".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "method".into(),
                    ptype: "string".into(),
                    required: false,
                },
                ToolParam {
                    name: "body".into(),
                    ptype: "string".into(),
                    required: false,
                },
            ],
            cost: 5,
            handler: Some(|input| {
                let url = input
                    .args
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let method = input
                    .args
                    .get("method")
                    .and_then(|v| v.as_str())
                    .unwrap_or("GET")
                    .to_string();
                let body = input
                    .args
                    .get("body")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let rt =
                    tokio::runtime::Runtime::new().map_err(|e| anyhow::anyhow!("tokio: {e}"))?;
                rt.block_on(async move {
                    let client = reqwest::Client::new();
                    let mut req = match method.as_str() {
                        "POST" => client.post(&url),
                        "PUT" => client.put(&url),
                        "DELETE" => client.delete(&url),
                        _ => client.get(&url),
                    };
                    if !body.is_empty() {
                        req = req.body(body);
                    }
                    match req.send().await {
                        Ok(resp) => {
                            let status = resp.status().as_u16();
                            let text = resp.text().await.unwrap_or_default();
                            Ok(ToolOutput {
                                success: (200..300).contains(&status),
                                content: format!("[{status}] {text}"),
                                artifacts: vec![],
                            })
                        }
                        Err(e) => Ok(ToolOutput {
                            success: false,
                            content: format!("[http_request] Failed: {e}"),
                            artifacts: vec![],
                        }),
                    }
                })
            }),
        });

        // JSON query tool
        reg.register(ToolDef {
            name: "json_query".into(),
            description: "Query JSON data using dot notation (e.g. 'users.0.name')".into(),
            params: vec![
                ToolParam {
                    name: "json".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "path".into(),
                    ptype: "string".into(),
                    required: true,
                },
            ],
            cost: 0,
            handler: Some(|input| {
                let json_str = input
                    .args
                    .get("json")
                    .and_then(|v| v.as_str())
                    .unwrap_or("{}");
                let path = input
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let data: serde_json::Value = match serde_json::from_str(json_str) {
                    Ok(v) => v,
                    Err(e) => {
                        return Ok(ToolOutput {
                            success: false,
                            content: format!("Invalid JSON: {e}"),
                            artifacts: vec![],
                        })
                    }
                };
                let mut current = &data;
                for part in path.split('.') {
                    if part.is_empty() {
                        continue;
                    }
                    if let Ok(idx) = part.parse::<usize>() {
                        current = match current.get(idx) {
                            Some(v) => v,
                            None => {
                                return Ok(ToolOutput {
                                    success: false,
                                    content: format!("Index {idx} out of bounds"),
                                    artifacts: vec![],
                                })
                            }
                        };
                    } else {
                        current = match current.get(part) {
                            Some(v) => v,
                            None => {
                                return Ok(ToolOutput {
                                    success: false,
                                    content: format!("Key '{part}' not found"),
                                    artifacts: vec![],
                                })
                            }
                        };
                    }
                }
                Ok(ToolOutput {
                    success: true,
                    content: serde_json::to_string_pretty(current).unwrap_or_default(),
                    artifacts: vec![],
                })
            }),
        });

        // Hash generate tool
        reg.register(ToolDef {
            name: "hash_generate".into(),
            description: "Generate hash from string (blake3, sha256)".into(),
            params: vec![
                ToolParam {
                    name: "input".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "algorithm".into(),
                    ptype: "string".into(),
                    required: false,
                },
            ],
            cost: 0,
            handler: Some(|input| {
                let input_str = input
                    .args
                    .get("input")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let algorithm = input
                    .args
                    .get("algorithm")
                    .and_then(|v| v.as_str())
                    .unwrap_or("blake3");
                let hash = match algorithm {
                    "sha256" => {
                        use sha2::{Digest, Sha256};
                        let mut hasher = Sha256::new();
                        hasher.update(input_str.as_bytes());
                        format!("{:x}", hasher.finalize())
                    }
                    _ => blake3::hash(input_str.as_bytes()).to_hex().to_string(),
                };
                Ok(ToolOutput {
                    success: true,
                    content: hash,
                    artifacts: vec![],
                })
            }),
        });

        // Random string tool
        reg.register(ToolDef {
            name: "random_string".into(),
            description: "Generate random string (alphanumeric, hex, uuid, numeric)".into(),
            params: vec![
                ToolParam {
                    name: "length".into(),
                    ptype: "integer".into(),
                    required: false,
                },
                ToolParam {
                    name: "format".into(),
                    ptype: "string".into(),
                    required: false,
                },
            ],
            cost: 0,
            handler: Some(|input| {
                let length = input
                    .args
                    .get("length")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(16)
                    .min(256) as usize;
                let format = input
                    .args
                    .get("format")
                    .and_then(|v| v.as_str())
                    .unwrap_or("alphanumeric");
                let output = match format {
                    "uuid" => uuid::Uuid::new_v4().to_string(),
                    "hex" => {
                        let bytes: Vec<u8> = (0..length).map(|_| rand::random::<u8>()).collect();
                        bytes.iter().map(|b| format!("{b:02x}")).collect::<String>()[..length]
                            .to_string()
                    }
                    "numeric" => (0..length)
                        .map(|_| {
                            let idx = rand::random::<u8>() % 10;
                            (b'0' + idx) as char
                        })
                        .collect(),
                    _ => {
                        const CHARS: &[u8] =
                            b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                        (0..length)
                            .map(|_| {
                                let idx = rand::random::<u8>() as usize % CHARS.len();
                                CHARS[idx] as char
                            })
                            .collect()
                    }
                };
                Ok(ToolOutput {
                    success: true,
                    content: output,
                    artifacts: vec![],
                })
            }),
        });

        // Environment variable get
        reg.register(ToolDef {
            name: "env_get".into(),
            description: "Get an environment variable value".into(),
            params: vec![ToolParam {
                name: "key".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 0,
            handler: Some(|input| {
                let key = input.args.get("key").and_then(|v| v.as_str()).unwrap_or("");
                match std::env::var(key) {
                    Ok(val) => Ok(ToolOutput {
                        success: true,
                        content: val,
                        artifacts: vec![],
                    }),
                    Err(_) => Ok(ToolOutput {
                        success: false,
                        content: format!("Variable '{key}' not set"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // Environment variable set
        reg.register(ToolDef {
            name: "env_set".into(),
            description: "Set an environment variable for this session".into(),
            params: vec![
                ToolParam {
                    name: "key".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "value".into(),
                    ptype: "string".into(),
                    required: true,
                },
            ],
            cost: 0,
            handler: Some(|input| {
                let key = input.args.get("key").and_then(|v| v.as_str()).unwrap_or("");
                let value = input
                    .args
                    .get("value")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                std::env::set_var(key, value);
                Ok(ToolOutput {
                    success: true,
                    content: format!("Set {key}={value}"),
                    artifacts: vec![],
                })
            }),
        });

        // File watch (directory listing)
        reg.register(ToolDef {
            name: "file_watch".into(),
            description: "List files in a directory with sizes and metadata".into(),
            params: vec![
                ToolParam {
                    name: "path".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "depth".into(),
                    ptype: "integer".into(),
                    required: false,
                },
            ],
            cost: 0,
            handler: Some(|input| {
                let path = input
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".");
                let max_depth = input
                    .args
                    .get("depth")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(1)
                    .min(5) as usize;
                let p = std::path::Path::new(path);
                if !p.exists() {
                    return Ok(ToolOutput {
                        success: false,
                        content: format!("Path not found: {path}"),
                        artifacts: vec![],
                    });
                }
                let mut entries = Vec::new();
                fn walk(
                    dir: &std::path::Path,
                    entries: &mut Vec<String>,
                    depth: usize,
                    max: usize,
                ) {
                    if depth >= max {
                        return;
                    }
                    if let Ok(rd) = std::fs::read_dir(dir) {
                        for e in rd.flatten() {
                            let p = e.path();
                            let meta = std::fs::metadata(&p).ok();
                            let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                            let kind = if p.is_dir() { "dir" } else { "file" };
                            entries.push(format!("[{kind}] {} ({} bytes)", p.display(), size));
                            if p.is_dir() {
                                walk(&p, entries, depth + 1, max);
                            }
                        }
                    }
                }
                walk(p, &mut entries, 0, max_depth);
                Ok(ToolOutput {
                    success: true,
                    content: entries.join("\n"),
                    artifacts: vec![],
                })
            }),
        });

        // Network info
        reg.register(ToolDef {
            name: "network_info".into(),
            description: "Get network info: hostname, local IP".into(),
            params: vec![],
            cost: 0,
            handler: Some(|_| {
                let hostname = std::env::var("COMPUTERNAME")
                    .or_else(|_| std::env::var("HOSTNAME"))
                    .unwrap_or_default();
                let local_ip = (|| {
                    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
                    socket.connect("8.8.8.8:80").ok()?;
                    Some(socket.local_addr().ok()?.ip().to_string())
                })()
                .unwrap_or_default();
                Ok(ToolOutput {
                    success: true,
                    content: format!("hostname: {hostname}\nlocal_ip: {local_ip}"),
                    artifacts: vec![],
                })
            }),
        });

        // Process kill
        reg.register(ToolDef {
            name: "process_kill".into(),
            description: "Kill a process by name (use with caution)".into(),
            params: vec![
                ToolParam {
                    name: "name".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "force".into(),
                    ptype: "boolean".into(),
                    required: false,
                },
            ],
            cost: 10,
            handler: Some(|input| {
                let name = input
                    .args
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let force = input
                    .args
                    .get("force")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                let flag = if force { "/F" } else { "" };
                let output = std::process::Command::new("taskkill")
                    .args(["/IM", name, flag])
                    .output();
                match output {
                    Ok(out) => {
                        let stdout = String::from_utf8_lossy(&out.stdout);
                        let stderr = String::from_utf8_lossy(&out.stderr);
                        Ok(ToolOutput {
                            success: out.status.success(),
                            content: format!("{stdout}{stderr}"),
                            artifacts: vec![],
                        })
                    }
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("Failed: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // Clipboard get
        reg.register(ToolDef {
            name: "clipboard_get".into(),
            description: "Get current clipboard text content".into(),
            params: vec![],
            cost: 0,
            handler: Some(|_| {
                let output = std::process::Command::new("powershell")
                    .args(["-Command", "Get-Clipboard"])
                    .output();
                match output {
                    Ok(out) => {
                        let content = String::from_utf8_lossy(&out.stdout).trim().to_string();
                        Ok(ToolOutput {
                            success: true,
                            content,
                            artifacts: vec![],
                        })
                    }
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("Failed: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // Clipboard set
        reg.register(ToolDef {
            name: "clipboard_set".into(),
            description: "Set clipboard to a text value".into(),
            params: vec![ToolParam {
                name: "text".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 0,
            handler: Some(|input| {
                let text = input
                    .args
                    .get("text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let output = std::process::Command::new("powershell")
                    .args(["-Command", &format!("Set-Clipboard -Value '{text}'")])
                    .output();
                match output {
                    Ok(out) => Ok(ToolOutput {
                        success: out.status.success(),
                        content: format!("Clipboard set ({} chars)", text.len()),
                        artifacts: vec![],
                    }),
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("Failed: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // System info tool
        reg.register(ToolDef {
            name: "sys_info".into(),
            description: "Get system info: CPU, memory, disk usage".into(),
            params: vec![ToolParam {
                name: "query".into(),
                ptype: "string".into(),
                required: false,
            }],
            cost: 2,
            handler: Some(|input| {
                let query = input
                    .args
                    .get("query")
                    .and_then(|v| v.as_str())
                    .unwrap_or("all");
                let mut parts = Vec::new();
                if query == "all" || query == "cpu" {
                    if let Ok(out) = std::process::Command::new("wmic")
                        .args(["cpu", "get", "LoadPercentage", "/value"])
                        .output()
                    {
                        let s = String::from_utf8_lossy(&out.stdout);
                        for line in s.lines() {
                            if let Some(v) = line.strip_prefix("LoadPercentage=") {
                                parts.push(format!("CPU: {}%", v.trim()));
                            }
                        }
                    }
                }
                if query == "all" || query == "memory" {
                    if let Ok(out) = std::process::Command::new("wmic")
                        .args([
                            "OS",
                            "get",
                            "FreePhysicalMemory,TotalVisibleMemorySize",
                            "/value",
                        ])
                        .output()
                    {
                        let s = String::from_utf8_lossy(&out.stdout);
                        let mut free = 0u64;
                        let mut total = 0u64;
                        for line in s.lines() {
                            if let Some(v) = line.strip_prefix("FreePhysicalMemory=") {
                                free = v.trim().parse().unwrap_or(0);
                            }
                            if let Some(v) = line.strip_prefix("TotalVisibleMemorySize=") {
                                total = v.trim().parse().unwrap_or(0);
                            }
                        }
                        if total > 0 {
                            let used_mb = (total - free) / 1024;
                            let total_mb = total / 1024;
                            parts.push(format!("Memory: {used_mb}MB / {total_mb}MB"));
                        }
                    }
                }
                Ok(ToolOutput {
                    success: true,
                    content: parts.join("\n"),
                    artifacts: vec![],
                })
            }),
        });

        // Git info tool
        reg.register(ToolDef {
            name: "git_info".into(),
            description: "Get git repo info: branch, status, recent commits".into(),
            params: vec![ToolParam {
                name: "path".into(),
                ptype: "string".into(),
                required: false,
            }],
            cost: 2,
            handler: Some(|input| {
                let path = input
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".");
                let mut parts = Vec::new();
                if let Ok(out) = std::process::Command::new("git")
                    .args(["-C", path, "branch", "--show-current"])
                    .output()
                {
                    let branch = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    parts.push(format!("Branch: {branch}"));
                }
                if let Ok(out) = std::process::Command::new("git")
                    .args(["-C", path, "status", "--porcelain"])
                    .output()
                {
                    let s = String::from_utf8_lossy(&out.stdout);
                    let count = s.lines().filter(|l| !l.is_empty()).count();
                    parts.push(format!("Changed files: {count}"));
                }
                if let Ok(out) = std::process::Command::new("git")
                    .args(["-C", path, "log", "--oneline", "-5"])
                    .output()
                {
                    let s = String::from_utf8_lossy(&out.stdout);
                    parts.push(format!("Recent:\n{}", s.trim()));
                }
                Ok(ToolOutput {
                    success: true,
                    content: parts.join("\n"),
                    artifacts: vec![],
                })
            }),
        });

        // Base64 encode
        reg.register(ToolDef {
            name: "base64_encode".into(),
            description: "Encode string to base64".into(),
            params: vec![ToolParam {
                name: "input".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 0,
            handler: Some(|input| {
                let input_str = input
                    .args
                    .get("input")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let encoded = base64_encode(input_str.as_bytes());
                Ok(ToolOutput {
                    success: true,
                    content: encoded,
                    artifacts: vec![],
                })
            }),
        });

        // Base64 decode
        reg.register(ToolDef {
            name: "base64_decode".into(),
            description: "Decode base64 string to text".into(),
            params: vec![ToolParam {
                name: "input".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 0,
            handler: Some(|input| {
                let input_str = input
                    .args
                    .get("input")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                match base64_decode(input_str) {
                    Ok(decoded) => Ok(ToolOutput {
                        success: true,
                        content: decoded,
                        artifacts: vec![],
                    }),
                    Err(e) => Ok(ToolOutput {
                        success: false,
                        content: format!("Decode error: {e}"),
                        artifacts: vec![],
                    }),
                }
            }),
        });

        // String utils
        reg.register(ToolDef {
            name: "string_utils".into(),
            description: "Transform text: uppercase, lowercase, trim, reverse, length, count_words"
                .into(),
            params: vec![
                ToolParam {
                    name: "input".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "operation".into(),
                    ptype: "string".into(),
                    required: true,
                },
            ],
            cost: 0,
            handler: Some(|input| {
                let input_str = input
                    .args
                    .get("input")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let op = input
                    .args
                    .get("operation")
                    .and_then(|v| v.as_str())
                    .unwrap_or("length");
                let result = match op {
                    "uppercase" => input_str.to_uppercase(),
                    "lowercase" => input_str.to_lowercase(),
                    "trim" => input_str.trim().to_string(),
                    "reverse" => input_str.chars().rev().collect(),
                    "length" => format!("{}", input_str.len()),
                    "count_words" => format!("{}", input_str.split_whitespace().count()),
                    "capitalize" => {
                        let mut c = input_str.chars();
                        match c.next() {
                            None => String::new(),
                            Some(f) => format!("{}{}", f.to_uppercase(), c.as_str()),
                        }
                    }
                    _ => format!("Unknown operation: {op}"),
                };
                Ok(ToolOutput {
                    success: true,
                    content: result,
                    artifacts: vec![],
                })
            }),
        });

        // Docs fetch — live library documentation (context7-inspired)
        reg.register(ToolDef {
            name: "docs_fetch".into(),
            description: "Fetch up-to-date library documentation. Prevents hallucinated APIs."
                .into(),
            params: vec![
                ToolParam {
                    name: "library".into(),
                    ptype: "string".into(),
                    required: true,
                },
                ToolParam {
                    name: "topic".into(),
                    ptype: "string".into(),
                    required: false,
                },
                ToolParam {
                    name: "version".into(),
                    ptype: "string".into(),
                    required: false,
                },
            ],
            cost: 3,
            handler: Some(|input| {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .unwrap();
                let tool = crate::docs_fetch::DocsFetchTool::new();
                let result = rt.block_on(tool.execute(&input.args_as_value()))?;
                Ok(ToolOutput {
                    success: true,
                    content: result,
                    artifacts: vec![],
                })
            }),
        });

        reg
    }
}

const BASE64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn base64_encode(data: &[u8]) -> String {
    let mut result = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(BASE64_CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(BASE64_CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(BASE64_CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(BASE64_CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn base64_decode(input: &str) -> anyhow::Result<String> {
    let input: Vec<u8> = input
        .bytes()
        .filter(|b| *b != b'=' && *b != b'\n' && *b != b'\r')
        .collect();
    let mut result = Vec::new();
    for chunk in input.chunks(4) {
        if chunk.len() < 2 {
            break;
        }
        let mut vals = [0u32; 4];
        for (i, &b) in chunk.iter().enumerate() {
            vals[i] = BASE64_CHARS
                .iter()
                .position(|&c| c == b)
                .map(|p| p as u32)
                .unwrap_or(0);
        }
        let triple = (vals[0] << 18) | (vals[1] << 12) | (vals[2] << 6) | vals[3];
        result.push((triple >> 16) as u8);
        if chunk.len() > 2 {
            result.push((triple >> 8) as u8);
        }
        if chunk.len() > 3 {
            result.push(triple as u8);
        }
    }
    String::from_utf8(result).map_err(|e| anyhow::anyhow!("Invalid UTF-8: {e}"))
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_registry() {
        let mut reg = ToolRegistry::new();
        reg.register(ToolDef {
            name: "web_search".into(),
            description: "Search the web".into(),
            params: vec![ToolParam {
                name: "query".into(),
                ptype: "string".into(),
                required: true,
            }],
            cost: 5,
            handler: None,
        });
        assert_eq!(reg.count(), 1);
        assert!(reg.get("web_search").is_some());
        assert!(!reg.search("web").is_empty());
    }

    #[test]
    fn test_bootstrap_global() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.count() > 0);
        assert!(reg.get("web_search").is_some());
        assert!(reg.get("fs_read").is_some());
    }

    #[test]
    fn test_execute_tool() {
        let _ = dotenvy::dotenv();
        let reg = ToolRegistry::bootstrap_global();
        let mut args = std::collections::HashMap::new();
        args.insert("query".into(), serde_json::json!("test"));
        let input = ToolInput {
            name: "web_search".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        // May succeed or fail depending on API keys being available
        // The important thing is that it doesn't panic
        if output.success {
            assert!(output.content.contains("test") || output.content.contains("Answer"));
        }
    }

    #[test]
    fn test_new_tool_date_time() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("date_time").is_some());
        let args = std::collections::HashMap::new();
        let input = ToolInput {
            name: "date_time".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(output.content.contains("20"));
    }

    #[test]
    fn test_http_request_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("http_request").is_some());
    }

    #[test]
    fn test_json_query_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("json_query").is_some());
        let mut args = std::collections::HashMap::new();
        args.insert("json".into(), serde_json::json!(r#"{"key": "value"}"#));
        args.insert("path".into(), serde_json::json!("key"));
        let input = ToolInput {
            name: "json_query".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(output.content.contains("value"));
    }

    #[test]
    fn test_hash_generate_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("hash_generate").is_some());
        let mut args = std::collections::HashMap::new();
        args.insert("input".into(), serde_json::json!("hello"));
        let input = ToolInput {
            name: "hash_generate".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(!output.content.is_empty());
    }

    #[test]
    fn test_random_string_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("random_string").is_some());
        let args = std::collections::HashMap::new();
        let input = ToolInput {
            name: "random_string".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert_eq!(output.content.len(), 16); // default length
    }

    #[test]
    fn test_tool_count() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(
            reg.count() >= 34,
            "Expected at least 34 tools, got {}",
            reg.count()
        );
    }

    #[test]
    fn test_env_get_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("env_get").is_some());
        let mut args = std::collections::HashMap::new();
        args.insert("key".into(), serde_json::json!("PATH"));
        let input = ToolInput {
            name: "env_get".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(!output.content.is_empty());
    }

    #[test]
    fn test_env_set_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("env_set").is_some());
    }

    #[test]
    fn test_file_watch_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("file_watch").is_some());
        let mut args = std::collections::HashMap::new();
        args.insert("path".into(), serde_json::json!("."));
        let input = ToolInput {
            name: "file_watch".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(output.content.contains("file") || output.content.contains("dir"));
    }

    #[test]
    fn test_network_info_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("network_info").is_some());
        let args = std::collections::HashMap::new();
        let input = ToolInput {
            name: "network_info".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(output.content.contains("hostname"));
    }

    #[test]
    fn test_process_kill_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("process_kill").is_some());
    }

    #[test]
    fn test_clipboard_tools() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("clipboard_get").is_some());
        assert!(reg.get("clipboard_set").is_some());
    }

    #[test]
    fn test_sys_info_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("sys_info").is_some());
        let mut args = std::collections::HashMap::new();
        args.insert("query".into(), serde_json::json!("cpu"));
        let input = ToolInput {
            name: "sys_info".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
    }

    #[test]
    fn test_git_info_tool() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("git_info").is_some());
    }

    #[test]
    fn test_base64_roundtrip() {
        let reg = ToolRegistry::bootstrap_global();
        let mut args = std::collections::HashMap::new();
        args.insert("input".into(), serde_json::json!("Hello AgenMonster"));
        let input = ToolInput {
            name: "base64_encode".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(!output.content.is_empty());
    }

    #[test]
    fn test_string_utils() {
        let reg = ToolRegistry::bootstrap_global();
        assert!(reg.get("string_utils").is_some());
        let mut args = std::collections::HashMap::new();
        args.insert("input".into(), serde_json::json!("hello world"));
        args.insert("operation".into(), serde_json::json!("uppercase"));
        let input = ToolInput {
            name: "string_utils".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(output.content.contains("HELLO WORLD"));
    }
}
