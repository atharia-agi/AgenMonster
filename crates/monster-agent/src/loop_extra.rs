//! Agent loop extra — additional agent capabilities.

use super::loop_main::AgentLoop;
use monster_tools::registry::ToolRegistry;

impl AgentLoop {
    pub async fn summarize_task(
        &self,
        task: &str,
        router: &monster_llm::Router,
    ) -> anyhow::Result<String> {
        let prompt = format!("Summarize this task in one sentence: {task}");
        Ok(router.route(&prompt, "summarize").await?.text)
    }

    pub async fn suggest_tools(
        &self,
        task: &str,
        tools: &ToolRegistry,
        router: &monster_llm::Router,
    ) -> anyhow::Result<Vec<String>> {
        let tool_names = tools.list().join(", ");
        let prompt = format!(
            "Given this task: {task}\n\
             List the tools needed as a JSON array of tool names. \
             Available tools: {tool_names}"
        );
        let response = router.route(&prompt, "tool_selection").await?;
        let names: Vec<String> = serde_json::from_str(&response.text).unwrap_or_default();
        Ok(names)
    }

    pub async fn evaluate_result(
        &self,
        task: &str,
        result: &str,
        router: &monster_llm::Router,
    ) -> anyhow::Result<String> {
        let prompt = format!(
            "Task: {task}\nResult: {result}\n\
             Is this result satisfactory? Reply with one word: yes or no."
        );
        Ok(router.route(&prompt, "evaluation").await?.text)
    }
}
