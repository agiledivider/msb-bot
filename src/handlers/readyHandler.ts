import { Events } from "discord.js";
import { defineEventHandler } from "../DiscordHandler/define";

export default defineEventHandler({
  name: "ready",
  eventType: Events.ClientReady,
  needs: ["logger"],
  execute([], { logger }) {
    logger.debug("ready called");
  },
});
