//! Channel utilities — broadcast channel helpers.

#[cfg(test)]
mod test_utils {
    use tokio::sync::broadcast;

    pub fn create_channel(
        capacity: usize,
    ) -> (broadcast::Sender<String>, broadcast::Receiver<String>) {
        broadcast::channel(capacity)
    }

    pub async fn send_event(sender: &broadcast::Sender<String>, topic: &str, payload: &str) {
        let msg = format!("{topic}::{payload}");
        let _ = sender.send(msg);
    }
}

#[cfg(test)]
mod tests {
    use super::test_utils::*;

    #[tokio::test]
    async fn test_channel_send_recv() {
        let (tx, mut rx) = create_channel(16);
        send_event(&tx, "test", "hello").await;
        let msg = rx.recv().await.unwrap();
        assert_eq!(msg, "test::hello");
    }
}
