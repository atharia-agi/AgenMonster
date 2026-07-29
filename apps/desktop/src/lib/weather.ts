// Weather System — time-based background effects for the Monster Room.
// Affects: sky color, particles, ambient lighting.

export type WeatherType = 'clear' | 'rain' | 'snow' | 'aurora' | 'storm' | 'fog' | 'stars';

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  color: string;
  particleColor: string;
  particleCount: number;
  windSpeed: number;
  ambientLight: number;
  config?: WeatherConfig;
}

export interface WeatherConfig {
  skyTop: string;
  skyBottom: string;
  starCount: number;
  moonVisible: boolean;
  moonPhase: number;
}

const WEATHER_CONFIGS: Record<WeatherType, { state: WeatherState; config: WeatherConfig }> = {
  clear: {
    state: { type: 'clear', intensity: 0.8, color: '#0a0818', particleColor: '#ffffff', particleCount: 0, windSpeed: 0, ambientLight: 0.6 },
    config: { skyTop: '#0a0818', skyBottom: '#1a1040', starCount: 30, moonVisible: true, moonPhase: 0 },
  },
  rain: {
    state: { type: 'rain', intensity: 0.7, color: '#0a0a1a', particleColor: '#4488cc', particleCount: 60, windSpeed: 0.3, ambientLight: 0.3 },
    config: { skyTop: '#0a0a1a', skyBottom: '#1a1830', starCount: 0, moonVisible: false, moonPhase: 0 },
  },
  snow: {
    state: { type: 'snow', intensity: 0.5, color: '#0d0d2e', particleColor: '#ffffff', particleCount: 40, windSpeed: 0.1, ambientLight: 0.5 },
    config: { skyTop: '#0d0d2e', skyBottom: '#1a1a3e', starCount: 10, moonVisible: true, moonPhase: 0.5 },
  },
  aurora: {
    state: { type: 'aurora', intensity: 0.6, color: '#0d1a0d', particleColor: '#88ff88', particleCount: 20, windSpeed: 0, ambientLight: 0.4 },
    config: { skyTop: '#0d1a0d', skyBottom: '#1a2a1a', starCount: 20, moonVisible: false, moonPhase: 0 },
  },
  storm: {
    state: { type: 'storm', intensity: 0.9, color: '#0a0a0a', particleColor: '#ffff88', particleCount: 10, windSpeed: 0.8, ambientLight: 0.2 },
    config: { skyTop: '#0a0a0a', skyBottom: '#1a1a1a', starCount: 0, moonVisible: false, moonPhase: 0 },
  },
  fog: {
    state: { type: 'fog', intensity: 0.4, color: '#1a1a2e', particleColor: '#ffffff', particleCount: 15, windSpeed: 0.05, ambientLight: 0.4 },
    config: { skyTop: '#1a1a2e', skyBottom: '#2a2a3e', starCount: 5, moonVisible: true, moonPhase: 0.3 },
  },
  stars: {
    state: { type: 'stars', intensity: 1.0, color: '#050510', particleColor: '#ffffff', particleCount: 0, windSpeed: 0, ambientLight: 0.3 },
    config: { skyTop: '#050510', skyBottom: '#0a0a20', starCount: 80, moonVisible: true, moonPhase: 0 },
  },
};

// Get weather based on time of day
export function getWeatherForTime(hour: number, minute: number): WeatherType {
  // Dawn: clear → stars fade
  if (hour >= 5 && hour < 6) return 'clear';
  // Morning: clear
  if (hour >= 6 && hour < 12) return 'clear';
  // Midday: clear (brightest)
  if (hour >= 12 && hour < 14) return 'clear';
  // Afternoon: can have rain
  if (hour >= 14 && hour < 17) return 'clear';
  // Evening: aurora or clear
  if (hour >= 17 && hour < 19) return 'aurora';
  // Night: stars or clear
  if (hour >= 19 && hour < 22) return 'stars';
  // Late night: stars or fog
  if (hour >= 22 || hour < 3) return 'stars';
  // Pre-dawn: fog
  return 'fog';
}

export function getWeatherState(hour: number, minute: number): WeatherState {
  const type = getWeatherForTime(hour, minute);
  return { ...WEATHER_CONFIGS[type].state, config: WEATHER_CONFIGS[type].config };
}

export function getWeatherConfig(hour: number, minute: number): WeatherConfig {
  const type = getWeatherForTime(hour, minute);
  return { ...WEATHER_CONFIGS[type].config };
}

// Get sky gradient colors for time of day
export function getSkyColors(hour: number): { top: string; bottom: string } {
  if (hour >= 5 && hour < 7) return { top: '#1a0a2e', bottom: '#ff6040' }; // dawn
  if (hour >= 7 && hour < 12) return { top: '#0a0818', bottom: '#1a1040' }; // morning
  if (hour >= 12 && hour < 14) return { top: '#0a0818', bottom: '#1a1040' }; // midday
  if (hour >= 14 && hour < 17) return { top: '#0a0818', bottom: '#1a1040' }; // afternoon
  if (hour >= 17 && hour < 19) return { top: '#2e0a1a', bottom: '#ff4060' }; // sunset
  if (hour >= 19 && hour < 22) return { top: '#0a0818', bottom: '#1a1040' }; // night
  return { top: '#050510', bottom: '#0a0a20' }; // late night
}
