//! Tile patterns — procedural backgrounds for each stage.

use std::collections::HashMap;

pub struct TilePattern {
    pub name: &'static str,
    pub size: u32,
    pub pixels: Vec<Vec<bool>>,
}

fn make_egg_dots() -> TilePattern {
    let size = 8;
    let mut pixels = vec![vec![false; size as usize]; size as usize];
    pixels[0][0] = true;
    pixels[0][4] = true;
    pixels[4][0] = true;
    pixels[4][4] = true;
    TilePattern {
        name: "egg_dots",
        size,
        pixels,
    }
}

fn make_grass_blades() -> TilePattern {
    let size = 8;
    let mut pixels = vec![vec![false; size as usize]; size as usize];
    pixels[6][1] = true;
    pixels[7][1] = true;
    pixels[5][3] = true;
    pixels[6][3] = true;
    pixels[7][3] = true;
    pixels[6][5] = true;
    pixels[7][5] = true;
    TilePattern {
        name: "grass_blades",
        size,
        pixels,
    }
}

fn make_wave_crest() -> TilePattern {
    let size = 8;
    let mut pixels = vec![vec![false; size as usize]; size as usize];
    for x in 0..size {
        let y = 4 + ((x as f32 * 0.8).sin() * 1.5) as i32;
        if y >= 0 && y < size as i32 {
            pixels[y as usize][x as usize] = true;
        }
    }
    TilePattern {
        name: "wave_crest",
        size,
        pixels,
    }
}

fn make_mist_dots() -> TilePattern {
    let size = 16;
    let mut pixels = vec![vec![false; size as usize]; size as usize];
    pixels[4][2] = true;
    pixels[4][3] = true;
    pixels[5][2] = true;
    pixels[5][3] = true;
    pixels[8][10] = true;
    pixels[8][11] = true;
    pixels[8][12] = true;
    TilePattern {
        name: "mist_dots",
        size,
        pixels,
    }
}

fn make_heart_tile() -> TilePattern {
    let size = 8;
    let mut pixels = vec![vec![false; size as usize]; size as usize];
    pixels[1][1] = true;
    pixels[1][2] = true;
    pixels[1][5] = true;
    pixels[1][6] = true;
    pixels[2][0] = true;
    pixels[2][1] = true;
    pixels[2][2] = true;
    pixels[2][3] = true;
    pixels[2][4] = true;
    pixels[2][5] = true;
    pixels[2][6] = true;
    pixels[2][7] = true;
    pixels[3][1] = true;
    pixels[3][2] = true;
    pixels[3][3] = true;
    pixels[3][4] = true;
    pixels[3][5] = true;
    pixels[3][6] = true;
    pixels[4][2] = true;
    pixels[4][3] = true;
    pixels[4][4] = true;
    pixels[4][5] = true;
    pixels[5][3] = true;
    pixels[5][4] = true;
    pixels[6][4] = true;
    TilePattern {
        name: "heart_tile",
        size,
        pixels,
    }
}

fn make_sun_dots() -> TilePattern {
    let size = 16;
    let mut pixels = vec![vec![false; size as usize]; size as usize];
    for i in 0..8 {
        let angle = (i as f32 / 8.0) * std::f32::consts::PI * 2.0;
        let x = 8.0 + angle.cos() * 5.0;
        let y = 8.0 + angle.sin() * 5.0;
        if x >= 0.0 && x < size as f32 && y >= 0.0 && y < size as f32 {
            pixels[y as usize][x as usize] = true;
        }
    }
    TilePattern {
        name: "sun_dots",
        size,
        pixels,
    }
}

fn make_aurora_wave() -> TilePattern {
    let size = 16;
    let mut pixels = vec![vec![false; size as usize]; size as usize];
    for x in 0..size {
        let y = 6 + ((x as f32 * 0.5).sin() * 2.0) as i32;
        if y >= 0 && y < size as i32 {
            pixels[y as usize][x as usize] = true;
        }
    }
    TilePattern {
        name: "aurora_wave",
        size,
        pixels,
    }
}

pub fn all_patterns() -> HashMap<&'static str, TilePattern> {
    let mut m = HashMap::new();
    for p in vec![
        make_egg_dots(),
        make_grass_blades(),
        make_wave_crest(),
        make_mist_dots(),
        make_heart_tile(),
        make_sun_dots(),
        make_aurora_wave(),
    ] {
        m.insert(p.name, p);
    }
    m
}

pub fn pattern_for_stage(stage: &str) -> &'static str {
    match stage {
        "egg" => "egg_dots",
        "hatchling" => "grass_blades",
        "baby" => "wave_crest",
        "child" => "mist_dots",
        "teen" => "heart_tile",
        "adult" => "sun_dots",
        "mega" => "aurora_wave",
        _ => "egg_dots",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_patterns() {
        assert_eq!(all_patterns().len(), 7);
    }

    #[test]
    fn test_stage_mapping() {
        assert_eq!(pattern_for_stage("egg"), "egg_dots");
        assert_eq!(pattern_for_stage("teen"), "heart_tile");
        assert_eq!(pattern_for_stage("mega"), "aurora_wave");
        assert_eq!(pattern_for_stage("invalid"), "egg_dots");
    }
}
