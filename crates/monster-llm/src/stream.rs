//! LLM stream — async streaming from Anthropic/OpenAI/Gemini.

pub struct LlmStream {
    pub model: String,
    pub buffer: String,
    pub done: bool,
}

impl LlmStream {
    pub fn new(model: &str) -> Self {
        Self {
            model: model.to_string(),
            buffer: String::new(),
            done: false,
        }
    }

    pub fn push_chunk(&mut self, chunk: &str) {
        self.buffer.push_str(chunk);
    }

    pub fn finish(&mut self) {
        self.done = true;
    }

    pub fn content(&self) -> &str {
        &self.buffer
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_llm_stream() {
        let mut stream = LlmStream::new("claude-sonnet-4-20250514");
        stream.push_chunk("Hello ");
        stream.push_chunk("world");
        stream.finish();
        assert_eq!(stream.content(), "Hello world");
        assert!(stream.done);
    }
}
