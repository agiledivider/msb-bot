import {describe, expect, test, beforeEach, mock} from "bun:test";
import {DiscordHandler} from "../../src/DiscordHandler/DiscordHandler";
import {Client} from "discord.js";
import pino from "pino";

const logger = pino({
    level: 'silent'
})


describe("Discord Handler - Services", () => {

    beforeEach(() => {
        mock.restore()
    })

    test("test adding service", async () => {
        const testService = {
            name: "test",
        }
        const discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client ({intents: [] }),
            logger
        })
        discordHandler.addService('testService', testService)

        expect(discordHandler.service('testService')).toBe(testService)
    })

})

describe("Discord Handler - Events", () => {
    test("is event", async () => {
        const discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client ({intents: [] }),
            logger
        })
        expect(discordHandler.isEvent('ready')).toBeTrue()
    })

    test("is not event", async () => {
        const discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client ({intents: [] }),
            logger
        })
        expect(discordHandler.isEvent('someRandomNotExistingEventName')).toBeFalse()
    })
});

describe("Discord Handler - constructed without a logger", () => {
    test("constructor and start() do not throw when logger is omitted", () => {
        const discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client({ intents: [] }),
        })
        expect(() => discordHandler.start()).not.toThrow()
    })

    test("addService and service still work without an explicit logger", () => {
        const discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client({ intents: [] }),
        })
        discordHandler.addService("svc", { value: 1 })
        expect(discordHandler.service("svc")).toEqual({ value: 1 })
    })
});
