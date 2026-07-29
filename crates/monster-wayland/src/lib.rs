//! Core Wayland integration — gtk4-layer-shell for transparent overlay on Wayland.

#[cfg(target_os = "linux")]
pub mod gtk4_layer;

#[cfg(not(target_os = "linux"))]
pub mod noop {
    pub struct WaylandOverlay;
    impl WaylandOverlay {
        pub fn new(_title: &str, _width: u32, _height: u32) -> Self { Self }
        pub fn run(&self) -> anyhow::Result<()> { Ok(()) }
        pub fn set_position(&self, _x: i32, _y: i32) -> anyhow::Result<()> { Ok(()) }
    }
}

#[cfg(target_os = "linux")]
pub use gtk4_layer::WaylandOverlay;
#[cfg(not(target_os = "linux"))]
pub use noop::WaylandOverlay;
