//! Vector similarity — cosine similarity for embeddings.

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot / (norm_a * norm_b)
}

pub fn top_k_similar(query: &[f32], embeddings: &[(u64, Vec<f32>)], k: usize) -> Vec<(u64, f32)> {
    let mut scores: Vec<(u64, f32)> = embeddings.iter()
        .map(|(id, emb)| (*id, cosine_similarity(query, emb)))
        .collect();

    scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    scores.truncate(k);
    scores
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &b) - 1.0).abs() < 0.001);

        let c = vec![0.0, 1.0, 0.0];
        assert!((cosine_similarity(&a, &c)).abs() < 0.001);
    }

    #[test]
    fn test_top_k() {
        let query = vec![1.0, 0.0];
        let embeddings = vec![
            (1, vec![1.0, 0.0]),
            (2, vec![0.0, 1.0]),
            (3, vec![0.9, 0.1]),
        ];
        let top = top_k_similar(&query, &embeddings, 2);
        assert_eq!(top[0].0, 1);
        assert_eq!(top[1].0, 3);
    }
}
