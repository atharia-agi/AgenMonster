#!/usr/bin/env bash
# scripts/dev.sh — convenience runner.
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-desktop}" in
  format) cargo fmt --all ;;
  clippy) cargo clippy --workspace --all-targets -- -D warnings ;;
  test)   cargo test --workspace  ;;
  build)  cargo build --workspace ;;
  desktop) cargo run -p agenmonster-desktop --release ;;
  cli)    shift; cargo run -p monster-cli -- "$@" ;;
  flutter)
    command -v flutter >/dev/null || { echo "no flutter"; exit 1; }
    cd apps/mobile
    flutter pub get
    flutter run "${@:2}"
    ;;
  emu)    docker compose -f config/docker-compose.dev.yaml up ;;
  *) echo "usage: $0 [format|clippy|test|build|desktop|cli|flutter|emu]"; exit 1 ;;
esac
