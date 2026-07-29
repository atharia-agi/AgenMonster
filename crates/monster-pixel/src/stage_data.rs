//! Sprite metadata — per-stage sprite definitions.
//!
//! Each stage defines: body shape, wings, weapon, accent dots, crown.
//! This drives the programmatic renderer and maps to Aseprite sprite sheets.

use std::collections::HashMap;

pub struct SpriteDef {
    pub id: &'static str,
    pub body_scale: f32,
    pub has_wings: bool,
    pub has_crown: bool,
    pub wing_style: &'static str,
    pub weapon_style: &'static str,
    pub accent_dots: u32,
}

pub const SPRITE_EGG: SpriteDef = SpriteDef {
    id: "egg", body_scale: 0.8,
    has_wings: false, has_crown: false,
    wing_style: "none", weapon_style: "none",
    accent_dots: 2,
};

pub const SPRITE_HATCHLING: SpriteDef = SpriteDef {
    id: "hatchling", body_scale: 1.0,
    has_wings: false, has_crown: false,
    wing_style: "nubs", weapon_style: "none",
    accent_dots: 3,
};

pub const SPRITE_BABY: SpriteDef = SpriteDef {
    id: "baby", body_scale: 1.0,
    has_wings: true, has_crown: false,
    wing_style: "small", weapon_style: "none",
    accent_dots: 4,
};

pub const SPRITE_CHILD: SpriteDef = SpriteDef {
    id: "child", body_scale: 1.1,
    has_wings: true, has_crown: false,
    wing_style: "growing", weapon_style: "wand",
    accent_dots: 5,
};

pub const SPRITE_TEEN: SpriteDef = SpriteDef {
    id: "teen", body_scale: 1.2,
    has_wings: true, has_crown: false,
    wing_style: "full", weapon_style: "sword",
    accent_dots: 6,
};

pub const SPRITE_ADULT: SpriteDef = SpriteDef {
    id: "adult", body_scale: 1.3,
    has_wings: true, has_crown: false,
    wing_style: "majestic", weapon_style: "staff",
    accent_dots: 8,
};

pub const SPRITE_MEGA: SpriteDef = SpriteDef {
    id: "mega", body_scale: 1.5,
    has_wings: true, has_crown: true,
    wing_style: "cosmic", weapon_style: "scepter",
    accent_dots: 10,
};

pub fn sprite_for_stage(stage: &str) -> &'static SpriteDef {
    match stage {
        "egg" => &SPRITE_EGG,
        "hatchling" => &SPRITE_HATCHLING,
        "baby" => &SPRITE_BABY,
        "child" => &SPRITE_CHILD,
        "teen" => &SPRITE_TEEN,
        "adult" => &SPRITE_ADULT,
        "mega" => &SPRITE_MEGA,
        _ => &SPRITE_EGG,
    }
}

pub fn all_sprite_defs() -> HashMap<&'static str, &'static SpriteDef> {
    let mut m = HashMap::new();
    m.insert("egg", &SPRITE_EGG);
    m.insert("hatchling", &SPRITE_HATCHLING);
    m.insert("baby", &SPRITE_BABY);
    m.insert("child", &SPRITE_CHILD);
    m.insert("teen", &SPRITE_TEEN);
    m.insert("adult", &SPRITE_ADULT);
    m.insert("mega", &SPRITE_MEGA);
    m
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sprite_defs() {
        assert_eq!(SPRITE_EGG.body_scale, 0.8);
        assert!(!SPRITE_EGG.has_wings);
        assert_eq!(SPRITE_MEGA.wing_style, "cosmic");
        assert!(SPRITE_MEGA.has_crown);
    }

    #[test]
    fn test_sprite_lookup() {
        assert_eq!(sprite_for_stage("teen").body_scale, 1.2);
        assert_eq!(sprite_for_stage("mega").accent_dots, 10);
        assert_eq!(sprite_for_stage("invalid").id, "egg");
    }
}
