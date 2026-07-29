//! Code tools — execute, format, lint.

pub struct CodeTools;

impl CodeTools {
    pub async fn execute(&self, code: &str, lang: &str) -> String {
        tracing::info!(lang, "code execute");
        format!("Executed {lang} code ({len} chars)", len = code.len())
    }

    pub fn format(&self, code: &str, _lang: &str) -> String {
        code.to_string() // TODO: real formatter
    }

    pub fn lint(&self, _code: &str, _lang: &str) -> Vec<String> {
        vec![]
    }
}
