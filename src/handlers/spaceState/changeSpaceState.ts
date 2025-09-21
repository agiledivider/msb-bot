import {
    ApplicationCommandData,
    ChannelType, GuildMemberRoleManager,
    Interaction,
    InteractionContextType,
    MessageFlags,
    SlashCommandBuilder
} from "discord.js";
import {CommandHandler} from "../../DiscordHandler/DiscordHandler";
import {SpaceStateService} from "./services/spaceStateService";


export class ChangeSpaceStateHandler implements CommandHandler {

    command = new SlashCommandBuilder()
        .setName("spachtel")
        .setDescription("change the space state")
        .setContexts([
            InteractionContextType.Guild
        ])
        .addStringOption(option =>
            option.setName("state")
                .setDescription("close or open")
                .setChoices([
                    {name: "close", value: "close"},
                    {name: "open", value: "open"},
                ])
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("until")
                .setDescription("until when the space is opened")
                .setRequired(false)
        )
        .toJSON() as ApplicationCommandData

    async execute({ interaction, config, logger, spaceStateService } : {interaction: Interaction, config: any, logger: any, spaceStateService: SpaceStateService}) {
        logger.debug('called changeSpaceState')
        if (!interaction.isChatInputCommand()) return
        if (!config.spaceStateChange?.roleId) {
            logger.error('No spaceStateChange.roleId configured')
            interaction.reply({
                content: 'This feature is not properly configured. Please contact an admin.',
                flags: MessageFlags.Ephemeral
            })
            return
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        })

        if(!interaction.member?.roles || !interaction.member?.roles instanceof GuildMemberRoleManager || !interaction.member.roles.cache.has(config.spaceStateChange?.roleId)) {
            interaction.editReply({
                content: 'Du darfst das leider nicht. Nur Schlüsselgruppenmitglieder dürfen das machen.'
            })
            return
        }

        const state = interaction.options.getString('state')
        const until = interaction.options.getString('until')

        if (!state || !(state == 'close' || state == 'open')) {
            logger.error('no such state available')
            interaction.editReply({
                content: 'No such state available'
            })
            return
        }

        if (until && !until.match(/^[012]?\d{1}:\d{2}$/)) {
            logger.error(`no such until available ${until}`)
            interaction.editReply({
                content: `**${until}** ist keine gültige Zeitangabe`,
            })
            return
        }

        await spaceStateService.changeState(state, until)

        let message = `Space state changed to ${state}`
        if (until) {
            message += ` until ${until}`
        }
        message += ".";

        interaction.editReply({
            content: message
        })
    }


    getName(): string {
        return this.command.name
    }

}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}
