/**
 * @jest-environment node
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadAgentConfig } from '../../../scripts/agent/load-config';

const writeJson = (dir: string, data: object): string => {
  const p = path.join(dir, 'agent-config.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  return p;
};

describe('loadAgentConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'load-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when config file does not exist', () => {
    const result = loadAgentConfig(path.join(tmpDir, 'missing.json'));
    expect(result.automaticShip).toBe(false);
    expect(result.requiredApprovals).toBe(2);
    expect(result.maxIterations).toBe(3);
  });

  it('reads automaticShip from features.automatic_ship', () => {
    const p = writeJson(tmpDir, { features: { automatic_ship: true }, review: {} });
    const result = loadAgentConfig(p);
    expect(result.automaticShip).toBe(true);
  });

  it('reads requiredApprovals from review.external_agents_required_for_auto_ship', () => {
    const p = writeJson(tmpDir, { features: {}, review: { external_agents_required_for_auto_ship: 3 } });
    const result = loadAgentConfig(p);
    expect(result.requiredApprovals).toBe(3);
  });

  it('reads maxIterations from review.max_review_iterations', () => {
    const p = writeJson(tmpDir, { features: {}, review: { max_review_iterations: 5 } });
    const result = loadAgentConfig(p);
    expect(result.maxIterations).toBe(5);
  });

  it('falls back to defaults for missing keys', () => {
    const p = writeJson(tmpDir, { features: {}, review: {} });
    const result = loadAgentConfig(p);
    expect(result.automaticShip).toBe(false);
    expect(result.requiredApprovals).toBe(2);
    expect(result.maxIterations).toBe(3);
  });

  it('returns defaults on invalid JSON', () => {
    const p = path.join(tmpDir, 'agent-config.json');
    fs.writeFileSync(p, '{ invalid json }', 'utf-8');
    const result = loadAgentConfig(p);
    expect(result.automaticShip).toBe(false);
    expect(result.requiredApprovals).toBe(2);
    expect(result.maxIterations).toBe(3);
  });

  it('reads a full real-world config correctly', () => {
    const p = writeJson(tmpDir, {
      version: 1,
      features: { automatic_ship: true },
      review: { external_agents_required_for_auto_ship: 2, max_review_iterations: 3 },
      agents: { claude: { available: true }, codex: { available: false }, gemini: { available: true } },
    });
    const result = loadAgentConfig(p);
    expect(result.automaticShip).toBe(true);
    expect(result.requiredApprovals).toBe(2);
    expect(result.maxIterations).toBe(3);
  });
});
