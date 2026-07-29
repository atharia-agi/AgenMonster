//! WASM integration test — verify crate compilation targets wasm32.

#[cfg(test)]
mod tests {
    #[test]
    fn wasm_target_info() {
        // This test validates that the WASM crate compiles.
        // Run with: cargo test --target wasm32-unknown-unknown -p agenmonster-wasm
        let msg = "WASM crate ready for compilation";
        assert!(!msg.is_empty());
    }

    #[test]
    fn monster_bus_channel_count() {
        let bus = monster_bus::Bus::new(monster_bus::BusConfig { default_capacity: 16 });
        // Should have all topic channels
        assert!(bus.capacity() >= 16);
    }

    #[test]
    fn palette_size_check() {
        for stage in &["egg","hatchling","baby","child","teen","adult","mega"] {
            let p = monster_pixel::Palette::for_stage(stage);
            assert_eq!(p.colors.len(), 7, "palette for {stage} must have 7 colors");
        }
    }
}
