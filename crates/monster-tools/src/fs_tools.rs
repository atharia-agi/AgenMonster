//! Filesystem tools — read, write, list, search.

pub struct FsTools;

impl FsTools {
    pub fn read(path: &str) -> anyhow::Result<String> {
        Ok(std::fs::read_to_string(path)?)
    }

    pub fn write(path: &str, content: &str) -> anyhow::Result<()> {
        std::fs::write(path, content)?;
        Ok(())
    }

    pub fn list_dir(path: &str) -> anyhow::Result<Vec<String>> {
        Ok(std::fs::read_dir(path)?
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect())
    }

    pub fn exists(path: &str) -> bool {
        std::path::Path::new(path).exists()
    }
}
