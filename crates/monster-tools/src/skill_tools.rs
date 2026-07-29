//! Skill tools — list, load, execute.

pub struct SkillTools;

impl SkillTools {
    pub async fn list_skills() -> anyhow::Result<String> {
        Ok("[]".into())
    }
}
