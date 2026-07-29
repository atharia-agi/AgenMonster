---
name: monster-app-control
description: Cross-app execution layer: browser automation, OS GUI control, file ops, shell, mobile intents. Use whenever the agent needs to act in another app, click somewhere, type, scroll, open a URL, focus a window, drag a file, run a sandboxes-shell command, send a mobile intent, or perform Computer-Use style gestures. Triggers: any verb that ends in real-world effect ("send", "publish", "fill out", "log in", "click", "navigate"). DO NOT use for offline reasoning-only tasks.
---

# App & OS Control

The "effect layer" of the agent.

## Per-platform capabilities

| Surface       | Tool(s)                                     | Permission    |
|---------------|---------------------------------------------|---------------|
| Browser       | `browser.open_url`, `browser.click_selector`| Safe          |
|               | `browser.eval_js`, `browser.snapshot`       | Safe          |
| Local files   | `fs.read`, `fs.write`                       | LocalFile     |
| OS GUI        | `os.focus_window`, `computer.mouse_click`   | OsControl     |
|               | `computer.keyboard.tap`                     | OsControl     |
|               | `computer.snapshot` (screenshot + tree)     | OsControl     |
| Shell         | `os.shell_safe` (sandboxed)                 | SandboxedCode |
| Mobile intent | `mobile.open_app`                           | OsControl     |
| OTP detection | `mobile.listen_pending_otp` (Android only)  | OsControl     |

## Safety

- Always present a preview before clicking: snapshot → annotate → claude
  confirm.
- Reverse actions are always logged to `/telemetry/effect.log`.
- WebDriver / Playwright actions get 1-try redundancy with back-off.

## Auth-safe

- Do NOT type credentials directly into the browser session unless the
  user has explicitly signed in within the last hour.
- Prefer using:
  - `1password/cli` (if installed) via `os.shell_safe`
  - `pass-cli`
  - macOS keychain (only via signed helpers)

## Computer-Use loop

1. Click → screenshot → retry until target element visible
2. OCR + accessibility tree reconciliation
3. Decide: continue, escalate, or abort
