// Provider interfaces (CLAUDE.md "Provider abstraction"). Business logic talks to
// these types only; request and response shapes of real providers live in
// server/providers/*. Each surface is selected by one env var.

export type ProviderSurface =
  | "spell_identity" // Layer 1 text
  | "semantic_check" // Layer 2c text
  | "image"
  | "moderation" // Layer 2b
  | "email"
  | "storage"
  | "model_check";

export type ProviderOutcome =
  | "success"
  | "quota" // free quota or credits exhausted
  | "rate_limited"
  | "timeout"
  | "model_retired"
  | "auth"
  | "bad_response"
  | "network"
  | "server"
  | "config";

export interface CallContext {
  surface: ProviderSurface;
  userId?: number | null;
  /** Groups every call made for one creation (generation run id). */
  runId?: string | null;
}

export interface TextRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Ask the provider for a JSON object response. */
  json?: boolean;
}

export interface TextResult {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface TextProvider {
  readonly name: string;
  readonly model: string;
  complete(req: TextRequest): Promise<TextResult>;
}

export interface ImageRequest {
  prompt: string;
  width: number;
  height: number;
}

export interface ImageResult {
  bytes: Uint8Array;
  mime: string;
  provider: string;
  model: string;
  width: number;
  height: number;
}

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  generate(req: ImageRequest): Promise<ImageResult>;
}

export type ModerationInput =
  | { type: "text"; text: string }
  /** https URL or data: URL */
  | { type: "image"; url: string };

export interface ModerationScores {
  /** Provider-neutral category name to score in [0, 1]. */
  [category: string]: number;
}

export interface ModerationResult {
  scores: ModerationScores;
  provider: string;
  model: string;
}

export interface ModerationProvider {
  readonly name: string;
  readonly model: string;
  moderate(inputs: ModerationInput[]): Promise<ModerationResult>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export interface StoredObject {
  key: string;
  url: string;
  bytes: number;
}

export interface StorageProvider {
  readonly name: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}
