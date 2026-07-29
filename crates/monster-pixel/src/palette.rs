//! Stage palette — hardcoded 7-color palettes for each evolution stage.
//!
//! Anti-glassmorphism: no alpha, no blur, no gradients.
//! Every color is fully opaque.

pub struct StagePalette {
    pub id: &'static str,
    pub name: &'static str,
    pub colors: [&'static str; 7],
}

pub const PALETTE_EGG: StagePalette = StagePalette {
    id: "egg",
    name: "Egg",
    colors: ["#0d1117", "#d2a8ff", "#58a6ff", "#e6edf3", "#484f58", "#f0e68c", "#ff6b6b"],
};

pub const PALETTE_HATCHLING: StagePalette = StagePalette {
    id: "hatchling",
    name: "Hatchling",
    colors: ["#0d1117", "#7ee787", "#58a6ff", "#e6edf3", "#484f58", "#ffd700", "#ff6b6b"],
};

pub const PALETTE_BABY: StagePalette = StagePalette {
    id: "baby",
    name: "Baby",
    colors: ["#0d1117", "#ff9a9e", "#a18cd1", "#e6edf3", "#484f58", "#fad0c4", "#ff6b6b"],
};

pub const PALETTE_CHILD: StagePalette = StagePalette {
    id: "child",
    name: "Child",
    colors: ["#0d1117", "#66d9ef", "#a6e22e", "#e6edf3", "#484f58", "#e6db74", "#ff6b6b"],
};

pub const PALETTE_TEEN: StagePalette = StagePalette {
    id: "teen",
    name: "Teen",
    colors: ["#0d1117", "#ae81ff", "#f92672", "#e6edf3", "#484f58", "#a6e22e", "#ff6b6b"],
};

pub const PALETTE_ADULT: StagePalette = StagePalette {
    id: "adult",
    name: "Adult",
    colors: ["#0d1117", "#e6db74", "#66d9ef", "#e6edf3", "#484f58", "#fd971f", "#ff6b6b"],
};

pub const PALETTE_MEGA: StagePalette = StagePalette {
    id: "mega",
    name: "Mega",
    colors: ["#0d1117", "#ffd700", "#00ffff", "#e6edf3", "#484f58", "#ff6b6b", "#ff00ff"],
};

pub fn palette_for_stage(stage: &str) -> &'static StagePalette {
    match stage {
        "egg" => &PALETTE_EGG,
        "hatchling" => &PALETTE_HATCHLING,
        "baby" => &PALETTE_BABY,
        "child" => &PALETTE_CHILD,
        "teen" => &PALETTE_TEEN,
        "adult" => &PALETTE_ADULT,
        "mega" => &PALETTE_MEGA,
        _ => &PALETTE_EGG,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_palette_count() {
        assert_eq!(PALETTE_EGG.colors.len(), 7);
        assert_eq!(PALETTE_MEGA.colors.len(), 7);
    }

    #[test]
    fn test_palette_lookup() {
        assert_eq!(palette_for_stage("egg").id, "egg");
        assert_eq!(palette_for_stage("mega").id, "mega");
        assert_eq!(palette_for_stage("invalid").id, "egg");
    }
}
