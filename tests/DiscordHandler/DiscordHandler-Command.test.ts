import {describe, expect, test, beforeEach, mock} from "bun:test";
import {Client} from "discord.js";
import {DiscordHandler} from "../../src/DiscordHandler/DiscordHandler";

async function initTestHandler(testDirectory: string) {
    const testService = mock(() => {})
    const client = new Client ({ intents: [] })
    const discordHandler = new DiscordHandler({
        handlerPath: __dirname + "/../testData/" + testDirectory,
        client
    })
    discordHandler.addService("testService", testService)
    return {testService, client, discordHandler}
}

describe("Discord Handler - Commands", () => {
    test("test adding command", async () => {
        const {testService, client, discordHandler} = await initTestHandler("singleCommand")
        expect(discordHandler.commands.size).toBe(1)
    })
})