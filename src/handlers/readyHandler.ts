import { Client, Events } from "discord.js";
import {ClientReadyHandler, DiscordHandler} from "../DiscordHandler";

 class ReadyHandler implements ClientReadyHandler {
    eventType: Events.ClientReady = Events.ClientReady;
    run(client: Client, handler: DiscordHandler) {
        console.log("ready called")
    }
    getName(): string {
        return "some test ready handler"
    }

}

export default ReadyHandler