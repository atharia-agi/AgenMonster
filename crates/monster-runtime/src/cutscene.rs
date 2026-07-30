//! Cutscene — evolution transition animations.

pub struct Cutscene {
    pub from: String,
    pub to: String,
    pub duration_frames: u32,
    pub flash_text: String,
    pub particle_count: u32,
    pub current_frame: u32,
    pub active: bool,
}

pub struct CutsceneConfig {
    pub from: String,
    pub to: String,
    pub duration_frames: u32,
    pub flash_text: String,
    pub particle_count: u32,
}

pub fn get_cutscene_config(from: &str, to: &str) -> Option<CutsceneConfig> {
    match (from, to) {
        ("egg", "hatchling") => Some(CutsceneConfig {
            from: from.into(),
            to: to.into(),
            duration_frames: 32,
            flash_text: "HATCHED!".into(),
            particle_count: 40,
        }),
        ("hatchling", "baby") => Some(CutsceneConfig {
            from: from.into(),
            to: to.into(),
            duration_frames: 40,
            flash_text: "GROWING!".into(),
            particle_count: 50,
        }),
        ("baby", "child") => Some(CutsceneConfig {
            from: from.into(),
            to: to.into(),
            duration_frames: 40,
            flash_text: "LEARNING!".into(),
            particle_count: 50,
        }),
        ("child", "teen") => Some(CutsceneConfig {
            from: from.into(),
            to: to.into(),
            duration_frames: 48,
            flash_text: "POWER UP!".into(),
            particle_count: 60,
        }),
        ("teen", "adult") => Some(CutsceneConfig {
            from: from.into(),
            to: to.into(),
            duration_frames: 56,
            flash_text: "EVOLVED!".into(),
            particle_count: 70,
        }),
        ("adult", "mega") => Some(CutsceneConfig {
            from: from.into(),
            to: to.into(),
            duration_frames: 64,
            flash_text: "MEGA EVOLUTION!".into(),
            particle_count: 80,
        }),
        _ => None,
    }
}

impl Cutscene {
    pub fn start(config: CutsceneConfig) -> Self {
        Self {
            from: config.from,
            to: config.to,
            duration_frames: config.duration_frames,
            flash_text: config.flash_text,
            particle_count: config.particle_count,
            current_frame: 0,
            active: true,
        }
    }

    pub fn tick(&mut self) {
        if self.active {
            self.current_frame += 1;
            if self.current_frame >= self.duration_frames {
                self.active = false;
            }
        }
    }

    pub fn progress(&self) -> f32 {
        if self.duration_frames == 0 {
            return 1.0;
        }
        self.current_frame as f32 / self.duration_frames as f32
    }

    pub fn flash_visible(&self) -> bool {
        let p = self.progress();
        p > 0.4 && p < 0.8
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cutscene_configs() {
        assert!(get_cutscene_config("egg", "hatchling").is_some());
        assert!(get_cutscene_config("teen", "adult").is_some());
        assert!(get_cutscene_config("egg", "mega").is_none());
    }

    #[test]
    fn test_cutscene_lifecycle() {
        let cfg = get_cutscene_config("child", "teen").unwrap();
        let mut cs = Cutscene::start(cfg);
        assert!(cs.active);
        assert!(!cs.flash_visible());
        for _ in 0..48 {
            cs.tick();
        }
        assert!(!cs.active);
        assert_eq!(cs.progress(), 1.0);
    }
}
