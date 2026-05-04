import { SlashCommandBuilder, type ApplicationCommandData } from "discord.js";
import { defineCommandHandler } from "../../DiscordHandler/define";

export default defineCommandHandler({
  name: "muell",
  command: new SlashCommandBuilder()
    .setName("muell")
    .setDescription("Gives the next trash dates.")
    .setDescriptionLocalizations({
      de: "Nennt die nächsten Mülltermine.",
    })
    .toJSON() as ApplicationCommandData,
  needs: ["trashService"],
  async execute(interaction, { trashService }) {
    const dates = await trashService.getNextTrashDates();
    const lines = dates.map((d) => `${d.timeString()} - ${d.type}`);
    await interaction.reply({
      content: `die nächsten Termine sind:\n${lines.join("\n")}`,
    });
  },
});
