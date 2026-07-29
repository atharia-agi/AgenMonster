//! Pure-Rust pixel art engine.
//!
//! `Palette` = ordered list of 7 hex colors per stage.
//! `Sprite`  = animated frames; each frame is a 24x24 grid of palette
//! indices 0..7.
//! `AnimState` drives frame cycling; never interpolates.

pub mod palette;
pub mod sprite;
pub mod animator;
pub mod background;
pub mod bg_animator;
pub mod tile_patterns;
pub mod render;
pub mod stage_data;

pub use palette::{StagePalette, palette_for_stage};
pub use sprite::{SpriteSheet, SpriteRegistry};
pub use animator::AnimState;
pub use background::Background;
pub use bg_animator::BgAnimator;
pub use tile_patterns::{TilePattern, pattern_for_stage, all_patterns};

pub const MASTER_SPRITE_SIZE: u8 = 24;
pub const PALETTE_SIZE: usize = 7;
