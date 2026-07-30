//! Pure-Rust pixel art engine.
//!
//! `Palette` = ordered list of 7 hex colors per stage.
//! `Sprite`  = animated frames; each frame is a 24x24 grid of palette
//! indices 0..7.
//! `AnimState` drives frame cycling; never interpolates.

pub mod animator;
pub mod background;
pub mod bg_animator;
pub mod palette;
pub mod render;
pub mod sprite;
pub mod stage_data;
pub mod tile_patterns;

pub use animator::AnimState;
pub use background::Background;
pub use bg_animator::BgAnimator;
pub use palette::{palette_for_stage, StagePalette};
pub use sprite::{SpriteRegistry, SpriteSheet};
pub use tile_patterns::{all_patterns, pattern_for_stage, TilePattern};

pub const MASTER_SPRITE_SIZE: u8 = 24;
pub const PALETTE_SIZE: usize = 7;
