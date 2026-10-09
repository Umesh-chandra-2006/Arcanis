import { nanoid } from "nanoid";
import { getDb } from "../db";
import { p0ProviderCalls } from "../../drizzle/schema";
import type { CallContext } from "../../shared/providers";
import { toProviderError } from "./errors";

export interface Measured {
  units: Record<string, number>;
  costUsd: number;
}

interface CallMeta {
  ctx: CallContext;
  provider: string;
  model: string;
}

/**
 * Runs one provider call and records it in p0_provider_calls, success or not.
 * Every provider implementation goes through this, so no call site can skip
 * telemetry. A telemetry write failure never fails the call itself.
 */
export async function withTelemetry<T>(
  meta: CallMeta,
  call: () => Promise<T>,
  measure: (result: T) => Measured
): Promise<T> {
  const started = Date.now();
  try {
    const result = await call();
    const { units, costUsd } = measure(result);
    await record(meta, Date.now() - started, "success", units, costUsd, null);
    return result;
  } catch (error) {
    const err = toProviderError(meta.provider, error);
    await record(meta, Date.now() - started, err.kind, {}, 0, err.message);
    throw err;
  }
}

let warnedOnce = false;

async function record(
  meta: CallMeta,
  latencyMs: number,
  outcome: string,
  units: Record<string, number>,
  costUsd: number,
  errorMessage: string | null
): Promise<void> {
  if (outcome === "model_retired") {
    console.error(`[MODEL RETIRED] ${meta.provider} ${meta.model}: replace it in config. ${errorMessage ?? ""}`);
  }
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(p0ProviderCalls).values({
      id: nanoid(36),
      surface: meta.ctx.surface,
      provider: meta.provider,
      model: meta.model.slice(0, 128),
      units,
      latencyMs,
      costEstimateUsd: costUsd,
      outcome,
      errorMessage: errorMessage?.slice(0, 500) ?? null,
      userId: meta.ctx.userId ?? null,
      runId: meta.ctx.runId ?? null,
    });
  } catch (error) {
    // Warn once per process; a missing table would otherwise flood the log.
    if (!warnedOnce) {
      const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
      console.warn("[Telemetry] failed to record provider call:", message);
      warnedOnce = true;
    }
  }
}
