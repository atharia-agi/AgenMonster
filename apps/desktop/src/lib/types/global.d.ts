interface Window {
  __AM_ADAPT?: () => void;
  __AM_INTERACT?: (signal: { type: string; timestamp: number; detail: string; value: number }, weight: number) => void;
    __TAURI__?: { invoke: (...args: any[]) => any; [key: string]: any };
  webkitAudioContext: typeof AudioContext;
}
