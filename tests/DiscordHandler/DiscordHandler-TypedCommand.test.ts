import { describe, expect, test, beforeEach } from "bun:test";
import { Client, Events } from "discord.js";
import { DiscordHandler } from "../../src/DiscordHandler/DiscordHandler";
import pino from "pino";
import { captures } from "../testData/typedCommand/typedCmd";

const logger = pino({ level: "silent" });

const fixturePath = __dirname + "/../testData/typedCommand";

function newHandler() {
  return new DiscordHandler({
    handlerPath: fixturePath,
    client: new Client({ intents: [] }),
    logger,
  });
}

// Minimal fake — covers the surface the dispatcher actually touches.
function fakeChatInputInteraction(commandName: string) {
  return {
    isCommand: () => true,
    isChatInputCommand: () => true,
    commandName,
    reply: () => {},
  };
}

describe("DiscordHandler - typed command dispatch", () => {
  beforeEach(() => {
    captures.ctx = null;
    captures.interaction = null;
  });

  test("registers a typed command in the commands map", () => {
    const h = newHandler();
    expect(h.commands.size).toBe(1);
    expect(h.commands.has("typed-cmd-test")).toBe(true);
  });

  test("start() throws when a typed command's needs are unmet", () => {
    const h = newHandler();
    expect(() => h.start()).toThrow(/myService/);
  });

  test("dispatches a chat-input interaction with a Pick'd ctx", async () => {
    const h = newHandler();
    h.addService("myService", { mark: 7 });
    h.addService("unrelatedService", { shouldNotAppear: true });
    h.start();

    (h as any).client.emit(
      Events.InteractionCreate,
      fakeChatInputInteraction("typed-cmd-test"),
    );

    // Allow the awaited dispatch in the listener to settle.
    await new Promise((r) => setTimeout(r, 0));

    expect(captures.ctx).not.toBeNull();
    expect(Object.keys(captures.ctx!).sort()).toEqual(["logger", "myService"]);
    expect(captures.ctx!.myService).toEqual({ mark: 7 });
    expect("unrelatedService" in captures.ctx!).toBe(false);
    expect("client" in captures.ctx!).toBe(false);
    expect("discordHandler" in captures.ctx!).toBe(false);
  });

  test("interaction is forwarded to the handler", async () => {
    const h = newHandler();
    h.addService("myService", {});
    h.start();

    const fake = fakeChatInputInteraction("typed-cmd-test");
    (h as any).client.emit(Events.InteractionCreate, fake);
    await new Promise((r) => setTimeout(r, 0));

    expect(captures.interaction).toBe(fake as any);
  });
});
