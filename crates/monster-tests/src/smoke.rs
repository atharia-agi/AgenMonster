//! Smoke tests — quick checks that core types compile and work.

#[cfg(test)]
mod tests {
    use monster_core::types::{Stage, PetState};

    #[test]
    fn stage_parse_roundtrip() {
        for stage in Stage::all() {
            let s = stage.as_str();
            let parsed: Stage = s.parse().unwrap();
            assert_eq!(*stage, parsed);
        }
    }

    #[test]
    fn stage_next_chain() {
        let mut stage = Stage::Egg;
        for expected in &["hatchling", "baby", "child", "teen", "adult", "mega"] {
            stage = stage.next().unwrap();
            assert_eq!(stage.as_str(), *expected);
        }
        assert!(Stage::Mega.next().is_none());
    }

    #[test]
    fn stage_index() {
        assert_eq!(Stage::Egg.index(), 0);
        assert_eq!(Stage::Mega.index(), 6);
    }

    #[test]
    fn pet_state_default() {
        let state = PetState::default();
        assert_eq!(state.stage, Stage::Egg);
        assert_eq!(state.energy, 1000);
    }

    #[test]
    fn agen_config_default() {
        let cfg = monster_core::config::AgenConfig::default();
        assert_eq!(cfg.personality.stage, "egg");
        assert_eq!(cfg.energy.max, 1000);
    }

    #[test]
    fn agen_error_display() {
        let e = monster_core::error::AgenError::Bus("test".into());
        assert!(e.to_string().contains("bus error"));
    }
}
