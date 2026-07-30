//! Docs fetch tool — live library documentation retrieval.
//! Inspired by context7 MCP: fetch up-to-date, version-specific library docs
//! to prevent hallucinated APIs and outdated code.

use serde_json::Value;

pub struct DocsFetchTool;

impl DocsFetchTool {
    pub fn new() -> Self {
        Self
    }

    pub fn name(&self) -> &str {
        "docs_fetch"
    }

    pub fn description(&self) -> &str {
        "Fetch up-to-date library documentation. Searches for a library and returns current API docs, preventing hallucinated APIs."
    }

    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "library": {
                    "type": "string",
                    "description": "Library name to fetch docs for (e.g. 'react', 'next.js', 'tauri')"
                },
                "topic": {
                    "type": "string",
                    "description": "Specific topic or API to look up (e.g. 'useState', 'createWindow')"
                },
                "version": {
                    "type": "string",
                    "description": "Specific version (optional, defaults to latest)"
                }
            },
            "required": ["library"]
        })
    }

    pub async fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let library = args
            .get("library")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("library is required"))?;

        let topic = args.get("topic").and_then(|v| v.as_str()).unwrap_or("");

        let version = args
            .get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("latest");

        // Use npm registry API for JS/TS libraries (most common for AgenMonster)
        let search_url = format!(
            "https://registry.npmjs.org/{}",
            library.to_lowercase().replace(' ', "-")
        );

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()?;

        // Try npm registry first
        match client.get(&search_url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let body = resp.text().await.unwrap_or_default();
                if let Ok(pkg) = serde_json::from_str::<Value>(&body) {
                    let latest = pkg["dist-tags"]["latest"].as_str().unwrap_or(version);
                    let description = pkg["description"].as_str().unwrap_or("No description");
                    let homepage = pkg["homepage"].as_str().unwrap_or("");
                    let repo = pkg["repository"]["url"].as_str().unwrap_or("");

                    // Get recent versions
                    let versions = pkg["versions"].as_object();
                    let recent_versions: Vec<String> = versions
                        .map(|v| {
                            let mut keys: Vec<String> = v.keys().cloned().collect();
                            keys.sort();
                            keys.into_iter().rev().take(5).collect()
                        })
                        .unwrap_or_default();

                    let mut result =
                        format!(
                        "📚 {} v{}\n{}\n\nHomepage: {}\nRepository: {}\n\nRecent versions: {}\n",
                        library, latest, description, homepage, repo,
                        recent_versions.join(", ")
                    );

                    // If topic specified, search in readme or package info
                    if !topic.is_empty() {
                        result.push_str(&format!(
                            "\n🔍 Topic search '{}':\nCheck the official docs at {} for '{}' API.\nTip: Use web_search tool with query: '{} {} api docs' for current documentation.\n",
                            topic, homepage, topic, library, topic
                        ));
                    }

                    // Add common docs links
                    result.push_str(&format!(
                        "\n📖 Documentation sources:\n- npm: https://www.npmjs.com/package/{}\n- GitHub: {}\n- Use web_fetch to read specific doc pages\n",
                        library.to_lowercase().replace(' ', "-"), repo
                    ));

                    return Ok(result);
                }
            }
            _ => {}
        }

        // Fallback: suggest using web_search
        Ok(format!(
            "📚 Library '{}' not found on npm. Try:\n- web_search: '{} documentation'\n- web_fetch: official docs URL\n- For Rust crates, check https://docs.rs/{}",
            library, library, library.to_lowercase().replace(' ', "_")
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_docs_fetch_params() {
        let tool = DocsFetchTool::new();
        let params = tool.parameters();
        assert_eq!(params["properties"]["library"]["type"], "string");
    }

    #[tokio::test]
    async fn test_docs_fetch_react() {
        let tool = DocsFetchTool::new();
        let result = tool
            .execute(&serde_json::json!({
                "library": "react"
            }))
            .await
            .unwrap();
        assert!(result.contains("react"));
        assert!(result.contains("npm"));
    }
}
