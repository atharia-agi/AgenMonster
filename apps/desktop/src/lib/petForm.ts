// petForm — self-determined visual identity for the companion.
//
// The pet's visual form is NOT a fixed sprite. It is a DEGREE OF FREEDOM that
// the companion's internal state drives: emotional PAD shifts the aura and
// posture, crystallized skills unlock physical markers, causal lessons etch
// growth-rings, energy & closeness tune proportion. The same pet therefore
// re-forms over time as it learns — its look is an honest projection of its
// internal life rather than a static asset.
//
// Pure + testable: given a snapshot of internal state we return a stable,
// deterministic form descriptor. No DOM required.

export type PetPosture = 'dormant' | 'calm' | 'active' | 'excited' | 'fierce';

export interface PetFormSnapshot {
  /** Overall stage from the evolution engine (egg → mega). */
  stage: string;
  /** PAD pleasure (0..1). */
  pleasure: number;
  /** PAD activation / arousal (0..1). */
  activation: number;
  /** PAD dominance (0..1). */
  dominance: number;
  /** 0..1 depth of causal lessons the pet has grown into. */
  lessonDepth: number;
  /** 0..1 fraction of skills mastered. */
  mastery: number;
  /** 0..1 energy (low = dormant glow, high = vibrant). */
  energy: number;
  /** 0..1 relationship closeness. */
  closeness: number;
}

export interface PetForm {
  palette: {
    base: string;
    accent: string;
    aura: string;
  };
  /** 0..1 — how sharp / aggressive the silhouette is. */
  ferocity: number;
  /** 0..1 — how elaborate the form is (growth). */
  elaboration: number;
  /** 0..1 — brightness / vibrancy. */
  luminosity: number;
  /** Extra visual markers the pet earned through mastery/lessons. */
  markers: string[];
  /** Current posture label the surface renders. */
  posture: PetPosture;
  /** Tone label for the UI / prompt. */
  toneLabel: string;
  /** Deterministic hue (0..360) derived from emotion + mastery. */
  hue: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Build a deterministic visual form from internal state.
 */
export function deriveForm(state: PetFormSnapshot): PetForm {
  const posture = pickPosture(state);
  const hue = deriveHue(state);
  const ferocity = clamp01((1 - state.pleasure) * 0.6 + state.activation * 0.4);
  const elaboration = clamp01(0.25 + state.lessonDepth * 0.5 + state.mastery * 0.65);
  const luminosity = clamp01(state.energy * 0.7 + state.closeness * 0.3);
  const accent = buildColor((hue + 40) % 360, 0.85, 62);
  const base = buildColor(hue, 0.7, 35);
  const aura = buildColor((hue + 180 + state.mastery * 180) % 360, 0.75, 45);
  const markers = collectMarkers(state);

  let toneLabel: string;
  switch (posture) {
    case 'dormant': toneLabel = 'dozy & quiet'; break;
    case 'fierce': toneLabel = 'fierce & urgent'; break;
    case 'excited': toneLabel = 'bright & playful'; break;
    case 'active': toneLabel = 'steady & working'; break;
    default: toneLabel = 'calm & present'; break;
  }

  return {
    palette: { base, accent, aura },
    ferocity,
    elaboration,
    luminosity,
    markers,
    posture,
    toneLabel,
    hue,
  };
}

function pickPosture(s: PetFormSnapshot): PetPosture {
  if (s.energy < 0.18) return 'dormant';
  if (s.activation > 0.75 && s.pleasure < 0.45) return 'fierce';
  if (s.activation > 0.75) return 'excited';
  if (s.activation > 0.45) return 'active';
  return 'calm';
}

function deriveHue(s: PetFormSnapshot): number {
  // Pleasure pulls warm, activation lifts bright, mastery couples to a
  // secondary cold hue. Deterministic — same state always maps to same form.
  return Math.round((s.pleasure * 160 + s.activation * 80 + s.mastery * 120) % 360);
}

function buildColor(hue: number, saturation: number, lightness: number): string {
  return `hsl(${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness)}%)`;
}

function collectMarkers(s: PetFormSnapshot): string[] {
  const markers: string[] = [];
  if (s.lessonDepth > 0.5) markers.push('growth-rings');
  if (s.mastery > 0.6) markers.push('skill-glyphs');
  if (s.closeness > 0.7) markers.push('companion-bond');
  if (s.energy < 0.25) markers.push('slumber-bloom');
  return markers;
}

const PET_FORM_KEY = 'agenmonster_pet_form';

/** Persist the current visual form so evolution survives reload (permanent growth). */
export function persistPetForm(form: PetForm): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PET_FORM_KEY, JSON.stringify(form));
  } catch {}
}

/** Load the last evolved form, or null if none / unavailable. */
export function loadPetForm(): PetForm | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PET_FORM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PetForm;
  } catch {
    return null;
  }
}
