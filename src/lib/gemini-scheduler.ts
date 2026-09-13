import { GoogleGenAI } from "@google/genai";
import { GeminiModelId } from "@/types";
import { getDailyRateLimitDoc, saveDailyRateLimitDoc } from "./firestore";

// =========================================================================
// 1. GEMINI 3 MODEL SPECS & RATE LIMIT DEFINITIONS
// Zero-billing model chain ordered by free-tier headroom
// Live verified: gemini-3.1-flash-lite (sunset May 2027), 3.5-flash-lite, 3.7-flash
// Never fallback to gemini-3.8-flash (20 RPD) or deprecated Gemini 2.x
// =========================================================================

export interface ModelTierSpec {
  modelId: GeminiModelId;
  name: string;
  rpm: number;
  safeIntervalMs: number; // safe delay between back-to-back requests
  dailyLimit: number; // approximate free tier RPD
  tier: "primary" | "fallback_1" | "fallback_2";
}

export const GEMINI_3_MODEL_CHAIN: ModelTierSpec[] = [
  {
    modelId: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite (Primary GA)",
    rpm: 30,
    safeIntervalMs: 2500, // 2.5s safe spacing for 30 RPM
    dailyLimit: 1500,
    tier: "primary",
  },
  {
    modelId: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite (Fallback 1)",
    rpm: 15,
    safeIntervalMs: 4500, // 4.5s safe spacing for 15 RPM
    dailyLimit: 500,
    tier: "fallback_1",
  },
  {
    modelId: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash (Last-Resort Fallback)",
    rpm: 10,
    safeIntervalMs: 6500, // 6.5s safe spacing for 10-15 RPM
    dailyLimit: 200,
    tier: "fallback_2",
  },
];

// =========================================================================
// 2. PACIFIC MIDNIGHT TIME UTILITIES
// Google Gemini API free-tier quotas reset at 00:00:00 Pacific Time daily
// =========================================================================

/**
 * Returns current date string in Pacific Time: "YYYY-MM-DD"
 */
export function getPacificDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Calculates milliseconds until the next 00:00:00 Pacific Time
 */
export function getMillisUntilPacificMidnight(now: Date = new Date()): {
  millis: number;
  resetDatePacific: string;
  resetIsoString: string;
} {
  // Get Pacific time string e.g. "2026-09-13T16:45:00"
  const pacificFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = pacificFormatter.formatToParts(now);
  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }

  const pacificHour = partMap.hour === 24 ? 0 : partMap.hour;
  const pacificMin = partMap.minute || 0;
  const pacificSec = partMap.second || 0;

  // Remaining seconds in current Pacific day
  const secondsElapsedInDay = pacificHour * 3600 + pacificMin * 60 + pacificSec;
  const secondsRemainingInDay = Math.max(1, 86400 - secondsElapsedInDay);
  const millisRemaining = secondsRemainingInDay * 1000;

  const nextMidnightUtc = new Date(now.getTime() + millisRemaining);

  return {
    millis: millisRemaining,
    resetDatePacific: getPacificDateString(new Date(now.getTime() + 86400000)),
    resetIsoString: nextMidnightUtc.toISOString(),
  };
}

export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Simple key hash for logging / storage without leaking key secrets
export function hashKey(key: string): string {
  if (!key) return "empty";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  const suffix = key.length > 4 ? key.slice(-4) : key;
  return `${hex}_${suffix}`;
}

export function maskKey(key: string): string {
  if (!key) return "(no key)";
  if (key.length <= 8) return "••••" + key.slice(-2);
  return key.slice(0, 4) + "••••" + key.slice(-4);
}

// =========================================================================
// 3. MULTI-ACCOUNT KEY ROTATION POOL
// Supports up to 3 developer API keys from environment + optional custom key
// =========================================================================

export interface KeyPoolItem {
  index: number;
  key: string;
  hash: string;
  masked: string;
  source: "env_key_1" | "env_key_2" | "env_key_3" | "client_override";
}

