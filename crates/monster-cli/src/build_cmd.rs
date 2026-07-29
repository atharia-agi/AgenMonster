use clap::Subcommand;
use anyhow::{Context, Result};
use std::process::Command;

#[derive(Subcommand)]
pub enum BuildCmd {
    /// Run quick checks: fmt, clippy, tests.
    Verify,
    /// Dev mode: serve Svelte via vite, run Tauri dev.
    Dev,
    /// Cargo build --workspace && flutter build apk.
    Build {
        #[arg(long)] release: bool,
    },
    /// Tag-and-publish release.
    Release {
        version: Option<String>,
    },
}

pub fn handle(cmd: BuildCmd) -> Result<()> {
    match cmd {
        BuildCmd::Verify => verify(),
        BuildCmd::Dev => dev(),
        BuildCmd::Build { release } => build(release),
        BuildCmd::Release { version } => release(version.as_deref()),
    }
}

fn run(cmd: &str, args: &[&str]) -> Result<()> {
    let s = Command::new(cmd).args(args).output().with_context(|| format!("spawn {cmd}"))?;
    if !s.status.success() {
        anyhow::bail!("{cmd} failed: {}", String::from_utf8_lossy(&s.stderr));
    }
    Ok(())
}

pub fn verify() -> Result<()> {
    println!("→ cargo fmt --check");
    run("cargo", &["fmt", "--all", "--", "--check"])?;
    println!("→ cargo clippy");
    run("cargo", &["clippy", "--workspace", "--all-targets", "--", "-D", "warnings"])?;
    println!("→ cargo test");
    run("cargo", &["test", "--workspace"])?;
    println!("→ flutter analyze");
    let cwd = std::env::current_dir()?.join("apps/mobile");
    std::env::set_current_dir(&cwd).ok();
    if which::which("flutter").is_ok() {
        run("flutter", &["analyze"])?;
        run("flutter", &["test"])?;
    } else {
        println!("  (flutter missing, skipped)");
    }
    println!("OK");
    Ok(())
}

pub fn dev() -> Result<()> {
    // Tauri-dev runner: cargo tauri dev. Falls back to plain `cargo run`.
    if which::which("cargo-tauri").is_ok() {
        run("cargo", &["tauri", "dev"])?;
    } else {
        println!("(install `cargo install tauri-cli` for full Tauri dev)");
        run("cargo", &["run", "-p", "agenmonster-desktop"])?;
    }
    Ok(())
}

pub fn build(release: bool) -> Result<()> {
    let profile = if release { "--release" } else { "" };
    println!("→ cargo build --workspace {profile}");
    run("cargo", &["build", "--workspace", profile].into_iter().filter(|s| !s.is_empty()).collect::<Vec<_>>().as_slice())?;
    Ok(())
}

pub fn release(version: Option<&str>) -> Result<()> {
    let v = if let Some(v) = version { v.to_string() } else {
        // bump patch on CHANGELOG.md
        let ch = std::fs::read_to_string("CHANGELOG.md").unwrap_or_default();
        let v = ch.lines().find_map(|l| l.find("## [").map(|i| &l[i+5..])).unwrap_or("0.1.0");
        v.trim_end_matches(']').to_string()
    };
    println!("→ git tag v{v}");
    run("git", &["tag", &format!("v{v}")])?;
    println!("→ bumping CHANGELOG.md");
    let mut ch = std::fs::read_to_string("CHANGELOG.md").unwrap_or_default();
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    ch.insert_str(0, &format!("## [{v}] — {today}\n\n"));
    std::fs::write("CHANGELOG.md", ch)?;
    println!("Done. Push with:");
    println!("  git push origin v{v}");
    Ok(())
}
