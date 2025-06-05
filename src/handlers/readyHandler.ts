import { Client, Events } from "discord.js";
import {ClientReadyHandler, DiscordHandler} from "../DiscordHandler/DiscordHandler";

 class ReadyHandler implements ClientReadyHandler {
    eventType: Events.ClientReady = Events.ClientReady;

    execute([], {logger}) {
        logger.debug("ready called")
    }
    getName(): string {
        return "some test ready handler"
    }

}

export default ReadyHandler