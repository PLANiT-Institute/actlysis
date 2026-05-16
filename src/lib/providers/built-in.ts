import type { ProviderConfig } from "../types";
import { CLAUDE_MODELS } from "../constants";

/**
 * Built-in Ollama provider config.
 *
 * The models list starts empty and is populated at runtime by fetching
 * /api/ollama/models in the page component.
 */
export const OLLAMA_BUILTIN: ProviderConfig = {
  id: "builtin-ollama",
  name: "Ollama",
  type: "ollama",
  models: [],
};

/**
 * Built-in Claude Code CLI provider config.
 *
 * Model IDs come from the CLAUDE_MODELS constant so the list stays in sync
 * with the constants file without duplication.
 */
export const CLAUDE_BUILTIN: ProviderConfig = {
  id: "builtin-claude-code",
  name: "Claude Code",
  type: "claude-code",
  models: CLAUDE_MODELS.map((m) => m.id),
};
