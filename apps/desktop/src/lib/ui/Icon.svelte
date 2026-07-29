<script lang="ts">
  let { name = 'none', size = 16, color } = $props<{
    name: string;
    size?: number;
    color?: string;
  }>();

  const glyphs: Record<string, { d: string; viewBox?: string }> = {
    none: { d: '' },
    stage_egg: { d: 'M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 1a5 5 0 1 0 0 10A5 5 0 0 0 8 3z' },
    stage_hatchling: { d: 'M3 3h2v2H3zm8 0h2v2h-2zM6 7a2 2 0 1 1 4 0 2 2 0 0 1-4 0z' },
    stage_baby: { d: 'M4 4h8v8H4zm2 2v4h4V6z' },
    stage_child: { d: 'M3 3h2v2H3zm8 0h2v2h-2zM6 7h4v1H6zM5 10h6v1H5z' },
    stage_teen: { d: 'M4 3l4 2 4-2v12l-4 2-4-2z' },
    stage_adult: { d: 'M3 4l4-2 4 2 4-2v12l-4 2-4-2zM8 7v6' },
    stage_mega: { d: 'M2 5l6-3 6 3v10l-6 3-6-3zm6 3v5' },

    mood_idle: { d: 'M4 9l2 2 4-4' },
    mood_happy: { d: 'M3 8a5 5 0 1 1 10 0 5 5 0 0 1-10 0zm3 0v4m2-2h4' },
    mood_sleepy: { d: 'M3 9h2m6 0h2M4 7l1 1m5-1l1 1' },
    mood_proud: { d: 'M4 8h8M8 8v6' },
    mood_excited: { d: 'M3 9h2m4 0h2m4 0h2M8 5v8' },
    mood_focused: { d: 'M4 8h8M5 8l1 4 1-4 1 4 1-4 1 4' },
    mood_thinking: { d: 'M5 8h6m-3-3v10' },
    mood_sad: { d: 'M4 10l3-3 3 3M8 7v6' },
    mood_angry: { d: 'M4 8l2 3 2-3 2 3 2-3M8 5v8' },
    mood_frustrated: { d: 'M4 11h8M5 8l-1 3m10-3l1 3' },
    mood_tired: { d: 'M3 10h2m6 0h2M4 8l1 1m5-1l1 1' },

    need_hunger: { d: 'M4 4h8v10l-4 3-4-3z' },
    need_energy: { d: 'M4 3l4 5 4-5v10l-4 3-4-3z' },
    need_focus: { d: 'M4 3h8v4l2 2v6l-4 3-4-3v-6l2-2z' },
    need_mood: { d: 'M4 9h12M8 5v10' },
    need_affection: { d: 'M8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z' },
    need_motivation: { d: 'M4 11l4-7 4 7M8 4v14' },
    need_knowledge: { d: 'M6 3h6v7l2 2v6H4v-6l2-2z' },

    action_feed: { d: 'M3 4h12v12H3zm4 4h4v2H7z' },
    action_play: { d: 'M7 4l4 4-4 4-4-4z' },
    action_talk: { d: 'M3 6h10v6H3zm2 2v2m2-2v2m2-2v2m2-2v2' },
    action_pat: { d: 'M7 4v12m-5-5h12' },
    action_sleep: { d: 'M4 9h2m6 0h2M4 7l1 1m5-1l1 1' },
    action_portal: { d: 'M8 4l4 4-4 4-4-4z' },
    action_deploy: { d: 'M4 8h12M8 4v12' },
    action_search: { d: 'M9 3a5 5 0 1 1-4 9 5 5 0 0 1 4-9zm0 1a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm6.5 9.5L14 14' },

    folder: { d: 'M3 5h6l1-1h7v11H3z' },
    terminal: { d: 'M3 4h10v8H3zm2 2v3m3-3v3m3-3v3' },
    console: { d: 'M4 4h8v8H4zM6 8h4' },
    settings: { d: 'M8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 1a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm4.5 1.5a2.5 2.5 0 1 1 0 3.5h.01M8 12l.5-2.5' },
    todo: { d: 'M5 3h6v2H5zm0 4h6v2H5zm0 4h4v2H5z' },
    check: { d: 'M4 8l3 3 5-5' },

    heart_full: { d: 'M8 13l-1.5-1.3C4 10 2 8 2 5.5A2.5 2.5 0 0 1 4.5 3 2.5 2.5 0 0 1 8 5.5a2.5 2.5 0 0 1 3.5 0A2.5 2.5 0 0 1 14 5.5c0 2.5-2 4.5-4.5 6.2z' },
    heart_empty: { d: 'M8 13l-1.5-1.3C4 10 2 8 2 5.5A2.5 2.5 0 0 1 4.5 3 2.5 2.5 0 0 1 8 5.5a2.5 2.5 0 0 1 3.5 0A2.5 2.5 0 0 1 14 5.5c0 2.5-2 4.5-4.5 6.2zM8 4.5A1.5 1.5 0 0 0 5 6.5c0 1 1.5 2.5 3 3.5 1.5-1 3-2.5 3-3.5A1.5 1.5 0 0 0 8 4.5z' },

    cross: { d: 'M3 3l10 10M13 3L3 13' },
    star: { d: 'M8 2l2 5 5 1-3.5 3 1 5-4-2.5L4 16l1-5L1 8l5-1z' },
    diamond: { d: 'M8 2l6 6-6 6-6-6z' },
    arrow_left: { d: 'M10 4l-4 4 4 4' },
    arrow_right: { d: 'M6 4l4 4-4 4' },
    caret_down: { d: 'M4 6l4 4 4-4' },
    expand: { d: 'M4 4l8 8M12 4l-8 8' },
    menu: { d: 'M3 4h10v2H3zm0 4h10v2H3zm0 4h7v2H3z' },
  };

  const glyph = $derived(glyphs[name] || glyphs.none);
  const inherit = $derived(color ? `color:${color};` : '');
</script>

<span
  class="ico-glyph"
  style="width:{size}px;height:{size}px;{inherit}"
  aria-hidden="true"
>
  {#if glyph.d}
    <svg viewBox={glyph.viewBox || '0 0 16 16'} xmlns="http://www.w3.org/2000/svg">
      <path d={glyph.d} />
    </svg>
  {/if}
</span>
