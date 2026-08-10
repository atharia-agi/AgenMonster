// Cross-device sync utility functions

import type { SyncMessage, SyncPeer, GoalsCRDTEnvelope } from './syncTypes.ts';

/**
 * CRDT merge for LWW-Register with vector-clock-like causal context.
 *
 * Returns `true` if `incoming` should be accepted over `local`.
 * Rules:
 *  1. Always accept ping/pong.
 *  2. If `incoming.seq` > `local.seq` for the same device, accept.
 *  3. If `incoming.seq` == `local.seq`, accept the one with larger timestamp.
 *  4. Otherwise reject (stale or concurrent but older).
 *
 * For initial local state with no prior seq, treat `localSeq` as -1 so the
 * first remote update always wins.
 */
export function shouldAcceptSync(msg: any, localSeq: number, localTimestamp: number): boolean {
  if (msg.type === 'ping' || msg.type === 'pong') return true;
  if (msg.seq > localSeq) return true;
  if (msg.seq === localSeq) {
    const remote = msg.lastModified ?? msg.timestamp;
    return remote >= localTimestamp;
  }
  return false;
}

/**
 * Merge two CRDT goal envelopes using OR-Set semantics.
 * - A goal is present if it was added more recently than it was removed.
 * - Step removals are merged similarly.
 * - The result is a deterministic merged state.
 */
export function mergeGoalsCRDT(local: any, remote: any): any {
  const merged = {
    adds: { ...local.adds },
    removes: { ...local.removes },
    stepRemoves: { ...local.stepRemoves },
    goals: { ...local.goals },
  };

  for (const [goalId, remoteAddTs] of Object.entries(remote.adds)) {
    const localAddTs = merged.adds[goalId] ?? 0;
    const remoteAddTsNum = Number(remoteAddTs);
    if (remoteAddTsNum >= localAddTs) {
      merged.adds[goalId] = remoteAddTsNum;
      if (remote.goals[goalId]) {
        merged.goals[goalId] = remote.goals[goalId];
      }
    }
  }

  for (const [goalId, remoteRemoveTs] of Object.entries(remote.removes)) {
    const localRemoveTs = merged.removes[goalId] ?? 0;
    const remoteRemoveTsNum = Number(remoteRemoveTs);
    if (remoteRemoveTsNum >= localRemoveTs) {
      merged.removes[goalId] = remoteRemoveTsNum;
    }
  }

  for (const [key, remoteStepTs] of Object.entries(remote.stepRemoves)) {
    const localStepTs = merged.stepRemoves[key] ?? 0;
    const remoteStepTsNum = Number(remoteStepTs);
    if (remoteStepTsNum >= localStepTs) {
      merged.stepRemoves[key] = remoteStepTsNum;
    }
  }

  return merged;
}

export function filterCRDTGoals(envelope: any): any[] {
  const result: any[] = [];
  for (const [goalId, addTs] of Object.entries(envelope.adds)) {
    const removeTs = envelope.removes[goalId] ?? 0;
    const addTsNum = Number(addTs);
    const removeTsNum = Number(removeTs);
    if (addTsNum > removeTsNum && envelope.goals[goalId]) {
      const goal = envelope.goals[goalId];
      const filteredSteps = goal.steps.filter(
        (step: any) => (envelope.stepRemoves[`${goalId}:${step.id}`] ?? 0) < goal.updatedAt
      );
      result.push({ ...goal, steps: filteredSteps });
    }
  }
  return result.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function encodeGoalsToCRDT(goals: any[]): any {
  const envelope: any = { adds: {}, removes: {}, stepRemoves: {}, goals: {} };
  const now = Date.now();
  for (const g of goals) {
    const goalId = g.id || crypto.randomUUID();
    envelope.adds[goalId] = g.createdAt ?? now;
    envelope.goals[goalId] = {
      id: goalId,
      title: g.title,
      steps: g.steps || [],
      createdAt: g.createdAt ?? now,
      updatedAt: g.updatedAt ?? now,
      doneAt: g.doneAt,
      removedAt: g.removedAt,
    };
  }
  return envelope;
}

export function decodeCRDTToGoals(envelope: any): any[] {
  const result: any[] = [];
  for (const [goalId, addTs] of Object.entries(envelope.adds)) {
    const removeTs = envelope.removes[goalId] ?? 0;
    const addTsNum = Number(addTs);
    const removeTsNum = Number(removeTs);
    if (addTsNum > removeTsNum && envelope.goals[goalId]) {
      const goal = envelope.goals[goalId];
      const filteredSteps = goal.steps.filter(
        (step: any) => (envelope.stepRemoves[`${goalId}:${step.id}`] ?? 0) < goal.updatedAt
      );
      result.push({ ...goal, steps: filteredSteps });
    }
  }
  return result.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

const DEVICE_ID_KEY = 'agenmonster_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem('agenmonster_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('agenmonster_device_id', id);
  }
  return id;
}