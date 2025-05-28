import {describe, expect, test, beforeEach, mock} from "bun:test";
import {DiscordHandler} from "../../src/DiscordHandler/DiscordHandler";
import {Client} from "discord.js";

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

class TestClass {
}

describe("Discord Handler - Events with context", () => {
    test("test context", async () => {
        let discordHandler = new DiscordHandler({
            handlerPath: "",
            client: new Client ({intents: [] })
        })

        //discordHandler.decorate('version', '1.0')
        discordHandler = discordHandler
            .decorate({ environment: 'dev' })
            .decorate({ version: '1.0' })
            .decorate('testClass', new TestClass())
            .use((ctx) => {
                console.log("test decorator", ctx)
                expect(ctx.version).toBe('1.0')
                expect(ctx.environment).toBe('dev')
                expect(ctx.testClass).toBeInstanceOf(TestClass)
            })

        discordHandler.executeHandlers()

    })
})


