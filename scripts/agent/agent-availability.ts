/**
 * Agent availability tracking utility.
 *
 * Reads and writes .agents/agent-config.json to track which agents
 * are currently available (have quota remaining).
 *
 * Called by:
 *   - /rate-limit-abort → setAgentAvailable(name, false)
 *   - Agent startup     → setAgentAvailable(name, true)
 *   - /check-unfinished-tasks → getAvailableAgents()
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type AgentName = 'claude' | 'codex' | 'gemini';

export interface AgentEntry {
  available: boolean;
  readme_file?: string;
}

export interface AgentConfig {
  version: number;
  features: {
    automatic_ship: boolean;
  };
  review: {
    external_agents_required_for_auto_ship: number;
    max_review_iterations: number;
  };
  agents: Record<AgentName, AgentEntry>;
}

const CONFIG_PATH = join(process.cwd(), '.agents', 'agent-config.json');

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function readAgentConfig(configPath?: string): AgentConfig {
  const path = configPath ?? CONFIG_PATH;

  if (!existsSync(path)) {
    throw new Error(`agent-config.json not found at: ${path}`);
  }

  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as AgentConfig;
}

export function writeAgentConfig(config: AgentConfig, configPath?: string): void {
  const path = configPath ?? CONFIG_PATH;
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function setAgentAvailable(
  agentName: AgentName,
  available: boolean,
  configPath?: string,
): void {
  const config = readAgentConfig(configPath);
  config.agents[agentName].available = available;
  writeAgentConfig(config, configPath);
}

export function isAgentAvailable(agentName: AgentName, configPath?: string): boolean {
  const config = readAgentConfig(configPath);
  return config.agents[agentName]?.available ?? false;
}

export function getAvailableAgents(configPath?: string): AgentName[] {
  const config = readAgentConfig(configPath);
  return (Object.entries(config.agents) as [AgentName, AgentEntry][])
    .filter(([, entry]) => entry.available)
    .map(([name]) => name);
}

export function getAgentReadmeFiles(configPath?: string): Partial<Record<AgentName, string>> {
  const config = readAgentConfig(configPath);
  const result: Partial<Record<AgentName, string>> = {};
  (Object.entries(config.agents) as [AgentName, AgentEntry][]).forEach(([name, entry]) => {
    if (entry.readme_file) result[name] = entry.readme_file;
  });
  return result;
}

export function getUnavailableAgents(configPath?: string): AgentName[] {
  const config = readAgentConfig(configPath);
  return (Object.entries(config.agents) as [AgentName, AgentEntry][])
    .filter(([, entry]) => !entry.available)
    .map(([name]) => name);
}

// CLI entry point
if (require.main === module) {
  const available = getAvailableAgents();
  const unavailable = getUnavailableAgents();

  console.log('Agent availability:');
  available.forEach((a) => console.log(`  [online]  ${a}`));
  unavailable.forEach((a) => console.log(`  [offline] ${a}`));

  process.exit(0);
}
