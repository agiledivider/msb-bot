// Test fixture — a typed slash command produced by defineCommandHandler.
// The dispatcher should pick it up via ActionLoader and invoke it with
// (interaction, ctx) where ctx is Pick<Services, "myService" | "logger">.

import {
  ApplicationCommandType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { defineCommandHandler } from "../../../src/DiscordHandler/define";

export const captures: {
  ctx: Record<string, unknown> | null;
  interaction: ChatInputCommandInteraction | null;
} = { ctx: null, interaction: null };

export default defineCommandHandler({
  name: "typed-cmd-test",
  command: {
    name: "typed-cmd-test",
    description: "test",
    type: ApplicationCommandType.ChatInput,
  },
  needs: ["myService", "logger"],
  execute(interaction, ctx) {
    captures.ctx = ctx;
    captures.interaction = interaction;
  },
});
