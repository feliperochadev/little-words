import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface AgentConfig {
  automaticShip: boolean;
  requiredApprovals: number;
  maxIterations: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  automaticShip: false,
  requiredApprovals: 2,
  maxIterations: 3,
};

const CONFIG_PATH = join(process.cwd(), '.agents', 'agent-config.json');

/**
 * Load the shared agent configuration from .agents/agent-config.json.
 * 
 * Returns defaults if the file does not exist or is invalid.
 */
export function loadAgentConfig(): AgentConfig {
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content);

    return {
      automaticShip: config.features?.automatic_ship ?? DEFAULT_CONFIG.automaticShip,
      requiredApprovals: config.review?.external_agents_required_for_auto_ship ?? DEFAULT_CONFIG.requiredApprovals,
      maxIterations: config.review?.max_review_iterations ?? DEFAULT_CONFIG.maxIterations,
    };
  } catch (error) {
    console.error(`Warning: Failed to parse agent config at ${CONFIG_PATH}. Using defaults.`, error);
    return DEFAULT_CONFIG;
  }
}

// CLI entry point
if (require.main === module) {
  const config = loadAgentConfig();
  console.log(JSON.stringify(config, null, 2));
}
