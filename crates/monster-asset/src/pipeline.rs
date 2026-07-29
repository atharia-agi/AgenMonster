//! Asset pipeline — converts raw sprite data into runtime-ready formats.
//! Handles palette indexing, frame extraction, and CDN URL generation.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetManifest {
    pub sprites: Vec<SpriteAsset>,
    pub tiles: Vec<TileAsset>,
    pub sounds: Vec<SoundAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpriteAsset {
    pub stage: String,
    pub frames: u32,
    pub format: String,
    pub path: String,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileAsset {
    pub stage: String,
    pub size: u32,
    pub format: String,
    pub path: String,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SoundAsset {
    pub name: String,
    pub format: String,
    pub path: String,
    pub hash: String,
}

pub struct AssetPipeline {
    pub root: PathBuf,
}

impl AssetPipeline {
    pub fn new(root: &Path) -> Self {
        Self { root: root.to_path_buf() }
    }

    pub fn manifest_path(&self) -> PathBuf {
        self.root.join("static").join("asset-manifest.json")
    }

    pub fn build_manifest(&self) -> anyhow::Result<AssetManifest> {
        let mut sprites = vec![];
        let stages = ["egg","hatchling","baby","child","teen","adult","mega"];
        for stage in &stages {
            let path = self.root.join("static").join("img").join("sprites").join(format!("{stage}.png"));
            if path.exists() {
                let hash = blake3::hash(&std::fs::read(&path)?).to_hex().to_string();
                sprites.push(SpriteAsset {
                    stage: stage.to_string(),
                    frames: 4, // default
                    format: "png".into(),
                    path: path.to_string_lossy().to_string(),
                    hash,
                });
            }
        }

        let mut tiles = vec![];
        for stage in &stages {
            let path = self.root.join("static").join("img").join("tiles").join(format!("{stage}.png"));
            if path.exists() {
                let hash = blake3::hash(&std::fs::read(&path)?).to_hex().to_string();
                tiles.push(TileAsset {
                    stage: stage.to_string(),
                    size: 16,
                    format: "png".into(),
                    path: path.to_string_lossy().to_string(),
                    hash,
                });
            }
        }

        let mut sounds = vec![];
        let sound_names = ["click","bark","happy","evolve","error","busy"];
        for name in &sound_names {
            let path = self.root.join("static").join("ogg").join(format!("{name}.wav"));
            if path.exists() {
                let hash = blake3::hash(&std::fs::read(&path)?).to_hex().to_string();
                sounds.push(SoundAsset {
                    name: name.to_string(),
                    format: "wav".into(),
                    path: path.to_string_lossy().to_string(),
                    hash,
                });
            }
        }

        Ok(AssetManifest { sprites, tiles, sounds })
    }

    pub fn write_manifest(&self) -> anyhow::Result<()> {
        let manifest = self.build_manifest()?;
        let json = serde_json::to_string_pretty(&manifest)?;
        std::fs::write(self.manifest_path(), json)?;
        Ok(())
    }
}
