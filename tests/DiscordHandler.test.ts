import {describe, expect, test, beforeEach, mock} from "bun:test";
import {DiscordHandler} from "../src/DiscordHandler";
import {Client, Events} from "discord.js";

describe("Discord Handler - Services", () => {

    beforeEach(() => {
        mock.restore()
    })

    test("test empty services", async () => {
        const discordHandler = new DiscordHandler({
            client: new Client({intents: [] }),
            handlerPath: ""
        })
    })

    test("test adding service", async () => {
        const testService = {
            name: "test",
        }
        const discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client ({intents: [] })
        })
        discordHandler.addService('testService', testService)

        expect(discordHandler.service('testService')).toBe(testService)
    })

})

describe("Discord Handler - Events", () => {
    test("is event", async () => {
        const discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client ({intents: [] })
        })
        expect(discordHandler.isEvent('ready')).toBeTrue()
    })

    test("is not event", async () => {
        const discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client ({intents: [] })
        })
        expect(discordHandler.isEvent('someRandomNotExistingEventName')).toBeFalse()
    })

    
});
