<script lang="ts">
  import PixelPetV2 from '$lib/render/PixelPetV2.svelte';

  let { stage = 'egg', mood = 'idle', name = 'AgenMonster', level = 1, externalSpeech = '' } = $props<{
    stage?: string; mood?: string; name?: string; level?: number;
    externalSpeech?: string;
  }>();

  const moodLabel: Record<string, string> = {
    idle: 'IDLE', happy: 'HAPPY', sleepy: 'SLEEPY', proud: 'PROUD',
    excited: 'EXCITED', focused: 'FOCUSED', thinking: 'THINKING',
    sad: 'SAD', angry: 'ANGRY', frustrated: 'FRUSTRATED', tired: 'TIRED',
  };
</script>

<div class="monster-room">
  <div class="monster-canvas">
    <PixelPetV2 width={240} height={180} {mood} {stage} facing="left" {externalSpeech} />
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
    padding: 6px;
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
    image-rendering: pixelated;
  }
  .monster-canvas {
    width: 240px;
    height: 180px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    image-rendering: pixelated;
    position: relative;
    overflow: hidden;
  }
  .monster-info {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 4px;
    font-family: var(--font-body);
    font-size: 8px;
    color: var(--gb-text);
    image-rendering: pixelated;
  }
</style>
