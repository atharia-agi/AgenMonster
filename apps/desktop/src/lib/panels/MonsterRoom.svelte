<script lang="ts">
  import PixelPetV2 from '$lib/render/PixelPetV2.svelte';

  let { stage = 'egg', mood = 'idle', name = 'AgenMonster', level = 1, externalSpeech = '', form = undefined } = $props<{
    stage?: string; mood?: string; name?: string; level?: number;
    externalSpeech?: string; form?: any;
  }>();

  const moodLabel: Record<string, string> = {
    idle: 'IDLE', happy: 'HAPPY', sleepy: 'SLEEPY', proud: 'PROUD',
    excited: 'EXCITED', focused: 'FOCUSED', thinking: 'THINKING',
    sad: 'SAD', angry: 'ANGRY', frustrated: 'FRUSTRATED', tired: 'TIRED',
  };
</script>

<div class="monster-room">
  <div class="monster-canvas">
    <PixelPetV2 width={240} height={180} {mood} {stage} facing="left" {externalSpeech} {form} />
  </div>
  <div class="monster-info">
    <span class="name">{name}</span>
    <span class="mood">{moodLabel[mood] || mood.toUpperCase()}</span>
  </div>
</div>

<style>
  .monster-room {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--sp-2);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
  }
  .monster-canvas {
    width: 240px;
    height: 180px;
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;
  }
  .monster-info {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: var(--sp-2);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
