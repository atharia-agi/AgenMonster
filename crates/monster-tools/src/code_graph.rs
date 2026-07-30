//! Code graph tool — analyze code structure without heavy dependencies.
//! Extracts functions, structs, imports, and call relationships from source code.
//! Inspired by code-review-graph and codebase-memory-mcp.

use serde_json::Value;

pub struct CodeGraphTool;

impl CodeGraphTool {
    pub fn new() -> Self {
        Self
    }

    pub fn name(&self) -> &str {
        "code_graph"
    }

    pub fn description(&self) -> &str {
        "Analyze code structure: extract functions, structs, imports, and dependencies. Works with Rust, TypeScript, Python, Go."
    }

    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Source code to analyze"
                },
                "language": {
                    "type": "string",
                    "description": "Programming language (rust, typescript, python, go)"
                },
                "analysis": {
                    "type": "string",
                    "enum": ["structure", "dependencies", "metrics", "full"],
                    "description": "Type of analysis (default: full)"
                }
            },
            "required": ["code"]
        })
    }

    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let code = args
            .get("code")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("code is required"))?;

        let language = args
            .get("language")
            .and_then(|v| v.as_str())
            .unwrap_or("auto");

        let analysis = args
            .get("analysis")
            .and_then(|v| v.as_str())
            .unwrap_or("full");

        let lang = if language == "auto" {
            detect_language(code)
        } else {
            language
        };

        let mut result = serde_json::Map::new();
        result.insert(
            "language".into(),
            serde_json::Value::String(lang.to_string()),
        );

        if analysis == "full" || analysis == "structure" {
            let structure = analyze_structure(code, lang);
            result.insert("structure".into(), structure);
        }
        if analysis == "full" || analysis == "dependencies" {
            let deps = analyze_dependencies(code, lang);
            result.insert("dependencies".into(), deps);
        }
        if analysis == "full" || analysis == "metrics" {
            let metrics = analyze_metrics(code);
            result.insert("metrics".into(), metrics);
        }

        Ok(serde_json::Value::Object(result).to_string())
    }
}

fn detect_language(code: &str) -> &'static str {
    if code.contains("fn ")
        && (code.contains("pub ")
            || code.contains("use ")
            || code.contains("struct ")
            || code.contains("impl ")
            || code.contains("trait ")
            || code.contains("enum ")
            || code.contains("mod "))
    {
        "rust"
    } else if code.contains("function ")
        && (code.contains("const ")
            || code.contains("let ")
            || code.contains("import ")
            || code.contains("export ")
            || code.contains("interface ")
            || code.contains("type ")
            || code.contains("=>")
            || code.contains("async ")
            || code.contains("return ")
            || code.contains("<"))
    {
        "typescript"
    } else if code.contains("def ")
        && (code.contains("class ")
            || code.contains("import ")
            || code.contains("self")
            || code.contains("self.")
            || code.contains("__init__"))
    {
        "python"
    } else if code.contains("func ")
        && (code.contains("package ")
            || code.contains("import ")
            || code.contains("struct ")
            || code.contains("interface "))
    {
        "go"
    } else if code.contains("function ") {
        "typescript"
    } else if code.contains("def ") {
        "python"
    } else if code.contains("func ") {
        "go"
    } else if code.contains("fn ") {
        "rust"
    } else {
        "unknown"
    }
}

fn analyze_structure(code: &str, lang: &str) -> serde_json::Value {
    let mut functions = Vec::new();
    let mut structs = Vec::new();
    let mut imports = Vec::new();
    let mut traits = Vec::new();
    let mut enums = Vec::new();

    for line in code.lines() {
        let trimmed = line.trim();
        match lang {
            "rust" => {
                if trimmed.starts_with("pub fn ") || trimmed.starts_with("fn ") {
                    if let Some(name) = extract_name(trimmed, "fn ") {
                        functions.push(name);
                    }
                }
                if trimmed.contains("struct ") {
                    if let Some(name) = extract_name(trimmed, "struct ") {
                        structs.push(name);
                    }
                }
                if trimmed.starts_with("use ") {
                    imports.push(trimmed.to_string());
                }
                if trimmed.contains("trait ") {
                    if let Some(name) = extract_name(trimmed, "trait ") {
                        traits.push(name);
                    }
                }
                if trimmed.contains("enum ") {
                    if let Some(name) = extract_name(trimmed, "enum ") {
                        enums.push(name);
                    }
                }
            }
            "typescript" => {
                if trimmed.starts_with("function ") || trimmed.starts_with("export function ") {
                    if let Some(name) = extract_name(trimmed, "function ") {
                        functions.push(name);
                    }
                }
                if trimmed.starts_with("import ") || trimmed.starts_with("from ") {
                    imports.push(trimmed.to_string());
                }
                if trimmed.starts_with("interface ") || trimmed.starts_with("export interface ") {
                    if let Some(name) = extract_name(trimmed, "interface ") {
                        structs.push(name); // interfaces stored in structs
                    }
                }
            }
            "python" => {
                if trimmed.starts_with("def ") {
                    if let Some(name) = extract_name(trimmed, "def ") {
                        functions.push(name);
                    }
                }
                if trimmed.starts_with("import ") || trimmed.starts_with("from ") {
                    imports.push(trimmed.to_string());
                }
                if trimmed.starts_with("class ") {
                    if let Some(name) = extract_name(trimmed, "class ") {
                        structs.push(name);
                    }
                }
            }
            "go" => {
                if trimmed.starts_with("func ") {
                    if let Some(name) = extract_name(trimmed, "func ") {
                        functions.push(name);
                    }
                }
                if trimmed.starts_with("import ") {
                    imports.push(trimmed.to_string());
                }
                if trimmed.starts_with("type ") && trimmed.contains("struct") {
                    if let Some(name) = extract_name(trimmed, "type ") {
                        structs.push(name);
                    }
                }
            }
            _ => {}
        }
    }

    serde_json::json!({
        "functions": functions,
        "structs": structs,
        "imports": imports,
        "traits": traits,
        "enums": enums,
    })
}

