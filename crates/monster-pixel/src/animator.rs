//! Animation state machine — drives sprite frame cycling.

pub struct AnimState {
    pub current: String,
    pub frame: usize,
    pub elapsed_ms: u32,
    pub playing: bool,
    pub looped: bool,
}

impl AnimState {
    pub fn new(initial: &str) -> Self {
        Self {
            current: initial.to_string(),
            frame: 0,
            elapsed_ms: 0,
            playing: true,
            looped: false,
        }
    }

    pub fn tick(&mut self, delta_ms: u32, frame_durations: &[u32]) {
        if !self.playing || frame_durations.is_empty() {
            return;
        }
        self.elapsed_ms += delta_ms;
        let total: u32 = frame_durations.iter().sum();
        if total == 0 {
            return;
        }

        let mut acc = 0u32;
        for (i, dur) in frame_durations.iter().enumerate() {
            acc += dur;
            if self.elapsed_ms < acc {
                self.frame = i;
                return;
            }
        }
        // Loop
        self.elapsed_ms %= total;
        self.frame = 0;
        self.looped = true;
    }

    pub fn switch_to(&mut self, name: &str) {
        if self.current != name {
            self.current = name.to_string();
            self.frame = 0;
            self.elapsed_ms = 0;
            self.looped = false;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_anim_tick() {
        let mut anim = AnimState::new("idle");
        let durations = vec![100, 100, 100];
        anim.tick(50, &durations);
        assert_eq!(anim.frame, 0);
        anim.tick(60, &durations);
        assert_eq!(anim.frame, 1);
        anim.tick(200, &durations);
        assert_eq!(anim.frame, 0); // wraps: 310 % 300 = 10, frame 0
        assert!(anim.looped);
    }

    #[test]
    fn test_switch_to() {
        let mut anim = AnimState::new("idle");
        anim.switch_to("walk");
        assert_eq!(anim.current, "walk");
        assert_eq!(anim.frame, 0);
        anim.switch_to("walk"); // no-op
        assert_eq!(anim.frame, 0);
    }
}
