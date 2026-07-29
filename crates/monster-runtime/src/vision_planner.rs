//! Vision planner — screenshot analysis and action planning using LLM.
//!
//! Takes a screenshot (file path), sends it to a vision-capable model,
//! and returns structured action plans for computer-use.

use serde::{Deserialize, Serialize};

pub struct VisionPlanner {
    pub max_actions: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlannedAction {
    pub action_type: String,
    pub target: String,
    pub description: String,
    pub confidence: f32,
    pub coordinates: Option<(u32, u32)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisionResult {
    pub description: String,
    pub actions: Vec<PlannedAction>,
    pub model: String,
    pub tokens_used: u32,
}

impl VisionPlanner {
    pub fn new() -> Self {
        Self { max_actions: 5 }
    }

    /// Analyze a screenshot using a vision-capable LLM.
    /// Sends the screenshot as base64 to the model and gets back
    /// a structured description + action plan.
    pub async fn analyze_screenshot(
        &self,
        screenshot_path: &str,
        task: &str,
        router: &monster_llm::Router,
    ) -> anyhow::Result<VisionResult> {
        // Read and base64-encode the screenshot
        let img_bytes = std::fs::read(screenshot_path)?;
        let base64_img = base64_encode(&img_bytes);

        // Build vision prompt
        let prompt = format!(
            "You are analyzing a screenshot for a computer-use agent.\n\n\
             Task: {task}\n\n\
             Analyze the screenshot and respond with a JSON object containing:\n\
             1. \"description\": A brief description of what you see on screen\n\
             2. \"actions\": An array of actions to take, each with:\n\
                - \"action_type\": one of \"click\", \"type\", \"scroll\", \"key_press\", \"wait\"\n\
                - \"target\": what to interact with (button name, input field, etc.)\n\
                - \"description\": human-readable description of the action\n\
                - \"confidence\": 0.0-1.0\n\
                - \"coordinates\": [x, y] if applicable, null otherwise\n\n\
             Return ONLY the JSON, no other text.\n\n\
             Screenshot (base64): data:image/png;base64,{base64_img}"
        );

        // Send to vision model
        let response = router.route_stream(&prompt, "vision", |_| {}).await?;

        // Parse response
        let result = self.parse_vision_response(&response.text, &response.model, response.total_tokens);
        Ok(result)
    }

    /// Parse the LLM response into structured VisionResult.
    fn parse_vision_response(&self, text: &str, model: &str, tokens: u32) -> VisionResult {
        // Try to extract JSON from the response
        let json_str = if let Some(start) = text.find('{') {
            if let Some(end) = text.rfind('}') {
                &text[start..=end]
            } else {
                text
            }
        } else {
            text
        };

        match serde_json::from_str::<serde_json::Value>(json_str) {
            Ok(v) => {
                let description = v["description"].as_str().unwrap_or("No description").to_string();
                let mut actions = Vec::new();
                if let Some(arr) = v["actions"].as_array() {
                    for item in arr.iter().take(self.max_actions) {
                        actions.push(PlannedAction {
                            action_type: item["action_type"].as_str().unwrap_or("wait").to_string(),
                            target: item["target"].as_str().unwrap_or("").to_string(),
                            description: item["description"].as_str().unwrap_or("").to_string(),
                            confidence: item["confidence"].as_f64().unwrap_or(0.5) as f32,
                            coordinates: item["coordinates"].as_array().and_then(|c| {
                                if c.len() >= 2 {
                                    Some((
                                        c[0].as_u64().unwrap_or(0) as u32,
                                        c[1].as_u64().unwrap_or(0) as u32,
                                    ))
                                } else {
                                    None
                                }
                            }),
                        });
                    }
                }
                VisionResult { description, actions, model: model.to_string(), tokens_used: tokens }
            }
            Err(_) => {
                // Fallback: treat the whole response as description
                VisionResult {
                    description: text.to_string(),
                    actions: vec![],
                    model: model.to_string(),
                    tokens_used: tokens,
                }
            }
        }
    }

    /// Simple plan from text description (fallback when no vision model).
    pub fn plan_from_description(&self, description: &str) -> Vec<PlannedAction> {
        let mut actions = Vec::new();
        let desc_lower = description.to_lowercase();

        if desc_lower.contains("button") || desc_lower.contains("submit") {
            actions.push(PlannedAction {
                action_type: "click".into(),
                target: "button".into(),
                description: "Click the button".into(),
                confidence: 0.8,
                coordinates: None,
            });
        }
        if desc_lower.contains("input") || desc_lower.contains("text field") || desc_lower.contains("search") {
            actions.push(PlannedAction {
                action_type: "type".into(),
                target: "input".into(),
                description: "Type in the input field".into(),
                confidence: 0.7,
                coordinates: None,
            });
        }
        if desc_lower.contains("link") {
            actions.push(PlannedAction {
                action_type: "click".into(),
                target: "link".into(),
                description: "Click the link".into(),
                confidence: 0.9,
                coordinates: None,
            });
        }
        if desc_lower.contains("scroll") {
            actions.push(PlannedAction {
                action_type: "scroll".into(),
                target: "page".into(),
                description: "Scroll down".into(),
                confidence: 0.6,
                coordinates: None,
            });
        }
        actions
    }
}

impl Default for VisionPlanner {
    fn default() -> Self { Self::new() }
}

/// Simple base64 encoder (no external crate needed).
fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 { result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char); } else { result.push('='); }
        if chunk.len() > 2 { result.push(CHARS[(triple & 0x3F) as usize] as char); } else { result.push('='); }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vision_planner_description() {
        let vp = VisionPlanner::new();
        let actions = vp.plan_from_description("There is a submit button and a text input field");
        assert!(actions.len() >= 2);
        assert!(actions.iter().any(|a| a.action_type == "click"));
        assert!(actions.iter().any(|a| a.action_type == "type"));
    }

    #[test]
    fn test_base64_encode() {
        let data = b"Hello, World!";
        let encoded = base64_encode(data);
        assert_eq!(encoded, "SGVsbG8sIFdvcmxkIQ==");
    }

    #[test]
    fn test_base64_encode_empty() {
        assert_eq!(base64_encode(b""), "");
    }

    #[test]
    fn test_parse_vision_response() {
        let vp = VisionPlanner::new();
        let json = r#"{"description": "A browser with a search box", "actions": [{"action_type": "click", "target": "search box", "description": "Click search", "confidence": 0.9, "coordinates": [100, 200]}]}"#;
        let result = vp.parse_vision_response(json, "gpt-4o", 500);
        assert_eq!(result.description, "A browser with a search box");
        assert_eq!(result.actions.len(), 1);
        assert_eq!(result.actions[0].action_type, "click");
        assert_eq!(result.actions[0].coordinates, Some((100, 200)));
    }

    #[test]
    fn test_parse_vision_response_fallback() {
        let vp = VisionPlanner::new();
        let result = vp.parse_vision_response("I see a desktop with icons", "gpt-4o", 100);
        assert_eq!(result.description, "I see a desktop with icons");
        assert!(result.actions.is_empty());
    }
}
