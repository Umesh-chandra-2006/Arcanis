import type { ProviderOutcome } from "../../shared/providers";

export type ProviderErrorKind = Exclude<ProviderOutcome, "success">;

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    readonly provider: string,
    message: string,
    readonly status?: number
  ) {
    super(`[${provider}] ${kind}: ${message}`);
    this.name = "ProviderError";
  }
}

const RETIRED = /decommission|deprecat|no longer supported|model.*(not found|does not exist|not available)|not a valid model|unknown model|is not found for api version/i;
const QUOTA = /quota|credits|billing|insufficient_quota|exceeded your|daily limit|limit reached|resource.?exhausted|payment required/i;

/** Maps an HTTP failure from any provider to one error kind. */
export function classifyHttpError(provider: string, status: number, body: string): ProviderError {
  const text = body.slice(0, 400);
  let kind: ProviderErrorKind;
  if (status === 402) kind = "quota";
  else if (status === 401 || status === 403) kind = "auth";
  else if ((status === 404 || status === 410 || status === 400) && RETIRED.test(body)) kind = "model_retired";
  else if (status === 429) kind = QUOTA.test(body) && !/temporarily|upstream|retry shortly/i.test(body) ? "quota" : "rate_limited";
  else if (status === 408 || status === 504) kind = "timeout";
  else if (status >= 500) kind = "server";
  else kind = "bad_response";
  return new ProviderError(kind, provider, `HTTP ${status} ${text}`, status);
}

/** Normalizes thrown values (aborts, network failures) into ProviderError. */
export function toProviderError(provider: string, error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new ProviderError("timeout", provider, error.message);
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ProviderError("network", provider, message);
}

/** fetch with a timeout; non-2xx responses become classified ProviderErrors. */
export async function providerFetch(
  provider: string,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw toProviderError(provider, error);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw classifyHttpError(provider, response.status, body);
  }
  return response;
}

export class AllProvidersFailedError extends Error {
  constructor(readonly errors: ProviderError[]) {
    super(`All providers failed: ${errors.map((e) => `${e.provider}:${e.kind}`).join(", ") || "none configured"}`);
    this.name = "AllProvidersFailedError";
  }

  /** True when every failure was a free-quota exhaustion (trips the daily breaker). */
  get quotaExhausted(): boolean {
    return this.errors.length > 0 && this.errors.every((e) => e.kind === "quota");
  }
}
