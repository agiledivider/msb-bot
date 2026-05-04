import { describe, expect, test, beforeEach } from "bun:test";
import { z } from "zod";
import {
  registerConfigSlice,
  validateConfig,
  validateConfigWith,
  _resetCollectedConfigSlicesForTesting,
} from "../../src/Services/registry";

describe("registry — registerConfigSlice / validateConfig", () => {
  beforeEach(() => {
    _resetCollectedConfigSlicesForTesting();
  });

  test("registering the same key twice throws", () => {
    registerConfigSlice({ alpha: z.object({ x: z.string() }) });
    expect(() =>
      registerConfigSlice({ alpha: z.object({ y: z.number() }) }),
    ).toThrow(/already registered/);
  });

  test("validateConfig is a no-op when nothing is registered", () => {
    expect(validateConfig({ anything: 123 })).toEqual({ anything: 123 });
  });

  test("validateConfig throws with a path-specific message on missing field", () => {
    registerConfigSlice({
      spaceStateInfo: z.object({
        channelId: z.string(),
        mqttTopic: z.string(),
      }),
    });
    expect(() => validateConfig({ spaceStateInfo: { channelId: "abc" } }))
      .toThrow(/spaceStateInfo\.mqttTopic/);
  });

  test("validateConfig throws on wrong type", () => {
    registerConfigSlice({
      foo: z.object({ count: z.number() }),
    });
    expect(() => validateConfig({ foo: { count: "not-a-number" } })).toThrow(
      /foo\.count/,
    );
  });

  test("validateConfig succeeds on a well-formed config", () => {
    registerConfigSlice({
      foo: z.object({ count: z.number() }),
      bar: z.object({ flag: z.boolean() }),
    });
    expect(() =>
      validateConfig({ foo: { count: 1 }, bar: { flag: true } }),
    ).not.toThrow();
  });

  test("multiple slices merge under one validation call", () => {
    registerConfigSlice({ a: z.object({ x: z.string() }) });
    registerConfigSlice({ b: z.object({ y: z.number() }) });
    // missing both
    expect(() => validateConfig({})).toThrow(/a/);
    expect(() => validateConfig({})).toThrow(/b/);
  });
});

describe("registry — validateConfigWith (pure helper)", () => {
  test("returns parsed data on success", () => {
    const slices = { foo: z.object({ x: z.string() }) };
    expect(validateConfigWith(slices, { foo: { x: "ok" } })).toEqual({
      foo: { x: "ok" },
    });
  });

  test("returns input unchanged when slice map is empty", () => {
    expect(validateConfigWith({}, { whatever: true })).toEqual({
      whatever: true,
    });
  });
});
