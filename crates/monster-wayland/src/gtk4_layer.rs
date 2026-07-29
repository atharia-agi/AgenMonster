//! GTK4 Layer Shell integration for Wayland overlay windows.

pub struct WaylandOverlay {
    // GTK4 window handle (placeholder for actual gtk4-rs integration)
    title: String,
    width: u32,
    height: u32,
    x: i32,
    y: i32,
}

impl WaylandOverlay {
    pub fn new(title: &str, width: u32, height: u32) -> Self {
        Self {
            title: title.into(),
            width,
            height,
            x: 100,
            y: 100,
        }
    }

    pub fn run(&self) -> anyhow::Result<()> {
        tracing::info!(
            title = %self.title,
            width = self.width,
            height = self.height,
            "wayland overlay would launch (gtk4-layer-shell)"
        );
        // In production:
        // 1. gtk4::Application::new()
        // 2. gtk4_layer_shell::init_for_window()
        // 3. gtk4_layer_shell::set_layer(Layer::Overlay)
        // 4. gtk4_layer_shell::set_keyboard_interactivity(false)
        // 5. Set up drawing area with pixel-rendered content
        Ok(())
    }

    pub fn set_position(&mut self, x: i32, y: i32) {
        self.x = x;
        self.y = y;
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
    }
}
