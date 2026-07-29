//! Plan — structured task plans with steps.

pub struct Plan {
    pub goal: String,
    pub steps: Vec<PlanStep>,
    pub current_step: usize,
    pub status: PlanStatus,
}

pub struct PlanStep {
    pub description: String,
    pub tool: Option<String>,
    pub args: Vec<String>,
    pub completed: bool,
    pub result: Option<String>,
}

pub enum PlanStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

impl Plan {
    pub fn new(goal: &str) -> Self {
        Self {
            goal: goal.to_string(),
            steps: Vec::new(),
            current_step: 0,
            status: PlanStatus::Pending,
        }
    }

    pub fn add_step(&mut self, description: &str) {
        self.steps.push(PlanStep {
            description: description.to_string(),
            tool: None, args: vec![],
            completed: false, result: None,
        });
    }

    pub fn add_tool_step(&mut self, description: &str, tool: &str, args: Vec<String>) {
        self.steps.push(PlanStep {
            description: description.to_string(),
            tool: Some(tool.to_string()),
            args,
            completed: false, result: None,
        });
    }

    pub fn start(&mut self) {
        self.status = PlanStatus::InProgress;
    }

    pub fn next_step(&mut self) -> Option<&mut PlanStep> {
        if self.current_step >= self.steps.len() { return None; }
        Some(&mut self.steps[self.current_step])
    }

    pub fn complete_step(&mut self, result: &str) {
        if self.current_step < self.steps.len() {
            self.steps[self.current_step].completed = true;
            self.steps[self.current_step].result = Some(result.to_string());
            self.current_step += 1;
            if self.current_step >= self.steps.len() {
                self.status = PlanStatus::Completed;
            }
        }
    }

    pub fn fail(&mut self, reason: &str) {
        self.status = PlanStatus::Failed;
        tracing::error!(reason, "plan failed");
    }

    pub fn is_complete(&self) -> bool {
        matches!(self.status, PlanStatus::Completed)
    }

    pub fn progress(&self) -> f32 {
        if self.steps.is_empty() { return 1.0; }
        self.current_step as f32 / self.steps.len() as f32
    }

    pub fn summary(&self) -> String {
        let completed = self.steps.iter().filter(|s| s.completed).count();
        format!("Plan '{}': {}/{} steps completed ({:.0}%)",
            self.goal, completed, self.steps.len(), self.progress() * 100.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plan_lifecycle() {
        let mut plan = Plan::new("do something");
        plan.add_step("step 1");
        plan.add_step("step 2");
        plan.start();
        assert!(matches!(plan.status, PlanStatus::InProgress));
        plan.complete_step("done");
        assert_eq!(plan.progress(), 0.5);
        plan.complete_step("done");
        assert!(plan.is_complete());
    }

    #[test]
    fn test_plan_with_tool() {
        let mut plan = Plan::new("search");
        plan.add_tool_step("search web", "web_search", vec!["query".into()]);
        assert_eq!(plan.steps.len(), 1);
        assert_eq!(plan.steps[0].tool.as_deref(), Some("web_search"));
    }

    #[test]
    fn test_plan_summary() {
        let mut plan = Plan::new("test");
        plan.add_step("a");
        plan.add_step("b");
        plan.start();
        plan.complete_step("done");
        let summary = plan.summary();
        assert!(summary.contains("1/2"));
    }
}
