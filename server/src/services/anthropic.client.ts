/**
 * Anthropic API client — single source of truth for all Claude API calls.
 * Exports:
 *   - `anthropic` — singleton SDK instance (used by ocr, accident-analyzer, etc.)
 *   - `callAnthropic` / `callAnthropicJSON` — lightweight raw-fetch helpers
 */
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '../config.js';
import { logger } from '../logger.js';

// ── Singleton SDK instance ────────────────────────────────────
export const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY ?? undefined,
});

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_TIMEOUT_MS = 10_000;

interface AnthropicRequestOptions {
  prompt: string;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
  /** Enable web search tool */
  webSearch?: boolean;
}

interface AnthropicTextResponse {
  text: string;
}

/**
 * Send a prompt to the Anthropic API and return the text response.
 * Returns null if ANTHROPIC_API_KEY is not configured.
 * Throws on network / API errors (caller should catch).
 */
export async function callAnthropic(options: AnthropicRequestOptions): Promise<AnthropicTextResponse | null> {
  if (!ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY not set — AI lookup skipped');
    return null;
  }

  const {
    prompt,
    maxTokens = 300,
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    webSearch = true,
  } = options;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };

  if (webSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  const response = await fetch(ANTHROPIC_BASE_URL, {
    signal: AbortSignal.timeout(timeoutMs),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json() as Record<string, unknown>;
  const content = data.content as Array<{ type: string; text?: string }> | undefined;
  const textBlock = content?.find((b) => b.type === 'text');

  if (!textBlock?.text) {
    throw new Error('No text block in Anthropic response');
  }

  return { text: textBlock.text };
}

/**
 * Convenience: call Anthropic and parse the response as JSON.
 * Strips markdown code fences before parsing.
 */
export async function callAnthropicJSON<T = unknown>(options: AnthropicRequestOptions): Promise<T | null> {
  const result = await callAnthropic(options);
  if (!result) return null;

  const clean = result.text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as T;
}
