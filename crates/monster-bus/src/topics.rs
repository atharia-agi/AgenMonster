//! Topic definitions — typed topic constants.

pub const TOPIC_TICK: &str = "tick";
pub const TOPIC_MESSAGE: &str = "message";
pub const TOPIC_TOOL_CALL: &str = "tool_call";
pub const TOPIC_TOOL_RESULT: &str = "tool_result";
pub const TOPIC_LLM_STREAM: &str = "llm_stream";
pub const TOPIC_EVOLUTION: &str = "evolution";
pub const TOPIC_MEMORY: &str = "memory";
pub const TOPIC_SKILL: &str = "skill";
pub const TOPIC_ENERGY: &str = "energy";

pub const ALL_TOPICS: &[&str] = &[
    TOPIC_TICK,
    TOPIC_MESSAGE,
    TOPIC_TOOL_CALL,
    TOPIC_TOOL_RESULT,
    TOPIC_LLM_STREAM,
    TOPIC_EVOLUTION,
    TOPIC_MEMORY,
    TOPIC_SKILL,
    TOPIC_ENERGY,
];

pub fn topic_index(topic: &str) -> Option<usize> {
    ALL_TOPICS.iter().position(|&t| t == topic)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_topics() {
        assert_eq!(ALL_TOPICS.len(), 9);
    }

    #[test]
    fn test_topic_index() {
        assert_eq!(topic_index("tick"), Some(0));
        assert_eq!(topic_index("energy"), Some(8));
        assert_eq!(topic_index("missing"), None);
    }
}
