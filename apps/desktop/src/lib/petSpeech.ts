// PetSpeech Coalescing — the single gate for autonomous pet-initiated speech.
// Prevents the "greeting loop": dailyLife, proactivity, monologue, wakeup and
// world narration all dispatch `pet-initiate`. Without a cooldown + dedup they
// spam the chat with near-identical greetings every few minutes.
//
// Rules:
//  - Identical consecutive message => dropped (exact dedup).
//  - Global cooldown: only one autonomous pet message every N ms (default 90s).
//  - Quiet hours: the pet won't initiate speech while the tab is hidden.
const COOLDOWN_MS = 90_000;
let lastTs = 0;
let lastMsg = '';

export function shouldSpeak(text: string, now = Date.now()): boolean {
  const norm = (text ?? '').trim();
  if (!norm) return false;

  // If nothing has spoken before AND this is effectively the first message,
  // allow it so a fresh session still gets a hello.
  const firstEver = lastTs === 0;
  const dedup = norm !== lastMsg;
  const cooled = now - lastTs >= COOLDOWN_MS;

  const ok = firstEver ? dedup : dedup && cooled;
  if (ok) {
    lastTs = now;
    lastMsg = norm;
  }
  return ok;
}

export function resetSpeechCooldown(): void {
  lastTs = 0;
  lastMsg = '';
}