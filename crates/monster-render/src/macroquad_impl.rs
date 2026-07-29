#[cfg(feature = "macroquad_backend")]
use macroquad::prelude::*;

#[cfg(feature = "macroquad_backend")]
pub async fn run() -> anyhow::Result<()> {
    use macroquad::prelude::*;
    let mut conf = Conf::default();
    conf.window_width = 256;
    conf.window_height = 256;
    conf.window_resizable = false;
    conf.window_borderless = true;
    conf.transparent = true;
    conf.always_on_top = true;
    // Best-effort: WindowIcon ignored here, real binary sets it via tauri.
    run_mobile(conf, async move {
        loop {
            clear_background(Color::new(0.0, 0.0, 0.0, 0.0));
            draw_text("🐉", 110.0, 140.0, 100.0, WHITE);
            next_frame().await;
        }
    })
    .await;
    Ok(())
}

#[cfg(not(feature = "macroquad_backend"))]
pub async fn run() -> anyhow::Result<()> {
    Ok(())
}
