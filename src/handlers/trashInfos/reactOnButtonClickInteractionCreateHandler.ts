import {ButtonInteraction, Client, Events, Interaction} from "discord.js";
import {ClientReadyHandler, DiscordHandler, InteractionCreateHandler} from "../../DiscordHandler/DiscordHandler";

class ButtonHandler implements InteractionCreateHandler {
    eventType: Events.InteractionCreate = Events.InteractionCreate
    run(client: Client, handler: DiscordHandler) {
        console.log("ready called")
    }
    execute([interaction], {trashDiscordService}) {
        trashDiscordService.handleButtonClick(interaction)
    }
    getName(): string {
        return "some test ready handler"
    }

}

export default ButtonHandler