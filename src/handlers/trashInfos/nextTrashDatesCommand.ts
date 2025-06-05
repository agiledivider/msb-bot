import {
    ApplicationCommandData,
    Client,
    Interaction,
    SlashCommandBuilder
} from "discord.js";
import {CommandHandler, DiscordHandler} from "../../DiscordHandler/DiscordHandler";

export class NextTrashDatesCommandHandler implements CommandHandler {

    command = new SlashCommandBuilder()
        .setName('muell')
        .setDescription('Gives the next trash dates.')
        .setDescriptionLocalizations({
            "de": "Nennt die nächsten Mülltermine."
        })
        .toJSON() as ApplicationCommandData

    async execute ({ interaction, trashService }) {
        if (!interaction.isChatInputCommand()) return
        console.log("colled the right trash handler")
        const x = await trashService.getNextTrashDates()
        let message = "die nächsten Termine sind: \n"
        x.forEach(trashDate => {
            message += `${trashDate.timeString()} - ${trashDate.type}\n`
        })

        interaction.reply({
            content: message
        });
    }
    async run(client: Client, interaction: Interaction, discordHandler: DiscordHandler): Promise<void> {
        console.log("colled the wrong trash handler")
    }

    getName(): string {
        return this.command.name
    }
}
