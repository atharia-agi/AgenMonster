//! Background animator — drives background frame cycling.

pub struct BgAnimator {
    frame: u32,
    speed: f32,
    pub pixel_data: Vec<u8>,
}

impl BgAnimator {
    pub fn new(speed: f32) -> Self {
        Self { frame: 0, speed, pixel_data: Vec::new() }
    }

    pub fn tick(&mut self, delta_ms: u32) {
        self.frame += (delta_ms as f32 / (1000.0 / self.speed)) as u32;
    }

    pub fn current_frame(&self) -> u32 {
        self.frame
    }

    pub fn reset(&mut self) {
        self.frame = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bg_animator() {
        let mut anim = BgAnimator::new(2.0);
        anim.tick(1000);
        assert!(anim.current_frame() > 0);
        anim.reset();
        assert_eq!(anim.current_frame(), 0);
    }
}
