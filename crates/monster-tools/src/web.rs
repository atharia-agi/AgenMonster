//! Real web search and fetch implementations using Brave + Tavily APIs.
//! All functions are async — callers use tokio::runtime::Handle::block_on().

use serde::{Deserialize, Serialize};

// ── Brave Search ──

#[derive(Debug, Deserialize)]
struct BraveSearchResponse {
    web: Option<BraveWebResults>,
}

#[derive(Debug, Deserialize)]
struct BraveWebResults {
    results: Vec<BraveResult>,
}

#[derive(Debug, Deserialize)]
struct BraveResult {
    title: String,
    url: String,
    description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSearchResult {
    pub query: String,
    pub answer: Option<String>,
    pub results: Vec<WebSearchItem>,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSearchItem {
    pub title: String,
    pub url: String,
    pub snippet: String,
}

/// Search using Brave Search API.
pub async fn brave_search(
    query: &str,
    api_key: &str,
    count: u32,
) -> anyhow::Result<WebSearchResult> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.search.brave.com/res/v1/web/search?q={}&count={}",
        urlencoding::encode(query),
        count
    );
    let resp = client
        .get(&url)
        .header("Accept", "application/json")
        .header("Accept-Encoding", "gzip")
        .header("X-Subscription-Token", api_key)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Brave API error {status}: {body}");
    }

    let data: BraveSearchResponse = resp.json().await?;
    let results = data.web.map(|w| w.results).unwrap_or_default();

    Ok(WebSearchResult {
        query: query.to_string(),
        answer: None,
        provider: "brave".into(),
        results: results
            .into_iter()
            .map(|r| WebSearchItem {
                title: r.title,
                url: r.url,
                snippet: r.description.unwrap_or_default(),
            })
            .collect(),
    })
}

// ── Tavily Search ──

#[derive(Debug, Deserialize)]
struct TavilySearchResponse {
    answer: Option<String>,
    results: Vec<TavilyResult>,
}

#[derive(Debug, Deserialize)]
struct TavilyResult {
    title: String,
    url: String,
    content: Option<String>,
}

/// Search using Tavily API (with AI-generated answer).
pub async fn tavily_search(
    query: &str,
    api_key: &str,
    max_results: u32,
) -> anyhow::Result<WebSearchResult> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "api_key": api_key,
        "query": query,
        "max_results": max_results,
        "include_answer": true,
    });

    let resp = client
        .post("https://api.tavily.com/search")
        .header("Content-Type", "application/json")
        .json(&body)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Tavily API error {status}: {body}");
    }

    let data: TavilySearchResponse = resp.json().await?;

    Ok(WebSearchResult {
        query: query.to_string(),
        answer: data.answer,
        provider: "tavily".into(),
        results: data
            .results
            .into_iter()
            .map(|r| WebSearchItem {
                title: r.title,
                url: r.url,
                snippet: r.content.unwrap_or_default(),
            })
            .collect(),
    })
}

// ── Web Fetch ──

/// Fetch content from a URL and extract text.
pub async fn web_fetch(url: &str) -> anyhow::Result<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()?;

    let resp = client
        .get(url)
        .header("User-Agent", "AgenMonster/0.1 (AI Companion)")
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        anyhow::bail!("HTTP error {status} for {url}");
    }

    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let text = resp.text().await?;

    if content_type.contains("text/html") {
        Ok(strip_html(&text))
    } else {
        Ok(text)
    }
}

/// Simple HTML tag stripper.
fn strip_html(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;

    let lower = html.to_lowercase();
    let script_start = lower.find("<script");
    let script_end = lower.find("</script>");
    let style_start = lower.find("<style");
    let style_end = lower.find("</style>");

    let skip_ranges: Vec<(usize, usize)> = vec![
        script_start.and_then(|s| script_end.map(|e| (s, e + 9))),
        style_start.and_then(|s| style_end.map(|e| (s, e + 8))),
    ]
    .into_iter()
    .flatten()
    .collect();

    for (i, ch) in html.char_indices() {
        let in_skip = skip_ranges.iter().any(|(s, e)| i >= *s && i <= *e);
        if in_skip {
            continue;
        }

        match ch {
            '<' => in_tag = true,
            '>' if in_tag => {
                in_tag = false;
                continue;
            }
            _ if in_tag => continue,
            _ => result.push(ch),
        }
    }

    result.split_whitespace().collect::<Vec<&str>>().join(" ")
}

/// Combined search: tries Tavily first (has AI answers), falls back to Brave.
pub async fn search_web(
    query: &str,
    tavily_key: Option<&str>,
    brave_key: Option<&str>,
) -> anyhow::Result<WebSearchResult> {
    if let Some(key) = tavily_key {
        match tavily_search(query, key, 5).await {
            Ok(result) if !result.results.is_empty() => return Ok(result),
            Err(e) => tracing::warn!("Tavily search failed: {e}"),
            _ => {}
        }
    }
    if let Some(key) = brave_key {
        return brave_search(query, key, 5).await;
    }
    anyhow::bail!("No search API key configured. Set TAVILY_API_KEY or BRAVE_API_KEY in .env")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_html() {
        let html =
            "<html><head><title>Test</title></head><body><h1>Hello</h1><p>World</p></body></html>";
        let text = strip_html(html);
        assert!(text.contains("Hello"));
        assert!(text.contains("World"));
        assert!(!text.contains("<h1>"));
    }

    #[test]
    fn test_strip_html_script() {
        let html =
            r#"<html><head><script>alert('hi')</script></head><body><p>Content</p></body></html>"#;
        let text = strip_html(html);
        assert!(text.contains("Content"));
        assert!(!text.contains("alert"));
    }
}
