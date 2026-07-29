// Web notification helper — replaces the dormant Tauri bridge.
// Uses the standard Notification API with a permission-safe fallback so the
// desktop-app notification path no longer depends on a (currently unused) Tauri
// runtime. Fails silently when notifications are unavailable (e.g. insecure ctx).

export async function sendNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
      return;
    }
    if (Notification.permission === 'denied') return;
    const perm = await Notification.requestPermission().catch(() => 'denied' as NotificationPermission);
    if (perm === 'granted') new Notification(title, { body });
  } catch {
    // Notifications unsupported in this context — ignore.
  }
}
