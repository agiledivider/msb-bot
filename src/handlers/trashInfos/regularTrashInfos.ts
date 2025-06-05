import { Client, Events } from "discord.js";
import {ClientReadyHandler, DiscordHandler} from "../../DiscordHandler/DiscordHandler";
import {TrashDiscordService} from "../../Services/trashDiscordService";

class RegularTrashInfosCommandHandler implements ClientReadyHandler {
    eventType: Events.ClientReady = Events.ClientReady;
    run(client: Client, handler: DiscordHandler) {
        console.log("ready called")
    }

    execute([], {logger, discordHandler, client, trashService}) {

    }
    getName(): string {
        return "some test ready handler"
    }

}

export default RegularTrashInfosCommandHandler