fn analyze_dependencies(code: &str, lang: &str) -> serde_json::Value {
    let mut external = Vec::new();
    let mut internal_calls = Vec::new();

    for line in code.lines() {
        let trimmed = line.trim();
        match lang {
            "rust" => {
                if trimmed.starts_with("use ") {
                    let dep = trimmed
                        .trim_start_matches("use ")
                        .trim_end_matches(';')
                        .trim();
                    if !dep.starts_with("crate")
                        && !dep.starts_with("super")
                        && !dep.starts_with("self")
                    {
                        external.push(dep.split("::").next().unwrap_or(dep).to_string());
                    }
                }
                // Detect function calls like foo(
                if let Some(idx) = trimmed.find('(') {
                    let before = &trimmed[..idx];
                    if let Some(func_name) = before.split_whitespace().next_back() {
                        let func_name = func_name.trim();
                        if !func_name.starts_with("fn")
                            && !func_name.starts_with("if")
                            && !func_name.starts_with("while")
                            && !func_name.starts_with("for")
                            && !func_name.starts_with("match")
                        {
                            internal_calls.push(func_name.to_string());
                        }
                    }
                }
            }
            "typescript" => {
                if trimmed.starts_with("import ") {
                    if let Some(from) = trimmed.split("from ").nth(1) {
                        external.push(from.trim().trim_matches('\'').trim_matches('"').to_string());
                    }
                }
            }
            "python" => {
                if trimmed.starts_with("import ") {
                    external.push(trimmed.trim_start_matches("import ").trim().to_string());
                }
                if trimmed.starts_with("from ") {
                    if let Some(mod_name) = trimmed.split_whitespace().nth(1) {
                        external.push(mod_name.to_string());
                    }
                }
            }
            _ => {}
        }
    }

    external.dedup();
    internal_calls.dedup();

    serde_json::json!({
        "external_dependencies": external,
        "function_calls": internal_calls,
    })
}

fn analyze_metrics(code: &str) -> serde_json::Value {
    let lines = code.lines().count();
    let chars = code.len();
    let blank_lines = code.lines().filter(|l| l.trim().is_empty()).count();
    let comment_lines = code
        .lines()
        .filter(|l| {
            let t = l.trim();
            t.starts_with("//") || t.starts_with("#") || t.starts_with("/*") || t.starts_with("*")
        })
        .count();
    let code_lines = lines - blank_lines - comment_lines;

    // Estimate complexity based on control flow keywords
    let complexity_keywords = [
        "if ", "else ", "match ", "for ", "while ", "loop ", "switch ", "case ",
    ];
    let complexity: usize = code
        .lines()
        .filter(|l| complexity_keywords.iter().any(|kw| l.contains(kw)))
        .count();

    serde_json::json!({
        "total_lines": lines,
        "code_lines": code_lines,
        "blank_lines": blank_lines,
        "comment_lines": comment_lines,
        "characters": chars,
        "estimated_complexity": complexity,
        "maintainability_index": if code_lines > 0 { (100 - complexity * 2).max(0) } else { 100 },
    })
}

fn extract_name(line: &str, keyword: &str) -> Option<String> {
    let after_keyword = line.split(keyword).nth(1)?;
    let name = after_keyword
        .split(|c: char| c == '(' || c == '{' || c == ':' || c == '<' || c == ' ')
        .next()?
        .trim()
        .trim_start_matches("pub ")
        .trim_start_matches("async ")
        .trim_start_matches("mut ")
        .to_string();
    if name.is_empty() || name.starts_with('#') {
        None
    } else {
        Some(name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_code_graph_rust() {
        let tool = CodeGraphTool::new();
        let result = tool.execute(&serde_json::json!({
            "code": "use std::collections::HashMap;\npub fn hello() -> String { \"hi\".into() }\nstruct Foo { x: i32 }",
            "language": "rust"
        })).unwrap();
        assert!(result.contains("hello"));
        assert!(result.contains("Foo"));
        assert!(result.contains("std"));
    }

    #[test]
    fn test_code_graph_typescript() {
        let tool = CodeGraphTool::new();
        let result = tool.execute(&serde_json::json!({
            "code": "import React from 'react';\nfunction App() { return <div />; }\ninterface Props { name: string; }",
            "language": "typescript"
        })).unwrap();
        assert!(result.contains("App"));
        assert!(result.contains("Props"));
    }

    #[test]
    fn test_code_graph_python() {
        let tool = CodeGraphTool::new();
        let result = tool
            .execute(&serde_json::json!({
                "code": "import os\ndef main():\n    pass\nclass Foo:\n    pass",
                "language": "python"
            }))
            .unwrap();
        assert!(result.contains("main"));
        assert!(result.contains("Foo"));
    }

    #[test]
    fn test_detect_language() {
        assert_eq!(detect_language("pub fn hello() {}"), "rust");
        assert_eq!(detect_language("function hello() {}"), "typescript");
        assert_eq!(detect_language("def hello(): pass"), "python");
        assert_eq!(detect_language("func hello() {}"), "go");
    }

    #[test]
    fn test_metrics() {
        let tool = CodeGraphTool::new();
        let result = tool
            .execute(&serde_json::json!({
                "code": "fn main() {\n    if true {\n        println!(\"hi\");\n    }\n}",
                "analysis": "metrics"
            }))
            .unwrap();
        assert!(result.contains("total_lines"));
        assert!(result.contains("estimated_complexity"));
    }
}
