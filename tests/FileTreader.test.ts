import {beforeEach, describe, expect, mock, test} from "bun:test";
import {DiscordHandler} from "../src/DiscordHandler";
import {Client} from "discord.js";


async function initTestHandler(testDirectory: string) {
    const testService = mock(() => {})
    const client = new Client ({intents: [] })
    const discordHandler = new DiscordHandler({
        handlerPath: __dirname + "/testData/" + testDirectory,
        client
    })
    await discordHandler.registerActions()
    discordHandler.addService("testService", testService)
    return {testService, client, discordHandler}
}

describe("Discord Command Loader", () => {

    beforeEach(() => {
    })

    test("load commnd from path",
        async () => {
            const {testService, client } = await initTestHandler("singleEvent")
            expect(testService).not.toHaveBeenCalled()
            // @ts-ignore
            client.emit("ready")
            expect(testService).toHaveBeenCalled()
        })

    test("load command subfolder", async () => {
        const {testService, client} = await initTestHandler("subfolders")
        expect(testService).not.toHaveBeenCalled()
        // @ts-ignore
        client.emit("ready")
        expect(testService).toBeCalledTimes(1)
    })

    test("load commnd subfolder", async () => {
        const {testService, client} = await initTestHandler("multipleEvents")

        expect(testService).not.toHaveBeenCalled()
        // @ts-ignore
        client.emit("ready")
        expect(testService).toBeCalledTimes(2)
    })
});
