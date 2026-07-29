/// Build helper — checks the workspace builds cleanly and runs tests.

use anyhow::Result;
use tokio::process::Command;

#[tokio::main]
async fn main() -> Result<()> {
    let status = Command::new("cargo")
        .args(["test", "--workspace", "--locked", "--quiet"])
        .status()
        .await?
        .code()
        .unwrap_or(-1);
    println!("exit={}", status);
    Ok(())
}
