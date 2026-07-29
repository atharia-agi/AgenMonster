// Per-stage speech styles — 8-bit RPG dialog box appearance.

export interface SpeechStyle {
  bg: string;
  fg: string;
  border: string;
  tail: string;
  font: string;
  shadow: string;
}

export const stageSpeechStyles: Record<string, SpeechStyle> = {
  egg: {
    bg: '#1a1a2e',
    fg: '#f5f0e6',
    border: '#c8bfa8',
    tail: '#dcd2c3',
    font: '10px "Press Start 2P", monospace',
    shadow: 'rgba(200,191,168,0.3)',
  },
  hatchling: {
    bg: '#0d1a0d',
    fg: '#90c878',
    border: '#508838',
    tail: '#70a858',
    font: '10px "Press Start 2P", monospace',
    shadow: 'rgba(80,136,56,0.3)',
  },
  baby: {
    bg: '#0d1a2e',
    fg: '#88ccf0',
    border: '#4888c0',
    tail: '#60a8d8',
    font: '10px "Press Start 2P", monospace',
    shadow: 'rgba(72,136,192,0.3)',
  },
  child: {
    bg: '#1a0d2e',
    fg: '#d8c8f0',
    border: '#9888c0',
    tail: '#b8a8d8',
    font: '10px "Press Start 2P", monospace',
    shadow: 'rgba(152,136,192,0.3)',
  },
  teen: {
    bg: '#2e0d1a',
    fg: '#ff8090',
    border: '#c04050',
    tail: '#e06070',
    font: '10px "Press Start 2P", monospace',
    shadow: 'rgba(192,64,80,0.3)',
  },
  adult: {
    bg: '#0d0d2e',
    fg: '#8070c0',
    border: '#403080',
    tail: '#6050a0',
    font: '10px "Press Start 2P", monospace',
    shadow: 'rgba(64,48,128,0.3)',
  },
  mega: {
    bg: '#1a1a0d',
    fg: '#ffc860',
    border: '#ffa820',
    tail: '#ffb840',
    font: '12px "Press Start 2P", monospace',
    shadow: 'rgba(255,168,32,0.3)',
  },
};

export function getSpeechStyle(stage: string): SpeechStyle {
  return stageSpeechStyles[stage] || stageSpeechStyles.egg;
}
