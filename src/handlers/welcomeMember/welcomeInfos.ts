import { Events, TextChannel } from "discord.js";
import { readFile } from "fs/promises";
import { z } from "zod";
import { defineEventHandler } from "../../DiscordHandler/define";
import { registerConfigSlice } from "../../Services/registry";

const configSlice = registerConfigSlice({
  newMemberWelcome: z.object({
    channelId: z.string(),
    roleId: z.string(),
  }),
});

declare module "../../Services/registry" {
  interface Config extends z.infer<typeof configSlice> {}
}

export default defineEventHandler({
  name: "new-member-welcome",
  eventType: Events.GuildMemberUpdate,
  needs: ["logger", "config"],
  async execute([oldMember, newMember], { logger, config }) {
    logger.debug("member update called for %s", newMember.displayName);

    if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

    const addedRoles = newMember.roles.cache.filter(
      (role) => !oldMember.roles.cache.has(role.id),
    );
    const welcomeRoleId = config.newMemberWelcome.roleId;
    const welcomeChannelId = config.newMemberWelcome.channelId;

    for (const role of addedRoles.values()) {
      if (role.id !== welcomeRoleId) continue;

      try {
        const channel = newMember.guild.channels.cache.get(welcomeChannelId);
        if (channel instanceof TextChannel) {
          const message = await channel.send(
            `Begrüsst ${newMember} als neustes Mitglied im MakerSpace!`,
          );
          await message.react("👋");
        } else {
          logger.warn(
            "newMemberWelcome.channelId %s not found or not a TextChannel; skipping public greeting",
            welcomeChannelId,
          );
        }

        const welcomeMessage = await readFile(
          __dirname + "/welcomeDM.md",
          "utf-8",
        );
        await newMember.send({
          content: welcomeMessage.replace("[user]", `<@${newMember.id}>`),
        });
        logger.debug("sent welcome DM to %s", newMember.displayName);
      } catch (e) {
        logger.error(
          "failed to greet new member %s: %s",
          newMember.displayName,
          e instanceof Error ? e.message : String(e),
        );
      }
    }
  },
});
