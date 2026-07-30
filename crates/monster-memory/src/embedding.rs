//! TF-IDF embedding engine — no external ML crate needed.
//!
//! Generates simple but effective text embeddings using word frequency
//! with inverse document frequency weighting. Used for semantic memory search.

use std::collections::HashMap;

const EMBEDDING_DIM: usize = 64;

pub struct EmbeddingEngine {
    idf: HashMap<String, f32>,
}

impl EmbeddingEngine {
    pub fn new() -> Self {
        let mut idf = HashMap::new();
        // Common English words with pre-computed IDF weights
        let common_words = vec![
            ("the", 0.5),
            ("a", 0.6),
            ("is", 0.55),
            ("in", 0.5),
            ("it", 0.55),
            ("and", 0.45),
            ("to", 0.5),
            ("of", 0.5),
            ("for", 0.5),
            ("on", 0.55),
            ("with", 0.5),
            ("this", 0.55),
            ("that", 0.55),
            ("are", 0.5),
            ("was", 0.5),
            ("be", 0.5),
            ("at", 0.55),
            ("by", 0.55),
            ("from", 0.5),
            ("or", 0.5),
            ("an", 0.6),
            ("as", 0.55),
            ("has", 0.55),
            ("had", 0.55),
            ("have", 0.5),
            ("not", 0.5),
            ("but", 0.5),
            ("they", 0.55),
            ("which", 0.55),
            ("can", 0.5),
            ("will", 0.5),
            ("if", 0.55),
            ("we", 0.55),
            ("you", 0.55),
            ("do", 0.55),
            ("my", 0.55),
            ("no", 0.55),
            ("so", 0.55),
            ("what", 0.5),
            ("there", 0.55),
            ("their", 0.55),
            ("its", 0.55),
            ("about", 0.5),
            ("up", 0.55),
            ("out", 0.5),
            ("into", 0.5),
            ("just", 0.5),
            ("than", 0.5),
            ("other", 0.5),
            ("new", 0.5),
        ];
        for (word, weight) in common_words {
            idf.insert(word.to_string(), weight);
        }
        Self { idf }
    }

    /// Generate embedding for a text string.
    pub fn embed(&self, text: &str) -> Vec<f32> {
        let tokens = tokenize(text);
        if tokens.is_empty() {
            return vec![0.0; EMBEDDING_DIM];
        }

        let mut embedding = vec![0.0f32; EMBEDDING_DIM];
        let token_count = tokens.len() as f32;

        // Word frequency in this document
        let mut tf: HashMap<String, f32> = HashMap::new();
        for token in &tokens {
            *tf.entry(token.clone()).or_insert(0.0) += 1.0;
        }

        // Generate embedding using hash-based projection
        for (token, freq) in &tf {
            let tf_val = freq / token_count;
            let idf_val = self.idf.get(token.as_str()).copied().unwrap_or(0.8);
            let weight = tf_val * idf_val;

            // Use token bytes to deterministically place in embedding space
            let bytes = token.as_bytes();
            for (i, &byte) in bytes.iter().enumerate() {
                let idx = (byte as usize + i * 37) % EMBEDDING_DIM;
                let sign = if (byte + i as u8) % 2 == 0 { 1.0 } else { -1.0 };
                embedding[idx] += weight * sign;
            }
        }

        // L2 normalize
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm > 0.0 {
            for x in &mut embedding {
                *x /= norm;
            }
        }

        embedding
    }
}

impl Default for EmbeddingEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Tokenize text into lowercase words.
fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|s| s.len() > 1)
        .map(|s| s.to_string())
        .collect()
}

/// Compute cosine similarity between two embeddings.
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a * norm_b)
    }
}

/// Convert embedding vector to bytes for SQLite storage.
pub fn vec_to_bytes(vec: &[f32]) -> Vec<u8> {
    vec.iter().flat_map(|f| f.to_le_bytes()).collect()
}

/// Convert bytes from SQLite back to embedding vector.
pub fn bytes_to_vec(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .filter_map(|chunk| {
            let arr: [u8; 4] = [chunk[0], chunk[1], chunk[2], chunk[3]];
            Some(f32::from_le_bytes(arr))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embed_produces_vector() {
        let engine = EmbeddingEngine::new();
        let emb = engine.embed("hello world test");
        assert_eq!(emb.len(), EMBEDDING_DIM);
        assert!(emb.iter().any(|&x| x != 0.0));
    }

    #[test]
    fn test_empty_text() {
        let engine = EmbeddingEngine::new();
        let emb = engine.embed("");
        assert_eq!(emb.len(), EMBEDDING_DIM);
        assert!(emb.iter().all(|&x| x == 0.0));
    }

    #[test]
    fn test_similar_texts() {
        let engine = EmbeddingEngine::new();
        let a = engine.embed("rust programming language");
        let b = engine.embed("rust code language");
        let sim = cosine_similarity(&a, &b);
        assert!(sim > 0.3, "Expected similarity > 0.3, got {}", sim);
    }

    #[test]
    fn test_different_texts() {
        let engine = EmbeddingEngine::new();
        let a = engine.embed("rust programming");
        let b = engine.embed("cooking recipe food");
        let sim = cosine_similarity(&a, &b);
        assert!(sim < 0.5, "Expected similarity < 0.5, got {}", sim);
    }

    #[test]
    fn test_vec_bytes_roundtrip() {
        let original = vec![0.5, -0.3, 1.0, 0.0, 0.75];
        let bytes = vec_to_bytes(&original);
        let restored = bytes_to_vec(&bytes);
        assert_eq!(original.len(), restored.len());
        for (a, b) in original.iter().zip(restored.iter()) {
            assert!((a - b).abs() < 0.001);
        }
    }

    #[test]
    fn test_tokenize() {
        let tokens = tokenize("Hello, World! This is a test.");
        assert!(tokens.contains(&"hello".to_string()));
        assert!(tokens.contains(&"world".to_string()));
        assert!(tokens.contains(&"test".to_string()));
    }
}
