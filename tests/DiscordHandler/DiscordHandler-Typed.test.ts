import { describe, expect, test, beforeEach } from "bun:test";
import { Client, Events } from "discord.js";
import { z } from "zod";
import { DiscordHandler } from "../../src/DiscordHandler/DiscordHandler";
import {
  registerConfigSlice,
  _resetCollectedConfigSlicesForTesting,
} from "../../src/Services/registry";
import pino from "pino";
import TypedTestHandler from "../testData/typedHandler/typed";

const logger = pino({ level: "silent" });

const fixturePath = __dirname + "/../testData/typedHandler";

function newHandler(config?: object) {
  return new DiscordHandler({
    handlerPath: fixturePath,
    client: new Client({ intents: [] }),
    logger,
    config,
  });
}

describe("DiscordHandler - typed handler wiring", () => {
  beforeEach(() => {
    TypedTestHandler.lastCtx = null;
  });

  test("start() throws when a declared service is missing", () => {
    const h = newHandler();
    // `client` is provided by the framework; `myService` is not registered.
    expect(() => h.start()).toThrow(/myService/);
  });

  test("start() error names the offending handler", () => {
    const h = newHandler();
    expect(() => h.start()).toThrow(/typed-test-handler/);
  });

  test("start() succeeds once all needs are registered", () => {
    const h = newHandler();
    h.addService("myService", { mark: 1 });
    expect(() => h.start()).not.toThrow();
  });

  test("ctx passed to execute contains only declared services", () => {
    const h = newHandler();
    h.addService("myService", { mark: 42 });
    h.addService("unrelatedService", { shouldNotAppear: true });
    h.start();

    // simulate the Discord event firing
    (h as any).client.emit(Events.ClientReady, (h as any).client);

    expect(TypedTestHandler.lastCtx).not.toBeNull();
    const ctx = TypedTestHandler.lastCtx!;
    expect(Object.keys(ctx).sort()).toEqual(["client", "myService"]);
    expect(ctx.myService).toEqual({ mark: 42 });
    // unrelatedService must not leak into the typed ctx
    expect("unrelatedService" in ctx).toBe(false);
    // logger and discordHandler not declared, so absent
    expect("logger" in ctx).toBe(false);
    expect("discordHandler" in ctx).toBe(false);
  });
});

describe("DiscordHandler.start() — config validation", () => {
  beforeEach(() => {
    TypedTestHandler.lastCtx = null;
    _resetCollectedConfigSlicesForTesting();
  });

  test("throws when config is missing a required slice field", () => {
    registerConfigSlice({
      myFeature: z.object({ apiKey: z.string() }),
    });
    const h = newHandler({ myFeature: {} });
    h.addService("myService", {});
    expect(() => h.start()).toThrow(/myFeature\.apiKey/);
  });

  test("succeeds when config matches the registered slices", () => {
    registerConfigSlice({
      myFeature: z.object({ apiKey: z.string() }),
    });
    const h = newHandler({ myFeature: { apiKey: "secret" } });
    h.addService("myService", {});
    expect(() => h.start()).not.toThrow();
  });

  test("config validation runs after the service-availability check", () => {
    // service gap should still surface even if config is malformed —
    // service errors are reported first.
    registerConfigSlice({
      foo: z.object({ x: z.string() }),
    });
    const h = newHandler({ foo: {} });
    // myService is not registered
    expect(() => h.start()).toThrow(/myService/);
  });

  test("logs structured error via logger.error before throwing on config failure", () => {
    registerConfigSlice({
      myFeature: z.object({ apiKey: z.string() }),
    });
    const errorMessages: string[] = [];
    const captureLogger = {
      error: (...args: unknown[]) =>
        errorMessages.push(args.map((a) => String(a)).join(" ")),
      info: () => {},
      debug: () => {},
      warn: () => {},
      trace: () => {},
      fatal: () => {},
      child: () => captureLogger,
      level: "info",
    };
    const h = new DiscordHandler({
      handlerPath: fixturePath,
      client: new Client({ intents: [] }),
      logger: captureLogger as any,
      config: { myFeature: {} },
    });
    h.addService("myService", {});

    expect(() => h.start()).toThrow();
    expect(errorMessages.length).toBeGreaterThan(0);
    const combined = errorMessages.join("\n");
    expect(combined).toMatch(/Bot will not start/);
    expect(combined).toMatch(/config validation failed/i);
    expect(combined).toMatch(/myFeature\.apiKey/);
  });

  test("validates the framework's own guildId config slice", () => {
    // The framework registers `guildId` as a required string. Tests that
    // reset slices (above) wipe that registration; here we re-register
    // it explicitly so we can verify the framework's own dependency is
    // enforced end-to-end.
    registerConfigSlice({ guildId: z.string() });

    const h = new DiscordHandler({
      handlerPath: fixturePath,
      client: new Client({ intents: [] }),
      logger,
      // config provided but missing guildId
      config: {} as any,
    });
    h.addService("myService", {});
    expect(() => h.start()).toThrow(/guildId/);
  });

  test("logs structured error via logger.error before throwing on missing service", () => {
    const errorMessages: string[] = [];
    const captureLogger = {
      error: (...args: unknown[]) =>
        errorMessages.push(args.map((a) => String(a)).join(" ")),
      info: () => {},
      debug: () => {},
      warn: () => {},
      trace: () => {},
      fatal: () => {},
      child: () => captureLogger,
      level: "info",
    };
    const h = new DiscordHandler({
      handlerPath: fixturePath,
      client: new Client({ intents: [] }),
      logger: captureLogger as any,
    });
    // myService not registered → service requirement unmet
    expect(() => h.start()).toThrow();
    const combined = errorMessages.join("\n");
    expect(combined).toMatch(/Bot will not start/);
    expect(combined).toMatch(/myService/);
  });
});
