// Test fixture: a handler shaped like one produced by `defineEventHandler`.
// It carries a `requiredServices` array; the framework should use this
// to (a) verify availability at start() and (b) build a typed ctx
// containing only those services when the event fires.

import { Events } from "discord.js";

export default class TypedTestHandler {
  eventType = Events.ClientReady;
  requiredServices = ["myService", "client"] as const;

  // Captures the ctx the framework passed in, so the test can assert on it.
  static lastCtx: Record<string, unknown> | null = null;

  getName(): string {
    return "typed-test-handler";
  }

  execute(_args: unknown[], ctx: Record<string, unknown>) {
    TypedTestHandler.lastCtx = ctx;
  }
}
