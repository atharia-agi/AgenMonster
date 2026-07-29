import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendNotification } from '../src/lib/notifications.ts';

const notifications: Array<{ title: string; body: string }> = [];
let permission: NotificationPermission = 'granted';

function setNotificationPermission(p: NotificationPermission) {
  permission = p;
  notifications.length = 0;
}

(globalThis as any).window = {};
(globalThis as any).Notification = class MockNotification {
  title: string;
  opts: any;
  constructor(title: string, opts: any) {
    this.title = title;
    this.opts = opts;
    notifications.push({ title, body: (opts && opts.body) || '' });
  }
  static get permission() { return permission; }
  static async requestPermission() {
    const p = permission;
    return p;
  }
};

test('granted permission fires notification', async () => {
  setNotificationPermission('granted');
  await sendNotification('Hello', 'World');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, 'Hello');
});

test('denied permission does not fire notification', async () => {
  setNotificationPermission('denied');
  await sendNotification('Hello', 'World');
  assert.equal(notifications.length, 0);
});

test('default permission requests permission but does not fire if not granted', async () => {
  setNotificationPermission('default');
  await sendNotification('Hey', 'There');
  assert.equal(notifications.length, 0);
});

test('no-op when Notification is undefined', async () => {
  const prev = (globalThis as any).Notification;
  (globalThis as any).Notification = undefined;
  await sendNotification('Hello', 'World');
  assert.equal(notifications.length, 0);
  (globalThis as any).Notification = prev;
});