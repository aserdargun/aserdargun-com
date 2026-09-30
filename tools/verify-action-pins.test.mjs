import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  CANONICAL_ACTION_PINS,
  fleetRepositories,
  inspectWorkflow,
  verifyFleet,
} from './verify-action-pins.mjs';

const [checkout, setupNode, uploadArtifact, cache, deploy] = [
  CANONICAL_ACTION_PINS.get('actions/checkout'),
  CANONICAL_ACTION_PINS.get('actions/setup-node'),
  CANONICAL_ACTION_PINS.get('actions/upload-artifact'),
  CANONICAL_ACTION_PINS.get('actions/cache'),
  CANONICAL_ACTION_PINS.get('Azure/static-web-apps-deploy'),
];

test('a correctly pinned workflow produces no findings', () => {
  const workflow = [
    '      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
    '      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0',
    `      - uses: Azure/static-web-apps-deploy@${deploy.sha} # v1 branch head 2024-09-11`,
  ].join('\n');
  assert.deepEqual(inspectWorkflow(workflow), []);
});

test('a workflow without a version comment is still canonical', () => {
  const workflow = `      - uses: actions/checkout@${checkout.sha}\n`;
  assert.deepEqual(inspectWorkflow(workflow), []);
});

test('a moving version tag is reported separately from a wrong commit', () => {
  const [tagFinding] = inspectWorkflow('      - uses: actions/checkout@v7\n');
  assert.equal(tagFinding.kind, 'moving-tag');
  assert.equal(tagFinding.ref, 'v7');

  const [commitFinding] = inspectWorkflow(
    '      - uses: Azure/static-web-apps-deploy@1a947af9992250f3bc2e68ad0754c0b0c11566c9 # v1\n',
  );
  assert.equal(commitFinding.kind, 'wrong-commit');
  assert.equal(commitFinding.expected, deploy.sha);
});

test('a canonical commit carrying a misleading version comment is reported', () => {
  const [finding] = inspectWorkflow(
    `      - uses: Azure/static-web-apps-deploy@${deploy.sha} # v1\n`,
  );
  assert.equal(finding.kind, 'stale-comment');
  assert.equal(finding.expected, 'v1 branch head 2024-09-11');
});

test('local and container references are not treated as third-party pins', () => {
  const workflow = [
    '      - uses: ./.github/actions/build',
    '      - uses: docker://alpine:3.20',
  ].join('\n');
  assert.deepEqual(inspectWorkflow(workflow), []);
});

test('an action outside the canonical set is reported instead of passing silently', () => {
  const [finding] = inspectWorkflow('      - uses: some/other-action@0123456789abcdef0123456789abcdef01234567\n');
  assert.equal(finding.kind, 'unknown-action');
});

test('the checked-out fleet pins exactly one commit per action', async () => {
  // Reads the real sibling repositories, so this fails the moment one of them
  // drifts. Skipped when the fleet is not checked out next to this repository.
  const repositories = fleetRepositories();
  if (repositories.length === 0) return;
  const { census, repositories: inspected } = verifyFleet();
  const problems = inspected.flatMap(({ repository, findings }) =>
    findings.map((finding) => `${repository}/${finding.file}:${finding.line} ${finding.kind} ${finding.action}@${finding.ref}`),
  );
  assert.deepEqual(problems, []);
  for (const [key, count] of census) {
    const [action, ref] = key.split('@');
    const canonical = CANONICAL_ACTION_PINS.get(action);
    assert.equal(ref, canonical.sha, `${action} is pinned to more than one commit (${count} uses)`);
  }
});

test('verifyFleet reports drift in a synthetic fleet', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'aserdargun-pins-'));
  try {
    await mkdir(path.join(root, 'aaa-aserdargun-com', '.github', 'workflows'), { recursive: true });
    await mkdir(path.join(root, 'bbb-aserdargun-com', '.github', 'workflows'), { recursive: true });
    await writeFile(
      path.join(root, 'aaa-aserdargun-com', '.github', 'workflows', 'ci.yml'),
      `      - uses: actions/setup-node@${setupNode.sha} # v7.0.0\n      - uses: actions/upload-artifact@${uploadArtifact.sha} # v7.0.1\n      - uses: actions/cache@${cache.sha} # v6.1.0\n`,
    );
    await writeFile(
      path.join(root, 'bbb-aserdargun-com', '.github', 'workflows', 'deploy.yml'),
      `      - uses: actions/checkout@v7\n      - uses: actions/setup-node@${setupNode.sha}\n`,
    );
    const { census, repositories } = verifyFleet(root);
    assert.deepEqual(repositories.map(({ repository }) => repository), [
      'aaa-aserdargun-com',
      'bbb-aserdargun-com',
    ]);
    assert.deepEqual(repositories[0].findings, []);
    assert.equal(repositories[1].findings.length, 1);
    assert.equal(repositories[1].findings[0].kind, 'moving-tag');
    // The census counts what is on disk, so the drifting reference is visible.
    assert.equal(census.get(`actions/checkout@v7`), 1);
    assert.equal(census.get(`actions/setup-node@${setupNode.sha}`), 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
