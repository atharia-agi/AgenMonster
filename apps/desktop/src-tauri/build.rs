// Tauri build.rs — embeds Windows EXE metadata (version info, company, copyright).
// Uses MinGW windres when available; skips cleanly on non-Windows or missing tool.

#[cfg(target_os = "windows")]
fn embed_windows_metadata() {
    use std::path::PathBuf;

    let manifest_dir: PathBuf = [env!("CARGO_MANIFEST_DIR")].iter().collect();
    let rc_path = manifest_dir.join("app.rc");
    let out_dir = match std::env::var("OUT_DIR") {
        Ok(d) => PathBuf::from(d),
        Err(_) => return,
    };
    let res_path = out_dir.join("app.res");

    if !rc_path.exists() {
        println!("cargo:warning=app.rc not found, skipping Windows metadata embedding");
        return;
    }

    let windres_candidates = [
        "x86_64-w64-mingw32-windres",
        "aarch64-w64-mingw32-windres",
        "windres",
    ];

    let windres = windres_candidates.iter().find(|&&tool| {
        std::process::Command::new(tool)
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    });

    let Some(tool) = windres else {
        println!("cargo:warning=windres not found, skipping Windows metadata embedding");
        return;
    };

    let status = std::process::Command::new(tool)
        .arg(&rc_path)
        .arg("-o")
        .arg(&res_path)
        .arg("-O")
        .arg("coff")
        .status();

    match status {
        Ok(s) if s.success() => {
            println!("cargo:rustc-link-arg={}", res_path.display());
            println!("cargo:warning=Embedded Windows metadata from app.rc");
        }
        _ => {
            println!("cargo:warning=windres failed to compile app.rc");
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn embed_windows_metadata() {}

fn main() {
    tauri_build::build();
    embed_windows_metadata();
}
