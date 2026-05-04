import { describe, expect, test, beforeEach } from "bun:test";
import { Client, Events } from "discord.js";
import { DiscordHandler } from "../../src/DiscordHandler/DiscordHandler";
import pino from "pino";
import TypedTestHandler from "../testData/typedHandler/typed";

const logger = pino({ level: "silent" });

const fixturePath = __dirname + "/../testData/typedHandler";

function newHandler() {
  return new DiscordHandler({
    handlerPath: fixturePath,
    client: new Client({ intents: [] }),
    logger,
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
