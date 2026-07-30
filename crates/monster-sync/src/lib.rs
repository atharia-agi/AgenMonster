//! monster-sync — peer-to-peer state synchronisation layer.
//!
//! Uses mDNS for local peer discovery + TCP for skill/memory exchange.
//! No external libp2p dependency — lightweight custom protocol.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncRequest {
    ListPeers,
    GetSkill(String),
    PushSkill {
        id: String,
        body: String,
        signature: String,
        author_pubkey: String,
    },
    GetMemoryDigest,
    PushMemoryDigest(Vec<u8>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncResponse {
    Peers(Vec<PeerInfo>),
    Skill(Option<String>),
    Ack,
    MemoryDigest(Vec<u8>),
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerInfo {
    pub peer_id: String,
    pub addr: String,
    pub name: String,
    pub last_seen: u64,
}

pub struct Sync {
    pub bus: monster_bus::Bus,
    peer_id: String,
    listen_port: u16,
    peers: Arc<RwLock<Vec<PeerInfo>>>,
    skills_dir: std::path::PathBuf,
}

impl Sync {
    pub async fn boot(bus: monster_bus::Bus, listen_port: u16) -> Arc<Self> {
        let hex_str = blake3::hash(
            &std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
                .to_le_bytes(),
        )
        .to_hex()
        .to_string();
        let peer_id = format!("peer-{}", &hex_str[..12]);

        let skills_dir = dirs::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("agenmonster")
            .join("skills");
        std::fs::create_dir_all(&skills_dir).ok();

        let sync = Arc::new(Self {
            bus,
            peer_id: peer_id.clone(),
            listen_port,
            peers: Arc::new(RwLock::new(Vec::new())),
            skills_dir,
        });

        // Start TCP listener
        let sync_clone = sync.clone();
        tokio::spawn(async move {
            if let Err(e) = sync_clone.run_listener().await {
                tracing::error!("Sync listener error: {e}");
            }
        });

        // Start mDNS broadcaster
        let sync_clone = sync.clone();
        tokio::spawn(async move {
            sync_clone.run_mdns_broadcaster().await;
        });

        // Start peer cleanup
        let sync_clone = sync.clone();
        tokio::spawn(async move {
            sync_clone.run_peer_cleanup().await;
        });

        tracing::info!(peer_id = %peer_id, port = listen_port, "Sync layer started");
        sync
    }

    async fn run_listener(&self) -> anyhow::Result<()> {
        let addr = format!("0.0.0.0:{}", self.listen_port);
        let listener = TcpListener::bind(&addr).await?;
        tracing::info!(addr = %addr, "Sync listener bound");

        loop {
            let (stream, peer_addr) = listener.accept().await?;
            let peers = self.peers.clone();
            let skills_dir = self.skills_dir.clone();
            let peer_id = self.peer_id.clone();

            tokio::spawn(async move {
                if let Err(e) =
                    Self::handle_connection(stream, peer_addr, peers, skills_dir, peer_id).await
                {
                    tracing::warn!(addr = %peer_addr, "Connection error: {e}");
                }
            });
        }
    }

    async fn handle_connection(
        mut stream: TcpStream,
        peer_addr: std::net::SocketAddr,
        peers: Arc<RwLock<Vec<PeerInfo>>>,
        skills_dir: std::path::PathBuf,
        our_peer_id: String,
    ) -> anyhow::Result<()> {
        // Read request
        let mut buf = vec![0u8; 65536];
        let n = stream.read(&mut buf).await?;
        if n == 0 {
            return Ok(());
        }

        let request: SyncRequest = serde_json::from_slice(&buf[..n])?;

        let response = match request {
            SyncRequest::ListPeers => {
                let peer_list = peers.read().await.clone();
                SyncResponse::Peers(peer_list)
            }
            SyncRequest::GetSkill(id) => {
                let skill_path = skills_dir.join(&id).join("skill.toml");
                if skill_path.exists() {
                    let body = std::fs::read_to_string(&skill_path).unwrap_or_default();
                    SyncResponse::Skill(Some(body))
                } else {
                    SyncResponse::Skill(None)
                }
            }
            SyncRequest::PushSkill { id, body, .. } => {
                let skill_dir = skills_dir.join(&id);
                std::fs::create_dir_all(&skill_dir).ok();
                let _ = std::fs::write(skill_dir.join("skill.toml"), &body);
                tracing::info!(skill_id = %id, "Received skill from peer");
                SyncResponse::Ack
            }
            SyncRequest::GetMemoryDigest => {
                // Return empty digest for now
                SyncResponse::MemoryDigest(vec![])
            }
            SyncRequest::PushMemoryDigest(_digest) => SyncResponse::Ack,
        };

        // Update peer list
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        {
            let mut peer_list = peers.write().await;
            if let Some(existing) = peer_list
                .iter_mut()
                .find(|p| p.addr == peer_addr.to_string())
            {
                existing.last_seen = now;
            } else {
                peer_list.push(PeerInfo {
                    peer_id: our_peer_id.clone(),
                    addr: peer_addr.to_string(),
                    name: format!("peer-{}", &our_peer_id[..8]),
                    last_seen: now,
                });
            }
        }

        // Send response
        let response_bytes = serde_json::to_vec(&response)?;
        stream.write_all(&response_bytes).await?;
        stream.flush().await?;

        Ok(())
    }

    async fn run_mdns_broadcaster(&self) {
        let port = self.listen_port;
        let peer_id = self.peer_id.clone();

        // Simple UDP broadcast every 5 seconds
        let socket = tokio::net::UdpSocket::bind("0.0.0.0:0").await.ok();
        if let Some(socket) = socket {
            socket.set_broadcast(true).ok();
            let broadcast_addr = format!("255.255.255.255:{port}");

            loop {
                let announcement = serde_json::json!({
                    "type": "agenmonster_peer",
                    "peer_id": peer_id,
                    "port": port,
                    "version": env!("CARGO_PKG_VERSION"),
                });

                if let Ok(data) = serde_json::to_vec(&announcement) {
                    let _ = socket.send_to(&data, &broadcast_addr).await;
                }

                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        } else {
            tracing::warn!("Could not create UDP socket for mDNS broadcast");
            // Keep the task alive
            loop {
                tokio::time::sleep(std::time::Duration::from_secs(60)).await;
            }
        }
    }

    async fn run_peer_cleanup(&self) {
        let peers = self.peers.clone();
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            let mut peer_list = peers.write().await;
            let before = peer_list.len();
            peer_list.retain(|p| now - p.last_seen < 120); // 2 min timeout
            let removed = before - peer_list.len();
            if removed > 0 {
                tracing::info!(
                    removed,
                    remaining = peer_list.len(),
                    "Cleaned up stale peers"
                );
            }
        }
    }

    /// Connect to a peer and send a request.
    pub async fn request_peer(
        &self,
        addr: &str,
        request: &SyncRequest,
    ) -> anyhow::Result<SyncResponse> {
        let mut stream = TcpStream::connect(addr).await?;
        let request_bytes = serde_json::to_vec(request)?;
        stream.write_all(&request_bytes).await?;
        stream.flush().await?;

        let mut buf = vec![0u8; 65536];
        let n = stream.read(&mut buf).await?;
        let response: SyncResponse = serde_json::from_slice(&buf[..n])?;
        Ok(response)
    }

    /// Get list of known peers.
    pub async fn list_peers(&self) -> Vec<PeerInfo> {
        self.peers.read().await.clone()
    }

    /// Get our peer ID.
    pub fn peer_id(&self) -> &str {
        &self.peer_id
    }

    /// Get listen port.
    pub fn port(&self) -> u16 {
        self.listen_port
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialization_roundtrip() {
        let req = SyncRequest::GetSkill("test-skill".into());
        let json = serde_json::to_string(&req).unwrap();
        let decoded: SyncRequest = serde_json::from_str(&json).unwrap();
        match decoded {
            SyncRequest::GetSkill(id) => assert_eq!(id, "test-skill"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn test_peer_info_creation() {
        let peer = PeerInfo {
            peer_id: "peer-abc123".into(),
            addr: "127.0.0.1:9000".into(),
            name: "test-peer".into(),
            last_seen: 1234567890,
        };
        let json = serde_json::to_string(&peer).unwrap();
        let decoded: PeerInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.peer_id, "peer-abc123");
        assert_eq!(decoded.addr, "127.0.0.1:9000");
    }

    #[test]
    fn test_sync_response_variants() {
        let responses = vec![
            SyncResponse::Peers(vec![]),
            SyncResponse::Skill(None),
            SyncResponse::Skill(Some("body".into())),
            SyncResponse::Ack,
            SyncResponse::MemoryDigest(vec![1, 2, 3]),
            SyncResponse::Error("test".into()),
        ];
        for resp in responses {
            let json = serde_json::to_string(&resp).unwrap();
            let _decoded: SyncResponse = serde_json::from_str(&json).unwrap();
        }
    }
}
