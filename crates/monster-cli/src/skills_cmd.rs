use clap::Subcommand;
use anyhow::Result;
use std::path::{Path, PathBuf};

#[derive(Subcommand)]
pub enum SkillsCmd {
    /// List skills discovered on disk.
    List,
    /// Validate every SKILL.md in the registry (id, description, body).
    Validate,
    /// Print a skill body to stdout.
    Show { id: String },
    /// Open the skill's directory in the system file manager.
    Open { id: String },
    /// Sign a skill body with an Ed25519 keypair, then install it.
    SignInstall {
        skill_id: String,
        path: String,
        /// base64 secret key
        #[arg(long)] key_b64: String,
    },
}

pub fn handle(cmd: SkillsCmd) -> Result<()> {
    match cmd {
        SkillsCmd::List => list(),
        SkillsCmd::Validate => validate(),
        SkillsCmd::Show { id } => show(&id),
        SkillsCmd::Open { id } => open(&id),
        SkillsCmd::SignInstall { skill_id, path, key_b64 } => sign_install(&skill_id, Path::new(&path), &key_b64),
    }
}

fn skill_dir() -> PathBuf {
    std::env::var("AGENMONSTER_SKILLS").map(PathBuf::from).unwrap_or_else(|_| {
        let mut p = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME")).unwrap_or_else(|_| ".".into());
        p.push(".config");
        p.push("agenmonster");
        p.push("skills");
        p
    })
}

fn list() -> Result<()> {
    let dir = skill_dir();
    if !dir.exists() {
        println!("(no skill dir yet: {})", dir.display());
        return Ok(());
    }
    for entry in std::fs::read_dir(&dir).unwrap() {
        let e = entry?;
        if e.path().is_dir() {
            println!("  {}", e.file_name().to_string_lossy());
        }
    }
    Ok(())
}

fn validate() -> Result<()> {
    use monster_evolve::SkillLoader;
    let dir = skill_dir();
    if !dir.exists() { return Ok(()); }
    let mut ok = 0;
    let mut err = 0;
    for path in SkillLoader::discover(&dir) {
        match SkillLoader::parse_file(&path) {
            Ok(_) => { println!("✓ {}", path.display()); ok += 1; }
            Err(e) => { println!("✗ {} — {e}", path.display()); err += 1; }
        }
    }
    println!("Summary: {ok} OK, {err} errors");
    Ok(())
}

fn show(id: &str) -> Result<()> {
    let path = skill_dir().join(id).join("SKILL.md");
    let s = std::fs::read_to_string(&path)?;
    println!("{}", s);
    Ok(())
}

fn open(id: &str) -> Result<()> {
    let dir = skill_dir().join(id);
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&dir).spawn()?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&dir).spawn()?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&dir).spawn()?;
    Ok(())
}

fn sign_install(id: &str, path: &Path, key_b64: &str) -> Result<()> {
    use base64_simd::Base64;
    use ed25519_dalek::SigningKey;

    let body = std::fs::read_to_string(path).unwrap_or_default();
    let key_bytes = Base64::default().decode_to_vec(key_b64.as_bytes())?;
    if key_bytes.len() != 32 { anyhow::bail!("ed25519 secret key must be 32 bytes"); }
    let bytes_arr: [u8; 32] = key_bytes.clone().try_into().unwrap();
    let key = SigningKey::from_bytes(&bytes_arr);
    let sig = key.sign(body.as_bytes());
    let pubkey = key.verifying_key();
    let sig_b64 = Base64::default().encode_to_string(sig.to_bytes());
    let pub_b64 = Base64::default().encode_to_string(pubkey.to_bytes());

    println!("Skill       : {id}");
    println!("Signature   : {sig_b64}");
    println!("Public key  : {pub_b64}");
    println!("To publish, save these into SkillManifest front-matter before upload.");
    Ok(())
}
