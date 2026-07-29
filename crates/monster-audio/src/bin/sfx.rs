//! tiny CLI: `monster-audio-encode` writes all SFX presets to ./apps/desktop/static/ogg/.

use monster_audio::*;
use std::path::PathBuf;

fn main_pwd() -> PathBuf {
    let cwd = std::env::current_dir().unwrap();
    cwd
}

fn main() -> anyhow::Result<()> {
    let out = std::env::args().nth(1).map(PathBuf::from)
        .unwrap_or_else(|| main_pwd().join("apps/desktop/static/ogg"));
    std::fs::create_dir_all(&out)?;
    for (name, voices) in presets() {
        let samples = mixed(&voices);
        let path = out.join(format!("{name}.wav"));
        write_wav(&path, &samples)?;
        println!("✓ {} +{} samples", path.display(), samples.len());
    }
    Ok(())
}

fn _wander<T>(_: T) {}
