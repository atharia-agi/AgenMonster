import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFactImportance, importanceBump } from '../src/lib/importance.ts';

test('user fact confidence grows faster than note fact on repeated bumps', () => {
  const userImp = getFactImportance('user.lang');
  const noteImp = getFactImportance('note.tmp');
  const baseBump = 0.04;
  let userConf = 0.5;
  let noteConf = 0.5;
  for (let i = 0; i < 10; i++) {
    userConf = Math.min(1, userConf + importanceBump(baseBump, userImp.importance));
    noteConf = Math.min(1, noteConf + importanceBump(baseBump, noteImp.importance));
  }
  assert.ok(userConf > noteConf);
});

test('project fact has intermediate growth rate', () => {
  const userImp = getFactImportance('user.lang');
  const projectImp = getFactImportance('project.framework');
  const noteImp = getFactImportance('note.tmp');
  const baseBump = 0.04;
  let userConf = 0.5;
  let projectConf = 0.5;
  let noteConf = 0.5;
  for (let i = 0; i < 10; i++) {
    userConf += importanceBump(baseBump, userImp.importance);
    projectConf += importanceBump(baseBump, projectImp.importance);
    noteConf += importanceBump(baseBump, noteImp.importance);
  }
  assert.ok(userConf > projectConf);
  assert.ok(projectConf > noteConf);
});