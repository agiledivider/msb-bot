import {Client, Events} from "discord.js";
import {ClientReadyHandler, DiscordHandler} from "../../../src/DiscordHandler/DiscordHandler";

class TestReadyHandler implements ClientReadyHandler {
    eventType: Events.ClientReady = Events.ClientReady
    getName(): string {
        return "testService2"
    }
    run(client: Client, handler: DiscordHandler) {
        console.log("ready called")
        handler.service("testService")?.call()
    }
}
export default TestReadyHandler;
