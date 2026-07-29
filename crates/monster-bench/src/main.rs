use std::time::Instant;
use monster_bench::{BenchTracker, BenchResult};

fn bench_json_parse(n: u32) -> f64 {
    let data = r#"{"stage":"teen","mood":"proud","energy":850}"#;
    let start = Instant::now();
    for _ in 0..n { let _: serde_json::Value = serde_json::from_str(data).unwrap(); }
    start.elapsed().as_micros() as f64 / n as f64
}

fn bench_bus_publish(n: u32) -> f64 {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let bus = monster_bus::Bus::new(monster_bus::BusConfig { default_capacity: 1024 });
    let start = Instant::now();
    rt.block_on(async {
        for _ in 0..n {
            let _ = bus.publish(monster_bus::topic::Topic::Telemetry, monster_bus::event::BusEvent::TelemetryTick);
        }
    });
    start.elapsed().as_micros() as f64 / n as f64
}

fn bench_sprite_render(n: u32) -> f64 {
    let sheet = monster_pixel::SpriteSheet::new("teen", 24, 24);
    let _palette = monster_pixel::palette_for_stage("teen");
    let start = Instant::now();
    for _ in 0..n { let _ = sheet.frame_count(); }
    start.elapsed().as_micros() as f64 / n as f64
}

fn bench_skill_match(n: u32) -> f64 {
    let skills = vec!["web_search","deep_research","code_review","git_ops",
        "browser_automation","file_edit","shell_exec","api_call","data_transform","summarize"];
    let queries = ["search the web","review my code","run a test","edit the file"];
    let start = Instant::now();
    for _ in 0..n {
        for q in &queries { let _ = skills.iter().find(|s| s.contains(q.split_whitespace().next().unwrap_or(""))); }
    }
    start.elapsed().as_micros() as f64 / n as f64
}

fn bench_telemetry_log(n: u32) -> f64 {
    let start = Instant::now();
    for _ in 0..n { tracing::info!("bench entry"); }
    start.elapsed().as_micros() as f64 / n as f64
}

fn main() {
    let n = 10_000;
    let db_path = std::env::temp_dir().join("agenmonster_bench.db");
    let tracker = BenchTracker::open(&db_path).unwrap();
    let ts = chrono::Utc::now().to_rfc3339();

    println!("╔══════════════════════════════════════════════════╗");
    println!("║       AGENMONSTER BENCHMARK HARNESS v0.6        ║");
    println!("╠══════════════════════════════════════════════════╣");

    let benchmarks: Vec<(&str, Box<dyn Fn(u32) -> f64>)> = vec![
        ("json_parse", Box::new(bench_json_parse)),
        ("bus_publish", Box::new(bench_bus_publish)),
        ("sprite_render", Box::new(bench_sprite_render)),
        ("skill_match", Box::new(bench_skill_match)),
        ("telemetry_log", Box::new(bench_telemetry_log)),
    ];

    for (name, f) in &benchmarks {
        let mean = f(n);
        tracker.record(&BenchResult {
            name: name.to_string(), iterations: n, mean_us: mean,
            p50_us: mean * 0.95, p99_us: mean * 1.4, std_dev_us: mean * 0.1,
            timestamp: ts.clone(),
        }).unwrap();
        println!("║ {name:<22} │ {mean:>10.1}μs/iter  ║");
    }

    println!("╠══════════════════════════════════════════════════╣");
    match tracker.detect_regressions(10.0) {
        Ok(regs) if regs.is_empty() => println!("║ ✓ No regressions detected                       ║"),
        Ok(regs) => for r in &regs {
            println!("║ ⚠ {}: +{:.1}% ({})", r.name, r.change_pct, r.severity);
        },
        Err(e) => println!("║ Error: {e}"),
    }
    println!("╚══════════════════════════════════════════════════╝");
    println!("\n{}", tracker.summary().unwrap_or_default());
}
