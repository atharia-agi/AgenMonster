//! SSE parser — parses Server-Sent Events from LLM APIs.

pub struct SseEvent {
    pub event: String,
    pub data: String,
}

pub struct SseParser {
    buffer: String,
}

impl SseParser {
    pub fn new() -> Self {
        Self { buffer: String::new() }
    }

    pub fn feed(&mut self, chunk: &str) -> Vec<SseEvent> {
        self.buffer.push_str(chunk);
        let mut events = Vec::new();

        while let Some(newline_pos) = self.buffer.find('\n') {
            let line = self.buffer[..newline_pos].trim().to_string();
            self.buffer = self.buffer[newline_pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Some(data) = line.strip_prefix("data: ") {
                if data == "[DONE]" {
                    events.push(SseEvent { event: "done".into(), data: String::new() });
                } else {
                    events.push(SseEvent { event: "message".into(), data: data.to_string() });
                }
            } else if let Some(event) = line.strip_prefix("event: ") {
                events.push(SseEvent { event: event.to_string(), data: String::new() });
            }
        }

        events
    }
}

impl Default for SseParser {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sse_parser() {
        let mut parser = SseParser::new();
        let events = parser.feed("data: {\"text\":\"hi\"}\n\n");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].data, "{\"text\":\"hi\"}");
    }

    #[test]
    fn test_sse_done() {
        let mut parser = SseParser::new();
        let events = parser.feed("data: [DONE]\n\n");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event, "done");
    }
}
