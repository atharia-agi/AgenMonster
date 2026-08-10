// policyHabits — habit formation. After a successful experiment/task pattern, the
// creature forms a policy ("IF task==X THEN use approach Y") and strengthens it
// over repetitions. Not remembering every case individually, but forming routines.
// Pure + testable.

export interface Policy {
  id: string;
  trigger: string; // task pattern
  action: string; // preferred approach
  confidence: number; // 0..1, grows with use
  uses: number;
}

const GROWTH = 0.03;

export function createPolicy(trigger: string, action: string): Policy {
  return { id: `pol_${trigger}`, trigger, action, confidence: 0.5, uses: 0 };
}

export function reinforce(p: Policy): Policy {
  return {
    ...p,
    uses: p.uses + 1,
    confidence: Math.min(1, p.confidence + GROWTH),
  };
}

/** A small policy library backed by a Map. */
export class PolicyLibrary {
  private store = new Map<string, Policy>();
  add(trigger: string, action: string): Policy {
    const p = createPolicy(trigger, action);
    this.store.set(p.id, p);
    return p;
  }
  getFor(trigger: string): Policy | null {
    return this.store.get(`pol_${trigger}`) ?? null;
  }
  reinforce(trigger: string): Policy | null {
    const p = this.getFor(trigger);
    if (!p) return null;
    const r = reinforce(p);
    this.store.set(r.id, r);
    return r;
  }
  all(): Policy[] {
    return [...this.store.values()];
  }
}
