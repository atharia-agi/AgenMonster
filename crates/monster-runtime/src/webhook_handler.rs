//! Webhook handler — incoming webhook processing.

pub struct WebhookHandler {
    pub secret: Option<String>,
}

impl WebhookHandler {
    pub fn new(secret: Option<String>) -> Self {
        Self { secret }
    }

    pub fn verify_signature(&self, payload: &[u8], signature: &str) -> bool {
        if let Some(ref secret) = self.secret {
            // HMAC-SHA256 verification
            use hmac::{Hmac, Mac};
            use sha2::Sha256;
            type HmacSha256 = Hmac<Sha256>;
            let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
            mac.update(payload);
            let result = mac.finalize();
            let expected = format!("sha256={}", hex::encode(result.into_bytes()));
            expected == signature
        } else {
            true
        }
    }

    pub fn parse_payload(&self, body: &str) -> Option<WebhookPayload> {
        serde_json::from_str(body).ok()
    }
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct WebhookPayload {
    pub event: String,
    pub data: serde_json::Value,
    pub timestamp: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_webhook_handler() {
        let handler = WebhookHandler::new(None);
        assert!(handler.verify_signature(b"test", "any"));
    }

    #[test]
    fn test_parse_payload() {
        let handler = WebhookHandler::new(None);
        let payload = r#"{"event":"test","data":{},"timestamp":1234567890}"#;
        let parsed = handler.parse_payload(payload);
        assert!(parsed.is_some());
        assert_eq!(parsed.unwrap().event, "test");
    }
}
