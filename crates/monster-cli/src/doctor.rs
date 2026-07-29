//! CLI doctor — checks system health.

pub struct Doctor;

impl Doctor {
    pub fn check_all() -> Vec<String> {
        let mut issues = Vec::new();
        if std::env::var("HOME").is_err() && std::env::var("USERPROFILE").is_err() {
            issues.push("No HOME/USERPROFILE set".into());
        }
        issues
    }

    pub fn print_report() {
        let issues = Self::check_all();
        if issues.is_empty() {
            println!("[doctor] All checks passed");
        } else {
            for issue in &issues {
                println!("[doctor] WARNING: {issue}");
            }
        }
    }
}
