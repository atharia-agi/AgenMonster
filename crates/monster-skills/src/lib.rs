//! Monster Skills — skill manifest loading, registry, tool bridge.
//!
//! Skills are defined via `skill.toml` files in `skills/*/skill.toml`.
//! Each skill can register tools, provide prompt templates, and declare triggers.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

// ── Skill Manifest (skill.toml) ───────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillManifest {
    pub skill: SkillMeta,
    #[serde(default)]
    pub tools: Vec<SkillTool>,
    #[serde(default)]
    pub prompts: HashMap<String, String>,
    #[serde(default)]
    pub triggers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMeta {
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_stage")]
    pub min_stage: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

fn default_stage() -> String {
    "egg".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillTool {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub parameters: Vec<SkillToolParam>,
    #[serde(default)]
    pub examples: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillToolParam {
    pub name: String,
    pub description: String,
    #[serde(default = "default_param_type")]
    pub param_type: String,
    #[serde(default)]
    pub required: bool,
}

fn default_param_type() -> String {
    "string".into()
}

// ── Skill (loaded + parsed) ───────────────────────────────────

#[derive(Debug, Clone)]
pub struct Skill {
    pub manifest: SkillManifest,
    pub path: PathBuf,
    pub enabled: bool,
}

impl Skill {
    pub fn id(&self) -> &str {
        &self.manifest.skill.name
    }
    pub fn version(&self) -> &str {
        &self.manifest.skill.version
    }
    pub fn description(&self) -> &str {
        &self.manifest.skill.description
    }
    pub fn tags(&self) -> &[String] {
        &self.manifest.skill.tags
    }
    pub fn triggers(&self) -> &[String] {
        &self.manifest.triggers
    }
    pub fn tools(&self) -> &[SkillTool] {
        &self.manifest.tools
    }
    pub fn prompt(&self, key: &str) -> Option<&str> {
        self.manifest.prompts.get(key).map(|s| s.as_str())
    }
}

// ── Skill Registry ────────────────────────────────────────────

pub struct SkillRegistry {
    skills: HashMap<String, Skill>,
}

impl SkillRegistry {
    pub fn new() -> Self {
        Self {
            skills: HashMap::new(),
        }
    }

    pub fn register(&mut self, skill: Skill) {
        self.skills.insert(skill.id().to_string(), skill);
    }

    pub fn get(&self, id: &str) -> Option<&Skill> {
        self.skills.get(id)
    }

    pub fn get_mut(&mut self, id: &str) -> Option<&mut Skill> {
        self.skills.get_mut(id)
    }

    pub fn list(&self) -> Vec<&Skill> {
        self.skills.values().collect()
    }

    pub fn list_enabled(&self) -> Vec<&Skill> {
        self.skills.values().filter(|s| s.enabled).collect()
    }

    pub fn count(&self) -> usize {
        self.skills.len()
    }

    pub fn enabled_count(&self) -> usize {
        self.skills.values().filter(|s| s.enabled).count()
    }

    pub fn enable(&mut self, id: &str) -> bool {
        if let Some(s) = self.skills.get_mut(id) {
            s.enabled = true;
            true
        } else {
            false
        }
    }

    pub fn disable(&mut self, id: &str) -> bool {
        if let Some(s) = self.skills.get_mut(id) {
            s.enabled = false;
            true
        } else {
            false
        }
    }

    pub fn remove(&mut self, id: &str) -> bool {
        self.skills.remove(id).is_some()
    }

    pub fn search(&self, query: &str) -> Vec<&Skill> {
        let q = query.to_lowercase();
        self.skills
            .values()
            .filter(|s| {
                s.id().to_lowercase().contains(&q)
                    || s.description().to_lowercase().contains(&q)
                    || s.tags().iter().any(|t| t.to_lowercase().contains(&q))
            })
            .collect()
    }

    pub fn match_task(&self, task: &str) -> Option<&Skill> {
        let task_lower = task.to_lowercase();
        let mut best: Option<(&Skill, f32)> = None;
        for skill in self.skills.values() {
            if !skill.enabled {
                continue;
            }
            let mut score = 0.0f32;
            for trigger in skill.triggers() {
                if task_lower.contains(&trigger.to_lowercase()) {
                    score += 2.0;
                }
            }
            for tag in skill.tags() {
                if task_lower.contains(&tag.to_lowercase()) {
                    score += 1.0;
                }
            }
            for word in task_lower.split_whitespace() {
                if skill.description().to_lowercase().contains(word) {
                    score += 0.5;
                }
            }
            if score > 0.0 && best.as_ref().is_none_or(|(_, bs)| score > *bs) {
                best = Some((skill, score));
            }
        }
        best.map(|(s, _)| s)
    }

    pub fn all_tool_names(&self) -> Vec<String> {
        self.skills
            .values()
            .filter(|s| s.enabled)
            .flat_map(|s| {
                s.tools()
                    .iter()
                    .map(|t| format!("skill_{}_{}", s.id(), t.name))
            })
            .collect()
    }
}

impl Default for SkillRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ── Skill Loader ──────────────────────────────────────────────

pub struct SkillLoader;

impl SkillLoader {
    /// Scan a directory for `*/skill.toml` files and load them.
    pub fn load_from_dir(skills_dir: &Path) -> anyhow::Result<Vec<Skill>> {
        let mut skills = Vec::new();
        if !skills_dir.is_dir() {
            tracing::warn!("skills directory not found: {}", skills_dir.display());
            return Ok(skills);
        }
        for entry in std::fs::read_dir(skills_dir)? {
            let entry = entry?;
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let toml_path = path.join("skill.toml");
            if !toml_path.exists() {
                continue;
            }
            match Self::load_skill(&toml_path) {
                Ok(skill) => {
                    tracing::info!("loaded skill: {} v{}", skill.id(), skill.version());
                    skills.push(skill);
                }
                Err(e) => {
                    tracing::warn!("failed to load skill from {}: {e}", toml_path.display());
                }
            }
        }
        Ok(skills)
    }

    /// Parse a single `skill.toml` file into a Skill.
    pub fn load_skill(toml_path: &Path) -> anyhow::Result<Skill> {
        let content = std::fs::read_to_string(toml_path)?;
        let manifest: SkillManifest = toml::from_str(&content)?;
        let path = toml_path.parent().unwrap_or(toml_path).to_path_buf();
        Ok(Skill {
            manifest,
            path,
            enabled: true,
        })
    }

    /// Create a new skill scaffold from a template.
    pub fn create_skill(
        skills_dir: &Path,
        name: &str,
        description: &str,
    ) -> anyhow::Result<PathBuf> {
        let skill_dir = skills_dir.join(name);
        std::fs::create_dir_all(&skill_dir)?;

        let manifest = SkillManifest {
            skill: SkillMeta {
                name: name.to_string(),
                version: "0.1.0".into(),
                author: "local".into(),
                description: description.to_string(),
                min_stage: "egg".into(),
                tags: vec![],
            },
            tools: vec![],
            prompts: HashMap::new(),
            triggers: vec![],
        };

        let toml_content = toml::to_string_pretty(&manifest)?;
        let toml_path = skill_dir.join("skill.toml");
        std::fs::write(&toml_path, toml_content)?;

        let readme = format!(
            "# {}\n\n{}\n\n## Tools\n\n(none yet)\n\n## Usage\n\n```bash\nagenmonster skills list\n```\n",
            name, description
        );
        std::fs::write(skill_dir.join("README.md"), readme)?;

        Ok(skill_dir)
    }
}

// ── Tool Bridge ───────────────────────────────────────────────

/// Convert skill tools into JSON tool definitions for the agent loop.
pub fn skill_tools_to_json(skills: &[Skill]) -> Vec<serde_json::Value> {
    let mut tools = Vec::new();
    for skill in skills {
        if !skill.enabled {
            continue;
        }
        for tool in skill.tools() {
            let mut properties = serde_json::Map::new();
            let mut required = Vec::new();
            for param in &tool.parameters {
                properties.insert(
                    param.name.clone(),
                    serde_json::json!({
                        "type": param.param_type,
                        "description": param.description,
                    }),
                );
                if param.required {
                    required.push(serde_json::Value::String(param.name.clone()));
                }
            }
            let tool_def = serde_json::json!({
                "name": format!("skill_{}_{}", skill.id(), tool.name),
                "description": tool.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                },
            });
            tools.push(tool_def);
        }
    }
    tools
}

// ── Tests ─────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_manifest() -> SkillManifest {
        let mut prompts = HashMap::new();
        prompts.insert("system".into(), "You are a test assistant.".into());
        SkillManifest {
            skill: SkillMeta {
                name: "test-skill".into(),
                version: "1.0.0".into(),
                author: "test".into(),
                description: "A test skill".into(),
                min_stage: "egg".into(),
                tags: vec!["test".into(), "demo".into()],
            },
            tools: vec![SkillTool {
                name: "do_thing".into(),
                description: "Does a thing".into(),
                parameters: vec![SkillToolParam {
                    name: "input".into(),
                    description: "The input".into(),
                    param_type: "string".into(),
                    required: true,
                }],
                examples: vec!["do_thing hello".into()],
            }],
            prompts,
            triggers: vec!["test".into(), "thing".into()],
        }
    }

    #[test]
    fn test_skill_from_manifest() {
        let manifest = sample_manifest();
        let skill = Skill {
            manifest,
            path: PathBuf::from("/tmp/test"),
            enabled: true,
        };
        assert_eq!(skill.id(), "test-skill");
        assert_eq!(skill.version(), "1.0.0");
        assert_eq!(skill.tools().len(), 1);
        assert_eq!(skill.tools()[0].name, "do_thing");
        assert!(skill.prompt("system").is_some());
        assert!(skill.prompt("missing").is_none());
    }

    #[test]
    fn test_registry_crud() {
        let mut reg = SkillRegistry::new();
        let skill = Skill {
            manifest: sample_manifest(),
            path: PathBuf::from("/tmp"),
            enabled: true,
        };
        reg.register(skill);
        assert_eq!(reg.count(), 1);
        assert!(reg.get("test-skill").is_some());
        assert_eq!(reg.list().len(), 1);
        assert_eq!(reg.enabled_count(), 1);
        reg.disable("test-skill");
        assert_eq!(reg.enabled_count(), 0);
        reg.enable("test-skill");
        assert_eq!(reg.enabled_count(), 1);
        assert!(reg.remove("test-skill"));
        assert_eq!(reg.count(), 0);
    }

    #[test]
    fn test_registry_search() {
        let mut reg = SkillRegistry::new();
        reg.register(Skill {
            manifest: sample_manifest(),
            path: PathBuf::from("/tmp"),
            enabled: true,
        });
        let results = reg.search("test");
        assert_eq!(results.len(), 1);
        let results = reg.search("demo");
        assert_eq!(results.len(), 1);
        let results = reg.search("nope");
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_match_task() {
        let mut reg = SkillRegistry::new();
        reg.register(Skill {
            manifest: sample_manifest(),
            path: PathBuf::from("/tmp"),
            enabled: true,
        });
        let matched = reg.match_task("run a test");
        assert!(matched.is_some());
        assert_eq!(matched.unwrap().id(), "test-skill");
        let no_match = reg.match_task("cook dinner");
        assert!(no_match.is_none());
    }

    #[test]
    fn test_disabled_skill_not_matched() {
        let mut reg = SkillRegistry::new();
        reg.register(Skill {
            manifest: sample_manifest(),
            path: PathBuf::from("/tmp"),
            enabled: false,
        });
        assert!(reg.match_task("run a test").is_none());
        assert_eq!(reg.enabled_count(), 0);
    }

    #[test]
    fn test_all_tool_names() {
        let mut reg = SkillRegistry::new();
        reg.register(Skill {
            manifest: sample_manifest(),
            path: PathBuf::from("/tmp"),
            enabled: true,
        });
        let names = reg.all_tool_names();
        assert_eq!(names.len(), 1);
        assert_eq!(names[0], "skill_test-skill_do_thing");
    }

    #[test]
    fn test_skill_tools_to_json() {
        let skills = vec![Skill {
            manifest: sample_manifest(),
            path: PathBuf::from("/tmp"),
            enabled: true,
        }];
        let json = skill_tools_to_json(&skills);
        assert_eq!(json.len(), 1);
        assert_eq!(json[0]["name"], "skill_test-skill_do_thing");
    }

    #[test]
    fn test_create_skill() {
        let dir = std::env::temp_dir().join("agenmonster_test_skill");
        let _ = std::fs::remove_dir_all(&dir);
        let result = SkillLoader::create_skill(&dir, "my-skill", "A custom skill");
        assert!(result.is_ok());
        let skill_dir = result.unwrap();
        assert!(skill_dir.join("skill.toml").exists());
        assert!(skill_dir.join("README.md").exists());
        let content = std::fs::read_to_string(skill_dir.join("skill.toml")).unwrap();
        assert!(content.contains("my-skill"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
