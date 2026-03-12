/**
 * @jest-environment node
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getAgentReadmeFiles,
  getAvailableAgents,
  getConfigPath,
  getUnavailableAgents,
  isAgentAvailable,
  readAgentConfig,
  setAgentAvailable,
  writeAgentConfig,
  type AgentConfig,
} from '../../../scripts/agent/agent-availability';

const makeConfig = (overrides?: Partial<AgentConfig>): AgentConfig => ({
  version: 1,
  features: { automatic_ship: false },
  review: { external_agents_required_for_auto_ship: 2, max_review_iterations: 3 },
  agents: {
    claude: { available: true, readme_file: 'CLAUDE.md' },
    codex: { available: true, readme_file: 'AGENTS.md' },
    gemini: { available: true, readme_file: 'GEMINI.md' },
  },
  ...overrides,
});

const writeConfig = (dir: string, config: AgentConfig): string => {
  const p = path.join(dir, 'agent-config.json');
  fs.writeFileSync(p, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return p;
};

// ---------------------------------------------------------------------------
// getConfigPath
// ---------------------------------------------------------------------------

describe('getConfigPath', () => {
  it('returns a path ending in agent-config.json', () => {
    expect(getConfigPath()).toMatch(/agent-config\.json$/);
  });
});

// ---------------------------------------------------------------------------
// readAgentConfig
// ---------------------------------------------------------------------------

describe('readAgentConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-avail-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads and parses a valid config file', () => {
    const cfgPath = writeConfig(tmpDir, makeConfig());
    const config = readAgentConfig(cfgPath);
    expect(config.version).toBe(1);
    expect(config.agents.claude.available).toBe(true);
  });

  it('throws when config file is missing', () => {
    expect(() => readAgentConfig(path.join(tmpDir, 'nonexistent.json'))).toThrow();
  });

  it('reads all three agent entries', () => {
    const cfgPath = writeConfig(tmpDir, makeConfig());
    const config = readAgentConfig(cfgPath);
    expect(config.agents).toHaveProperty('claude');
    expect(config.agents).toHaveProperty('codex');
    expect(config.agents).toHaveProperty('gemini');
  });
});

// ---------------------------------------------------------------------------
// writeAgentConfig
// ---------------------------------------------------------------------------

describe('writeAgentConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-write-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes the config back and it can be read again', () => {
    const cfgPath = path.join(tmpDir, 'agent-config.json');
    const config = makeConfig();
    writeAgentConfig(config, cfgPath);
    const read = readAgentConfig(cfgPath);
    expect(read.version).toBe(1);
    expect(read.agents.claude.available).toBe(true);
  });

  it('writes valid JSON', () => {
    const cfgPath = path.join(tmpDir, 'agent-config.json');
    writeAgentConfig(makeConfig(), cfgPath);
    const raw = fs.readFileSync(cfgPath, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// setAgentAvailable
// ---------------------------------------------------------------------------

describe('setAgentAvailable', () => {
  let tmpDir: string;
  let cfgPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-set-test-'));
    cfgPath = writeConfig(tmpDir, makeConfig());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('marks an agent as unavailable', () => {
    setAgentAvailable('claude', false, cfgPath);
    const config = readAgentConfig(cfgPath);
    expect(config.agents.claude.available).toBe(false);
  });

  it('marks an agent back as available', () => {
    setAgentAvailable('claude', false, cfgPath);
    setAgentAvailable('claude', true, cfgPath);
    const config = readAgentConfig(cfgPath);
    expect(config.agents.claude.available).toBe(true);
  });

  it('only modifies the targeted agent', () => {
    setAgentAvailable('gemini', false, cfgPath);
    const config = readAgentConfig(cfgPath);
    expect(config.agents.claude.available).toBe(true);
    expect(config.agents.codex.available).toBe(true);
    expect(config.agents.gemini.available).toBe(false);
  });

  it('works for codex', () => {
    setAgentAvailable('codex', false, cfgPath);
    expect(readAgentConfig(cfgPath).agents.codex.available).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAgentAvailable
// ---------------------------------------------------------------------------

describe('isAgentAvailable', () => {
  let tmpDir: string;
  let cfgPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-is-test-'));
    cfgPath = writeConfig(tmpDir, makeConfig());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns true for an available agent', () => {
    expect(isAgentAvailable('claude', cfgPath)).toBe(true);
  });

  it('returns false after marking unavailable', () => {
    setAgentAvailable('gemini', false, cfgPath);
    expect(isAgentAvailable('gemini', cfgPath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAvailableAgents
// ---------------------------------------------------------------------------

describe('getAvailableAgents', () => {
  let tmpDir: string;
  let cfgPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-get-test-'));
    cfgPath = writeConfig(tmpDir, makeConfig());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns all three agents when all available', () => {
    const result = getAvailableAgents(cfgPath);
    expect(result).toHaveLength(3);
    expect(result).toContain('claude');
    expect(result).toContain('codex');
    expect(result).toContain('gemini');
  });

  it('excludes unavailable agents', () => {
    setAgentAvailable('codex', false, cfgPath);
    const result = getAvailableAgents(cfgPath);
    expect(result).not.toContain('codex');
    expect(result).toContain('claude');
    expect(result).toContain('gemini');
  });

  it('returns empty array when all agents unavailable', () => {
    setAgentAvailable('claude', false, cfgPath);
    setAgentAvailable('codex', false, cfgPath);
    setAgentAvailable('gemini', false, cfgPath);
    expect(getAvailableAgents(cfgPath)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getUnavailableAgents
// ---------------------------------------------------------------------------

describe('getUnavailableAgents', () => {
  let tmpDir: string;
  let cfgPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-unavail-test-'));
    cfgPath = writeConfig(tmpDir, makeConfig());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when all agents available', () => {
    expect(getUnavailableAgents(cfgPath)).toHaveLength(0);
  });

  it('returns the offline agent', () => {
    setAgentAvailable('gemini', false, cfgPath);
    const result = getUnavailableAgents(cfgPath);
    expect(result).toEqual(['gemini']);
  });

  it('returns multiple offline agents', () => {
    setAgentAvailable('claude', false, cfgPath);
    setAgentAvailable('codex', false, cfgPath);
    const result = getUnavailableAgents(cfgPath);
    expect(result).toContain('claude');
    expect(result).toContain('codex');
    expect(result).not.toContain('gemini');
  });
});

// ---------------------------------------------------------------------------
// getAgentReadmeFiles
// ---------------------------------------------------------------------------

describe('getAgentReadmeFiles', () => {
  let tmpDir: string;
  let cfgPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-readme-test-'));
    cfgPath = writeConfig(tmpDir, makeConfig());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns all three readme_file entries', () => {
    const result = getAgentReadmeFiles(cfgPath);
    expect(result.claude).toBe('CLAUDE.md');
    expect(result.codex).toBe('AGENTS.md');
    expect(result.gemini).toBe('GEMINI.md');
  });

  it('omits agents without a readme_file', () => {
    const cfg = makeConfig();
    delete cfg.agents.codex.readme_file;
    cfgPath = writeConfig(tmpDir, cfg);
    const result = getAgentReadmeFiles(cfgPath);
    expect(result).not.toHaveProperty('codex');
    expect(result.claude).toBe('CLAUDE.md');
    expect(result.gemini).toBe('GEMINI.md');
  });

  it('returns empty object when no agents have readme_file', () => {
    const cfg = makeConfig();
    delete cfg.agents.claude.readme_file;
    delete cfg.agents.codex.readme_file;
    delete cfg.agents.gemini.readme_file;
    cfgPath = writeConfig(tmpDir, cfg);
    expect(getAgentReadmeFiles(cfgPath)).toEqual({});
  });
});