export function getKeyRotationPool(customApiKey?: string): KeyPoolItem[] {
  const pool: KeyPoolItem[] = [];

  // If a custom key is provided in header/settings, it gets tried first as index 0
  if (customApiKey && customApiKey.trim()) {
    const trimmed = customApiKey.trim();
    pool.push({
      index: pool.length,
      key: trimmed,
      hash: hashKey(trimmed),
      masked: maskKey(trimmed),
      source: "client_override",
    });
  }

  // Developer Server-Side Keys: Up to 3 Google accounts
  const envKeys: { key?: string; source: "env_key_1" | "env_key_2" | "env_key_3" }[] = [
    { key: process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY, source: "env_key_1" },
    { key: process.env.GEMINI_API_KEY_2, source: "env_key_2" },
    { key: process.env.GEMINI_API_KEY_3, source: "env_key_3" },
  ];

  for (const item of envKeys) {
    if (item.key && item.key.trim()) {
      const trimmed = item.key.trim();
      // Avoid duplicate keys in pool
      if (!pool.some((p) => p.key === trimmed)) {
        pool.push({
          index: pool.length,
          key: trimmed,
          hash: hashKey(trimmed),
          masked: maskKey(trimmed),
          source: item.source,
        });
      }
    }
  }

  return pool;
}

// =========================================================================
// 4. PROACTIVE SCHEDULER & RATE LIMITER STATE
// =========================================================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Track last call timestamps in-memory: keyHash:modelId -> timestamp
const lastCallTimestamps = new Map<string, number>();

// Track temporary in-memory cooldowns (e.g. from 429 retry-after): keyHash:modelId -> cooldownUntilTimestamp
const temporaryCooldowns = new Map<string, number>();

export class QuotaWallError extends Error {
  public resetTimePacific: string;
  public resetIsoString: string;
  public millisRemaining: number;
  public formattedRemaining: string;

  constructor(resetInfo: {
    resetDatePacific: string;
    resetIsoString: string;
    millis: number;
  }) {
    const formatted = formatTimeRemaining(resetInfo.millis);
    super(
      `Today's free quota is used up on all accounts — this will automatically continue after Pacific midnight (${resetInfo.resetDatePacific} 00:00 PT, in ${formatted}).`
    );
    this.name = "QuotaWallError";
    this.resetTimePacific = resetInfo.resetDatePacific;
    this.resetIsoString = resetInfo.resetIsoString;
    this.millisRemaining = resetInfo.millis;
    this.formattedRemaining = formatted;
  }
}

// Error inspection helpers
function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  const msg = String(err) + " " + JSON.stringify(err);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("Quota exceeded") ||
    msg.includes("rate limit")
  );
}

function isInvalidKeyError(err: unknown): boolean {
  if (!err) return false;
  const msg = String(err) + " " + JSON.stringify(err);
  return (
    msg.includes("API_KEY_INVALID") ||
    msg.includes("invalid api key") ||
    msg.includes("API key not valid") ||
    msg.includes("Forbidden") ||
    msg.includes("403")
  );
}

function isOverloaded503Error(err: unknown): boolean {
  if (!err) return false;
  const msg = String(err) + " " + JSON.stringify(err);
  return (
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("overloaded") ||
    msg.includes("The model is overloaded")
  );
}

/**
 * Parses retryDelay or Retry-After seconds from Gemini 429 errors
 */
function parseRetryDelayMs(err: unknown): number | null {
  if (!err) return null;

  const errObj = err as Record<string, unknown>;
  const errorObj = errObj.error as Record<string, unknown> | undefined;
  const details = (errorObj?.details || errObj.details) as unknown[];

  if (Array.isArray(details)) {
    for (const d of details) {
      if (typeof d === "object" && d !== null && "retryDelay" in d) {
        const delayStr = String((d as Record<string, unknown>).retryDelay);
        const sec = parseFloat(delayStr.replace(/s$/i, ""));
        if (!isNaN(sec) && sec > 0) return Math.ceil(sec * 1000);
      }
    }
  }

  const text = String(err) + " " + JSON.stringify(err);
  const match = text.match(/retry\s+(?:after|in)\s+([0-9.]+)\s*s/i);
  if (match && match[1]) {
    const sec = parseFloat(match[1]);
    if (!isNaN(sec) && sec > 0) return Math.ceil(sec * 1000);
  }

  return null;
}

export interface SchedulerProgressUpdate {
  message: string;
  isWaiting?: boolean;
  waitSecondsRemaining?: number;
  modelUsed?: string;
  keyIndex?: number;
  keyMask?: string;
  isFallbackModel?: boolean;
  isKeyRotated?: boolean;
}

export interface ExecutionResult<T = unknown> {
  response: T;
  modelUsed: GeminiModelId;
  keyIndexUsed: number;
  keyMaskUsed: string;
  isFallbackModelUsed: boolean;
  isKeyRotated: boolean;
  totalCallsToday: number;
}

// =========================================================================
// 5. MAIN SCHEDULER EXECUTION ENGINE
// =========================================================================

