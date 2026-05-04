// Central registry. Both `Services` and `Config` are augmentable via
// `declare module "../Services/registry"` from any service or handler
// file; TypeScript merges all declarations into one type at compile time.
//
// Runtime side: handlers/services that read config also call
// `registerConfigSlice(...)` at module top-level. The framework merges
// every collected slice into one Zod schema and validates the loaded
// config inside `DiscordHandler.start()`. Schemas + types stay in sync
// because the type augmentation derives from `z.infer<typeof slice>`.

import { Client } from "discord.js";
import { Logger } from "pino";
import { z } from "zod";

// Augmentable. Each handler/service that reads msb.config.json declares
// its slice via module augmentation alongside `registerConfigSlice`.
export interface Config {
  // Intentionally empty — augmentations contribute every field.
}

// Augmentable. The framework provides client/logger/config out of the
// box; project services augment this interface from their own modules.
export interface Services {
  client: Client;
  logger: Logger;
  config: Config;
}

// ---- Runtime config validation -----------------------------------------

const collectedConfigSlices: Record<string, z.ZodTypeAny> = {};

// Registers a config slice. Called at module top-level by services and
// handlers. The argument is a record of top-level config keys → Zod
// schemas. The merged result is returned so callers can derive a type
// via `z.infer<typeof slice>` and use it in their `declare module`
// augmentation, keeping schema and type in sync.
export function registerConfigSlice<S extends z.ZodRawShape>(
  shape: S,
): z.ZodObject<S> {
  for (const [key, sub] of Object.entries(shape)) {
    if (collectedConfigSlices[key]) {
      throw new Error(
        `Config slice "${key}" is already registered. Each top-level config key may only be registered once.`,
      );
    }
    // Zod 4 returns `$ZodType` from Object.entries on a raw shape;
    // narrow it back to the public `ZodTypeAny` for storage.
    collectedConfigSlices[key] = sub as z.ZodTypeAny;
  }
  return z.object(shape);
}

// Pure helper exposed for testing. Validates a raw object against an
// explicit slice map.
export function validateConfigWith(
  slices: Record<string, z.ZodTypeAny>,
  raw: unknown,
): unknown {
  if (Object.keys(slices).length === 0) return raw;
  const merged = z.object(slices);
  const result = merged.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(`Config validation failed:\n${issues}`);
  }
  return result.data;
}

// Validates the runtime config against every registered slice. Called
// from `DiscordHandler.start()`. No-op if nothing has been registered,
// so legacy code paths are unaffected.
export function validateConfig(raw: unknown): unknown {
  return validateConfigWith(collectedConfigSlices, raw);
}

// Test-only helper. Resets the collected slice map so test cases can
// register their own slices without leaking state across cases.
export function _resetCollectedConfigSlicesForTesting(): void {
  for (const key of Object.keys(collectedConfigSlices)) {
    delete collectedConfigSlices[key];
  }
}
