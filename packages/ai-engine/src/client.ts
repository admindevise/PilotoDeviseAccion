import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export function resetClient(): void {
  client = null;
}

export interface AgentConfig {
  id: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

export interface AgentResult<T> {
  data: T;
  reasoning?: string;
  confidence: number;
  tokensUsed: { input: number; output: number };
}

/** Model constants used across agents */
export const Models = {
  HAIKU: 'claude-haiku-4-5-20241022',
  SONNET: 'claude-sonnet-4-5-20250514',
} as const;

/**
 * Generic helper to call Claude and parse a JSON response.
 * All agents delegate to this function so API interaction is centralized.
 */
export async function callAgent<T>(
  config: AgentConfig,
  userMessage: string,
): Promise<AgentResult<T>> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: config.systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`Agent ${config.id}: no text response received`);
  }

  const rawText = textBlock.text;

  // Extract JSON from the response (supports ```json ... ``` wrappers)
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) ?? rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) {
    throw new Error(`Agent ${config.id}: could not extract JSON from response`);
  }

  const parsed: T = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);

  // Try to pull a top-level confidence / reasoning if the agent includes them
  let confidence = 1;
  let reasoning: string | undefined;
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj['confidence'] === 'number') confidence = obj['confidence'] as number;
    if (typeof obj['reasoning'] === 'string') reasoning = obj['reasoning'] as string;
  }

  return {
    data: parsed,
    reasoning,
    confidence,
    tokensUsed: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  };
}
