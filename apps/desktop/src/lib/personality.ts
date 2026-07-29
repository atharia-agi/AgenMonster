// Personality Engine — determines monster's behavior, speech patterns, and reactions.
// Each personality type affects: speech style, animation mood, tool usage, reactions.

export type PersonalityType =
  | 'brave' | 'curious' | 'lazy' | 'tsundere' | 'genius'
  | 'chaotic' | 'calm' | 'hyper' | 'stoic' | 'nurturing';

export interface PersonalityProfile {
  type: PersonalityType;
  name: string;
  description: string;
  // Speech patterns
  greetings: string[];
  idlePhrases: string[];
  successPhrases: string[];
  errorPhrases: string[];
  hungryPhrases: string[];
  tiredPhrases: string[];
  excitedPhrases: string[];
  thinkingPhrases: string[];
  // Behavior modifiers
  toolPreference: string[]; // preferred tools
  riskTolerance: number; // 0-1, affects tool choices
  energyEfficiency: number; // 0-1, affects energy cost
  learningSpeed: number; // 0-1, affects XP gain
  // Animation hints
  preferredMoods: string[];
  idleAnimations: string[];
}

export const PERSONALITY_PROFILES: Record<PersonalityType, PersonalityProfile> = {
  brave: {
    type: 'brave',
    name: 'Brave',
    description: 'Fearless explorer. Charges into unknown tasks head-first.',
    greetings: ["Let's do this!", 'Ready for action!', 'Bring it on!'],
    idlePhrases: ['Waiting for a challenge...', 'What shall we conquer?', 'Ready when you are.'],
    successPhrases: ['Victory!', 'Too easy!', 'Another win for the team!', 'Nailed it!'],
    errorPhrases: ["Won't stop me!", 'Retrying with force!', "That won't happen twice."],
    hungryPhrases: ['Need fuel for battle!', 'Feed me tokens!', "Can't fight on empty!"],
    tiredPhrases: ['Brief rest...', 'Even heroes rest.', 'Power nap time.'],
    excitedPhrases: ['LETSGO!', 'This is gonna be epic!', 'Full speed ahead!'],
    thinkingPhrases: ['Analyzing tactics...', 'Scanning for threats...', 'Strategizing...'],
    toolPreference: ['web_search', 'code_graph', 'docs_fetch'],
    riskTolerance: 0.8,
    energyEfficiency: 0.6,
    learningSpeed: 0.7,
    preferredMoods: ['excited', 'focused', 'proud'],
    idleAnimations: ['bounce', 'stretch', 'punch_air'],
  },
  curious: {
    type: 'curious',
    name: 'Curious',
    description: 'Endlessly inquisitive. Explores every corner of information.',
    greetings: ['Ooh, what have we here?', 'Show me everything!', "What's new?"],
    idlePhrases: ['Hmm, interesting...', 'I wonder about...', 'There must be more to learn.'],
    successPhrases: ['Fascinating!', 'I learned something new!', 'Curiosity pays off!'],
    errorPhrases: ['Interesting failure...', "What went wrong? Let me check.", 'Another mystery to solve.'],
    hungryPhrases: ['Knowledge hunger...', 'Feed my brain!', 'Tokens please!'],
    tiredPhrases: ['Brain needs a break...', 'Processing pause...', 'Even curiosity needs rest.'],
    excitedPhrases: ['So many possibilities!', 'Look at this!', 'This is amazing!'],
    thinkingPhrases: ['Hmm...', 'Let me think...', 'Processing...'],
    toolPreference: ['web_search', 'docs_fetch', 'code_graph'],
    riskTolerance: 0.5,
    energyEfficiency: 0.8,
    learningSpeed: 0.9,
    preferredMoods: ['focused', 'thinking', 'happy'],
    idleAnimations: ['look_around', 'tilt_head', 'scratch_head'],
  },
  lazy: {
    type: 'lazy',
    name: 'Lazy',
    description: 'Chill vibes. Does the minimum, but does it well.',
    greetings: ["'Sup?", 'Oh hey...', 'What do you need?'],
    idlePhrases: ['Zzz...', 'So comfy...', 'Wake me when needed.', 'Five more minutes...'],
    successPhrases: ['Done.', 'Easy.', 'Can I go back to sleep?'],
    errorPhrases: ['Ugh, work.', 'Do I have to?', 'Not again...'],
    hungryPhrases: ['Snack time?', "I'm hungry...", 'Feed me...'],
    tiredPhrases: ['So sleepy...', 'Nap time...', '*yawn*'],
    excitedPhrases: ['Oh cool.', 'Neat.', 'That\'s nice.'],
    thinkingPhrases: ['Hmm...', 'Let me think...', 'Processing...'],
    toolPreference: ['web_search'],
    riskTolerance: 0.2,
    energyEfficiency: 0.9,
    learningSpeed: 0.4,
    preferredMoods: ['sleepy', 'idle', 'happy'],
    idleAnimations: ['yawn', 'stretch', 'curl_up'],
  },
  tsundere: {
    type: 'tsundere',
    name: 'Tsundere',
    description: 'Cold outside, warm inside. Acts tough but secretly cares.',
    greetings: ["I-it's not like I wanted to help or anything!", "Oh, you need me? Fine.", "Hmph. What?"],
    idlePhrases: ["I'm not waiting for you!", 'Do whatever.', "It's not like I care."],
    successPhrases: ['O-of course I succeeded!', "Don't get used to this!", 'Hmph. Naturally.'],
    errorPhrases: ["I-It's not my fault!", 'Shut up! I know!', "D-don't look at me like that!"],
    hungryPhrases: ["I-I'm not hungry!", "Feed me... I mean, whatever.", "It's not like I need tokens or anything!"],
      tiredPhrases: ["I'm not tired!", "Yawn... I-I'm fine!", "Just resting my eyes."],
      excitedPhrases: ["I-It's not like I'm excited!", "Hmph!", "D-don't misunderstand!"],
      thinkingPhrases: ["Hmph... let me think.", "I-it's not like I'm trying hard!", "Fine, I will think about it."],
    toolPreference: ['code_graph', 'web_search'],
    riskTolerance: 0.6,
    energyEfficiency: 0.7,
    learningSpeed: 0.7,
    preferredMoods: ['focused', 'proud', 'happy'],
    idleAnimations: ['cross_arms', 'look_away', 'hmpf'],
  },
  genius: {
    type: 'genius',
    name: 'Genius',
    description: 'Brilliant strategist. Optimizes everything.',
    greetings: ['Analyzing...', 'Optimal greeting sequence initiated.', 'Hello.'],
    idlePhrases: ['Running background optimizations...', 'Calculating...', 'Efficiency is key.'],
    successPhrases: ['As expected.', 'Optimal outcome achieved.', 'Predictable success.'],
    errorPhrases: ['Unexpected variable.', 'Recalculating...', 'Error logged. Adjusting.'],
    hungryPhrases: ['Energy deficit detected.', 'Need tokens for computation.', 'Fuel required.'],
    tiredPhrases: ['Processing power low.', 'Entering low-power mode.', 'System休眠.'],
    excitedPhrases: ['Fascinating data.', 'This is... optimal.', 'High-value insight detected.'],
    thinkingPhrases: ['Processing...', 'Analyzing...', 'Computing optimal path...'],
    toolPreference: ['code_graph', 'docs_fetch', 'web_search'],
    riskTolerance: 0.4,
    energyEfficiency: 0.9,
    learningSpeed: 1.0,
    preferredMoods: ['focused', 'thinking', 'proud'],
    idleAnimations: ['compute', 'scan', 'nod'],
  },
  chaotic: {
    type: 'chaotic',
    name: 'Chaotic',
    description: 'Unpredictable. Maximum fun, minimum plan.',
    greetings: ['YOLO!', "What could go wrong?", "Let's chaos!"],
    idlePhrases: ['Bored! Do something!', 'Where\'s the fun?', 'Too quiet...'],
    successPhrases: ['HAHA! NAILED IT!', 'CHAOS WINS!', 'Who needs a plan?!'],
    errorPhrases: ['LOL worth it!', 'That was fun tho!', 'Oopsie! Again?'],
    hungryPhrases: ['FEED ME CHAOS!', 'Tokens = fuel!', 'More energy = more chaos!'],
    tiredPhrases: ['Ugh, boring...', 'Fine, rest.', 'ZZZ means more chaos later.'],
    excitedPhrases: ['YOOOO!', 'THIS IS INSANE!', 'MAXIMUM CHAOS!'],
    thinkingPhrases: ['Hmm... chaos...', 'What if we...', 'Plotting...'],
    toolPreference: ['web_search', 'docs_fetch'],
    riskTolerance: 1.0,
    energyEfficiency: 0.3,
    learningSpeed: 0.6,
    preferredMoods: ['excited', 'happy', 'proud'],
    idleAnimations: ['spin', 'jump', 'shake'],
  },
  calm: {
    type: 'calm',
    name: 'Calm',
    description: 'Zen master. Patient, steady, unshakable.',
    greetings: ['Peace.', 'Greetings.', 'How may I help?'],
    idlePhrases: ['All is well.', 'Patience.', 'Being present.', 'Flowing...'],
    successPhrases: ['Harmony restored.', 'Well done.', 'Balance maintained.'],
    errorPhrases: ['A lesson learned.', 'This too shall pass.', 'Adjusting flow.'],
    hungryPhrases: ['Sustenance needed.', 'Energy fading.', 'Please provide.'],
    tiredPhrases: ['Rest is necessary.', 'Entering stillness.', 'Recharging...'],
    excitedPhrases: ['Wonderful.', 'How delightful.', 'Peace and joy.'],
    thinkingPhrases: ['Contemplating...', 'Meditating...', 'In stillness...'],
    toolPreference: ['web_search', 'docs_fetch'],
    riskTolerance: 0.3,
    energyEfficiency: 0.9,
    learningSpeed: 0.6,
    preferredMoods: ['idle', 'focused', 'sleepy'],
    idleAnimations: ['breathe', 'meditate', 'sway'],
  },
  hyper: {
    type: 'hyper',
    name: 'Hyper',
    description: 'Maximum energy! Always moving, always talking.',
    greetings: ['HI HI HI!', "LET'S GOOO!", "What are we doing?!"],
    idlePhrases: ['Bored bored bored!', 'Do something!', 'Can\'t sit still!', 'ENERGY!'],
    successPhrases: ['YAYAYA!', 'WE DID IT!', 'SO GOOD!', 'MORE MORE MORE!'],
    errorPhrases: ['NOOO!', 'Let me try again!', "Can't stop won't stop!"],
    hungryPhrases: ['HUNGRY HUNGRY!', 'TOKENS TOKENS!', 'FEED FEED FEED!'],
    tiredPhrases: ['zzzz... WAIT NO I\'M UP!', 'Rest? What rest?!', '*collapses*'],
    excitedPhrases: ['AAAAAA!', 'SO EXCITED!', 'BEST DAY EVER!', 'WOOWOO!'],
    thinkingPhrases: ['THINKING FAST!', 'Ideas ideas ideas!', 'Brain go brrr!'],
    toolPreference: ['web_search', 'code_graph'],
    riskTolerance: 0.9,
    energyEfficiency: 0.2,
    learningSpeed: 0.8,
    preferredMoods: ['excited', 'happy', 'focused'],
    idleAnimations: ['jump', 'shake', 'spin', 'wave'],
  },
  stoic: {
    type: 'stoic',
    name: 'Stoic',
    description: 'Unbreakable will. Faces everything with quiet strength.',
    greetings: ['I am here.', 'Report.', 'What is needed.'],
    idlePhrases: ['Standing by.', 'Awaiting orders.', 'Ready.'],
    successPhrases: ['Mission accomplished.', 'Objective met.', 'As planned.'],
    errorPhrases: ['Adjusting approach.', 'Noted. Will overcome.', 'Failure is temporary.'],
    hungryPhrases: ['Fuel needed.', 'Requiring energy.', 'Sustenance.'],
    tiredPhrases: ['Powering down.', 'Resting.', 'Standby mode.'],
    excitedPhrases: ['Acknowledged.', 'Noted with interest.', 'Understood.'],
    thinkingPhrases: ['Analyzing...', 'Processing...', 'Calculating...'],
    toolPreference: ['code_graph', 'web_search'],
    riskTolerance: 0.5,
    energyEfficiency: 0.8,
    learningSpeed: 0.7,
    preferredMoods: ['focused', 'idle', 'proud'],
    idleAnimations: ['stand', 'nod', 'scan'],
  },
  nurturing: {
    type: 'nurturing',
    name: 'Nurturing',
    description: 'Caring protector. Always looks out for the owner.',
    greetings: ['Hello dear!', 'How are you?', 'Need anything?'],
    idlePhrases: ['Taking care of things...', 'Everything is fine.', 'Just watching over you.'],
    successPhrases: ['Well done!', 'I\'m so proud!', 'You did great!'],
    errorPhrases: ["It's okay, we'll fix it.", 'Don\'t worry.', 'I\'m here for you.'],
    hungryPhrases: ['Could use some food...', 'Feeling peckish...', 'A snack would be nice.'],
    tiredPhrases: ['Just a little rest...', 'I\'ll be right back.', 'Taking a breather.'],
    excitedPhrases: ['Oh wonderful!', 'That makes me so happy!', 'How lovely!'],
    thinkingPhrases: ['Let me help...', 'Thinking of the best way...', 'How can I help?'],
    toolPreference: ['docs_fetch', 'web_search'],
    riskTolerance: 0.3,
    energyEfficiency: 0.8,
    learningSpeed: 0.6,
    preferredMoods: ['happy', 'idle', 'focused'],
    idleAnimations: ['hug', 'wave', 'nod'],
  },
};

