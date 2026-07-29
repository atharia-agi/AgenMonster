#[cfg(feature = "raylib_backend")]
pub async fn run() -> anyhow::Result<()> {
    use raylib::prelude::*;
    let (mut rl, thread) = init()
        .size(256, 256)
        .title("AgenMonster")
        .transparent()
        .undecorated()
        .always_on_top()
        .build();
    while !rl.window_should_close() {
        let mut d = rl.begin_drawing(&thread);
        d.clear_background(Color::new(0, 0, 0, 0));
        d.draw_text("🐉", 110, 140, 100, Color::WHITE);
    }
    Ok(())
}

#[cfg(not(feature = "raylib_backend"))]
pub async fn run() -> anyhow::Result<()> {
    Ok(())
}