export async function executeGeminiWithScheduler<T = unknown>(
  callFn: (ai: GoogleGenAI, modelId: GeminiModelId) => Promise<T>,
  options: {
    customApiKey?: string;
    preferredModel?: GeminiModelId;
    onProgress?: (update: SchedulerProgressUpdate) => void;
  } = {}
): Promise<ExecutionResult<T>> {
  const keys = getKeyRotationPool(options.customApiKey);

  if (keys.length === 0) {
    throw new Error(
      "No Gemini API keys found. Please configure GEMINI_API_KEY_1 in .env.local or enter your key in Settings."
    );
  }

  const todayPacific = getPacificDateString();

  // Model chain: if preferredModel is specified and in chain, start with it, else start with primary
  const chain: ModelTierSpec[] = [...GEMINI_3_MODEL_CHAIN];
  if (options.preferredModel) {
    const idx = chain.findIndex((m) => m.modelId === options.preferredModel);
    if (idx > 0) {
      // Move preferred model to front, keep remaining order
      const [preferred] = chain.splice(idx, 1);
      chain.unshift(preferred);
    }
  }

  // Multi-account key rotation matrix: Model Tier -> Key Pool
  for (let modelIdx = 0; modelIdx < chain.length; modelIdx++) {
    const modelSpec = chain[modelIdx];
    const isFallbackModel = modelIdx > 0;

    for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
      const keyItem = keys[keyIdx];
      const isKeyRotated = keyIdx > 0;
      const keyModelKey = `${keyItem.hash}:${modelSpec.modelId}`;
      const docId = `${todayPacific}_${keyItem.hash}_${modelSpec.modelId}`;

      // Check Firestore daily quota counter for this key+model
      let dailyRecord = await getDailyRateLimitDoc(docId);
      if (!dailyRecord) {
        dailyRecord = {
          date: todayPacific,
          model: modelSpec.modelId,
          keyHash: keyItem.hash,
          callCount: 0,
          lastCallTimestamp: 0,
          isExhausted: false,
          updatedAt: new Date().toISOString(),
        };
      }

      // Check if this key+model has already exhausted its daily quota
      if (dailyRecord.isExhausted || dailyRecord.callCount >= modelSpec.dailyLimit) {
        console.info(
          `[Scheduler] Skipping ${modelSpec.modelId} on ${keyItem.masked}: daily quota exhausted (${dailyRecord.callCount}/${modelSpec.dailyLimit})`
        );
        continue;
      }

      // Check if under temporary cooldown from a recent 429
      const cooldownUntil = temporaryCooldowns.get(keyModelKey) || 0;
      const now = Date.now();
      if (cooldownUntil > now) {
        const remainingCooldownMs = cooldownUntil - now;
        console.info(
          `[Scheduler] Key ${keyItem.masked} on ${modelSpec.modelId} in cooldown for another ${Math.ceil(
            remainingCooldownMs / 1000
          )}s`
        );
        continue;
      }

      // -------------------------------------------------------------------
      // PROACTIVE PACING: Never send a new request sooner than safe interval
      // -------------------------------------------------------------------
      const lastCallTime = Math.max(
        lastCallTimestamps.get(keyModelKey) || 0,
        dailyRecord.lastCallTimestamp || 0
      );
      const timeSinceLast = now - lastCallTime;

      if (timeSinceLast < modelSpec.safeIntervalMs) {
        const waitMs = modelSpec.safeIntervalMs - timeSinceLast;
        const waitSec = Math.ceil(waitMs / 1000);

        if (options.onProgress && waitMs > 400) {
          options.onProgress({
            message: `Proactive rate-limiter: spacing call by ${waitSec}s for ${modelSpec.name}...`,
            isWaiting: true,
            waitSecondsRemaining: waitSec,
            modelUsed: modelSpec.modelId,
            keyIndex: keyIdx,
            keyMask: keyItem.masked,
            isFallbackModel,
            isKeyRotated,
          });
        }

        await sleep(waitMs);
      }

      // Initialize GoogleGenAI with this active key
      const ai = new GoogleGenAI({ apiKey: keyItem.key });

      // -------------------------------------------------------------------
      // 503 OVERLOAD HANDLING: 3 exponential backoff retries on the SAME key+model
      // -------------------------------------------------------------------
      const backoff503Delays = [2000, 4000, 8000];
      let attemptSuccess = false;
      let responseResult: T | null = null;

      for (let attempt503 = 0; attempt503 <= backoff503Delays.length; attempt503++) {
        try {
          // Record invocation timestamp before making the call
          lastCallTimestamps.set(keyModelKey, Date.now());

          responseResult = await callFn(ai, modelSpec.modelId);
          attemptSuccess = true;

          // Increment daily count in Firestore
          dailyRecord.callCount += 1;
          dailyRecord.lastCallTimestamp = Date.now();
          dailyRecord.updatedAt = new Date().toISOString();
          await saveDailyRateLimitDoc(docId, dailyRecord);

          return {
            response: responseResult,
            modelUsed: modelSpec.modelId,
            keyIndexUsed: keyIdx,
            keyMaskUsed: keyItem.masked,
            isFallbackModelUsed: isFallbackModel,
            isKeyRotated,
            totalCallsToday: dailyRecord.callCount,
          };
        } catch (err: unknown) {

          // 1. If 503 (temporary overload), retry on the SAME model+key with backoff
          if (isOverloaded503Error(err)) {
            if (attempt503 < backoff503Delays.length) {
              const delay = backoff503Delays[attempt503];
              const attemptNum = attempt503 + 1;
              const retryMsg = `Model busy (503 overload), retrying attempt ${attemptNum}/3 in ${delay / 1000}s on ${modelSpec.modelId}...`;
              console.warn(`[Scheduler 503] ${retryMsg}`);

              if (options.onProgress) {
                options.onProgress({
                  message: retryMsg,
                  isWaiting: true,
                  waitSecondsRemaining: delay / 1000,
                  modelUsed: modelSpec.modelId,
                  keyIndex: keyIdx,
                  keyMask: keyItem.masked,
                  isFallbackModel,
                  isKeyRotated,
                });
              }

              await sleep(delay);
              continue; // retry 503 loop
            } else {
              // Exceeded 503 retries on this key/model, break out to rotate
              console.warn(`[Scheduler] 503 retries exhausted on ${modelSpec.modelId}, rotating key/model...`);
              break;
            }
          }

          // 2. If 429 Quota Exceeded
          if (isQuotaExceededError(err)) {
            const retryDelayMs = parseRetryDelayMs(err);

            if (retryDelayMs && retryDelayMs <= 45000) {
              // It's a short RPM pacing window. Wait the exact duration if under 45s.
              const waitSec = Math.ceil(retryDelayMs / 1000);
              console.warn(`[Scheduler 429] Pacing wait of ${waitSec}s requested by Gemini API.`);

              if (options.onProgress) {
                options.onProgress({
                  message: `Rate limit reached (429). Waiting ${waitSec}s as directed by API before rotating...`,
                  isWaiting: true,
                  waitSecondsRemaining: waitSec,
                  modelUsed: modelSpec.modelId,
                  keyIndex: keyIdx,
                  keyMask: keyItem.masked,
                });
              }

              // Set temporary cooldown for this key+model
              temporaryCooldowns.set(keyModelKey, Date.now() + retryDelayMs);
              // Wait exact delay
              await sleep(retryDelayMs);
              // Break out of attempt loop to rotate key/model
              break;
            } else {
              // Quota exhausted for the day on this key+model
              console.warn(
                `[Scheduler 429] Daily quota exhausted on ${keyItem.masked} for ${modelSpec.modelId}. Rotating...`
              );
              dailyRecord.isExhausted = true;
              dailyRecord.updatedAt = new Date().toISOString();
              await saveDailyRateLimitDoc(docId, dailyRecord);
              temporaryCooldowns.set(keyModelKey, Date.now() + 60000); // 60s cooldown if not reset
              break; // break to rotate to next key
            }
          }

          // 3. If Invalid Key (403 / API_KEY_INVALID)
          if (isInvalidKeyError(err)) {
            console.error(`[Scheduler] Key ${keyItem.masked} is invalid or forbidden. Marking exhausted.`);
            dailyRecord.isExhausted = true;
            await saveDailyRateLimitDoc(docId, dailyRecord);
            break; // rotate to next key
          }

          // Other unexpected errors
          console.error(
            `[Scheduler] Error on ${modelSpec.modelId} with ${keyItem.masked}:`,
            err instanceof Error ? err.message : String(err)
          );
          break; // rotate
        }
      } // end 503 attempt loop

      if (attemptSuccess) break;
    } // end key loop
  } // end model loop

  // -------------------------------------------------------------------------
  // ALL 3 KEYS × 3 MODELS EXHAUSTED: TRIGGER PACIFIC MIDNIGHT QUOTA WALL
  // -------------------------------------------------------------------------
  const resetInfo = getMillisUntilPacificMidnight();
  console.warn(
    `[Scheduler] ALL models and rotated keys exhausted. Quota Wall reached. Resets in ${formatTimeRemaining(
      resetInfo.millis
    )}`
  );

  throw new QuotaWallError(resetInfo);
}