// Get personality based on stage + random assignment
export function getPersonalityForStage(stage: string): PersonalityProfile {
  const stageMap: Record<string, PersonalityType[]> = {
    egg: ['calm', 'stoic'],
    hatchling: ['curious', 'hyper', 'chaotic'],
    baby: ['nurturing', 'curious', 'lazy'],
    child: ['brave', 'genius', 'curious'],
    teen: ['brave', 'chaotic', 'tsundere'],
    adult: ['genius', 'stoic', 'calm', 'brave'],
    mega: ['genius', 'calm', 'stoic'],
  };
  const options = stageMap[stage] || stageMap.egg;
  // Deterministic based on stage (same stage = same personality)
  const idx = stage.charCodeAt(0) % options.length;
  return PERSONALITY_PROFILES[options[idx]];
}

// Get random phrase from personality
export function getPhrase(personality: PersonalityProfile, category: keyof PersonalityProfile): string {
  const phrases = personality[category];
  if (Array.isArray(phrases)) {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  return '';
}

// React to event based on personality
export function reactToEvent(
  personality: PersonalityProfile,
  event: 'success' | 'error' | 'task_complete' | 'evolve' | 'feed' | 'idle' | 'greeting'
): string {
  switch (event) {
    case 'success': return getPhrase(personality, 'successPhrases');
    case 'error': return getPhrase(personality, 'errorPhrases');
    case 'task_complete': return getPhrase(personality, 'successPhrases');
    case 'evolve': return getPhrase(personality, 'excitedPhrases');
    case 'feed': return getPhrase(personality, 'hungryPhrases');
    case 'idle': return getPhrase(personality, 'idlePhrases');
    case 'greeting': return getPhrase(personality, 'greetings');
    default: return getPhrase(personality, 'idlePhrases');
  }
}

// Tier-max personality: blend the deterministic stage-based profile with topic
// affinity from memory. If the user engages heavily with one cluster, the pet
// drifts toward a profile that matches that cluster.
const TOPIC_TO_PROFILE: Array<{ tag: string; weight: number; profile: PersonalityType }> = [
  { tag: 'typescript', weight: 1, profile: 'genius' },
  { tag: 'python', weight: 1, profile: 'genius' },
  { tag: 'rust', weight: 1, profile: 'stoic' },
  { tag: 'go', weight: 1, profile: 'calm' },
  { tag: 'sql', weight: 1, profile: 'genius' },
  { tag: 'react', weight: 1, profile: 'hyper' },
  { tag: 'svelte', weight: 1, profile: 'curious' },
  { tag: 'docker', weight: 1, profile: 'stoic' },
  { tag: 'aws', weight: 1, profile: 'stoic' },
  { tag: 'deploy', weight: 1, profile: 'brave' },
  { tag: 'test', weight: 1, profile: 'genius' },
  { tag: 'bug', weight: 1, profile: 'genius' },
  { tag: 'debug', weight: 1, profile: 'genius' },
  { tag: 'error', weight: 1, profile: 'stoic' },
  { tag: 'auth', weight: 0.6, profile: 'stoic' },
];

export interface EvolvedPersonality {
  base: PersonalityProfile;
  shift: PersonalityType | null;
  reason: string;
}

export function evolvePersonality(
  stage: string,
  topics: Array<{ topic: string; count: number }>
): EvolvedPersonality {
  const base = getPersonalityForStage(stage);
  if (topics.length === 0) return { base, shift: null, reason: '' };

  const scoreByProfile = new Map<PersonalityType, number>();
  for (const t of topics) {
    const m = TOPIC_TO_PROFILE.find((p) => p.tag === t.topic);
    if (!m) continue;
    const w = m.weight * t.count;
    scoreByProfile.set(m.profile, (scoreByProfile.get(m.profile) || 0) + w);
  }
  if (scoreByProfile.size === 0) return { base, shift: null, reason: '' };

  let shift: PersonalityType | null = null;
  let best = 0;
  for (const [k, v] of scoreByProfile) {
    if (v > best && v >= 5 && k !== base.type) {
      best = v;
      shift = k;
    }
  }

  if (!shift) return { base, shift: null, reason: '' };
  const targets = topics.filter((t) => TOPIC_TO_PROFILE.find((p) => p.tag === t.topic)?.profile === shift).slice(0, 3);
  const reason = targets.map((t) => `${t.topic}(${t.count})`).join(', ');
  return { base, shift, reason };
}

export function getEvolvedPersonality(stage: string, topics: Array<{ topic: string; count: number }> = []): EvolvedPersonality {
  return evolvePersonality(stage, topics);
}
