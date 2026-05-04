import { Events } from "discord.js";
import { defineEventHandler } from "../DiscordHandler/define";

export default defineEventHandler({
  name: "presence-update",
  eventType: Events.PresenceUpdate,
  needs: ["logger"],
  execute([oldPresence, newPresence], { logger }) {
    logger.trace(
      "presence updated: %s %s -> %s",
      oldPresence?.member?.displayName,
      oldPresence?.status,
      newPresence?.status,
    );
  },
});
