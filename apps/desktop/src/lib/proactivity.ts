export interface PetSnapshot {
  energy: number;
  lastInteractionTs: number;
  mood: string;
}

export function checkProactivity(
  pet: PetSnapshot,
  topics: string[],
  lastInitiativeTs: number,
  now = Date.now()
): string | null {
  if (now - lastInitiativeTs < 30 * 60 * 1000) return null;

  const idleMs = now - pet.lastInteractionTs;
  const idleH = idleMs / 3600000;

  if (pet.energy > 0.6 && idleH > 1) {
    return 'Hey, how\'s it going?';
  }
  if (pet.energy < 0.3 && idleH > 4) {
    return 'You\'ve been away a while -- come back when ready';
  }
  if (pet.mood === 'bored' && idleH > 2) {
    const top = topics;
    return top.length ? `Want to explore ${top[0]}?` : 'Want to explore something new?';
  }
  return null;
}

export interface ProactivityOptions {
  getPet: () => PetSnapshot;
  getTopics: () => string[];
  sendMessage: (message: string) => void;
  recordEvent: (event: { kind: string; title: string }) => void;
}

export function startProactivityTimer(opts: ProactivityOptions): { destroy: () => void; tick: () => void } {
  let lastInitiative = 0;

  const evaluate = () => {
    const pet = opts.getPet();
    const now = Date.now();
    const msg = checkProactivity(pet, opts.getTopics(), lastInitiative, now);
    if (msg) {
      lastInitiative = now;
      opts.sendMessage(msg);
      opts.recordEvent({ kind: 'success', title: 'pet-initiated' });
    }
  };

  const interval = setInterval(evaluate, 5 * 60 * 1000);
  return { destroy: () => clearInterval(interval), tick: evaluate };
}