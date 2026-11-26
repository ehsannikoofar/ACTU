// Shared Claude client configuration for both agents.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/lib/config";

export class AgentUnavailableError extends Error {}

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!config.claude.configured) {
    throw new AgentUnavailableError("ANTHROPIC_API_KEY is not configured — agents are unavailable.");
  }
  client ??= new Anthropic();
  return client;
}

/**
 * Common request settings. Server-side refusal fallbacks are enabled ("default" routing) so a
 * safety-classifier decline is retried on a fallback model inside the same call.
 */
export const BASE = {
  get model() {
    return config.claude.model;
  },
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};

export function describeApiError(e: unknown): string {
  if (e instanceof AgentUnavailableError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return "Claude API key was rejected.";
  if (e instanceof Anthropic.RateLimitError) return "Claude API rate limit — try again in a moment.";
  if (e instanceof Anthropic.APIConnectionError) return "Cannot reach the Claude API (network).";
  if (e instanceof Anthropic.APIError) return `Claude API error ${e.status}.`;
  return e instanceof Error ? e.message : "Unknown error";
}
