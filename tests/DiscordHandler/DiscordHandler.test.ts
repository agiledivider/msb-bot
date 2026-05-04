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
