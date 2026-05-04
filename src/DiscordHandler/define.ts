// Handler-definition helpers that give each handler a typed ctx based
// on the services it declares as `needs`.
//
// defineEventHandler is for Discord events (ClientReady, MessageCreate,
// GuildMemberAdd, etc). defineCommandHandler is for slash commands.
// Both are picked up by ActionLoader via `new exportedItem()` and
// dispatched by DiscordHandler with a typed Pick<Services, K> ctx.
//
// Example — event:
//   defineEventHandler({
//     name: "my-handler",
//     eventType: Events.ClientReady,
//     needs: ["client", "logger", "config"],
//     execute([], { client, logger, config }) { ... },
//   })
//
// Example — command:
//   defineCommandHandler({
//     name: "ping",
//     command: { name: "ping", description: "..." },
//     needs: ["logger"],
//     async execute(interaction, { logger }) {
//       await interaction.reply("pong");
//     },
//   })

import {
  ApplicationCommandData,
  ChatInputCommandInteraction,
} from "discord.js";
import { DiscordEventMap } from "./types";
import { Services } from "../Services/registry";

export type ExecuteCtx<K extends keyof Services> = Pick<Services, K>;

export function defineEventHandler<
  E extends keyof DiscordEventMap,
  const K extends keyof Services,
>(spec: {
  name: string;
  eventType: E;
  needs: readonly K[];
  execute: (
    args: DiscordEventMap[E],
    ctx: ExecuteCtx<K>,
  ) => void | Promise<void>;
}) {
  // Returned as a class so the existing ActionLoader (which does
  // `new exportedItem()` on every export) instantiates it correctly.
  return class {
    eventType = spec.eventType;
    requiredServices = spec.needs;
    execute = spec.execute;
    getName(): string {
      return spec.name;
    }
  };
}

export function defineCommandHandler<const K extends keyof Services>(spec: {
  name: string;
  command: ApplicationCommandData;
  needs: readonly K[];
  execute: (
    interaction: ChatInputCommandInteraction,
    ctx: ExecuteCtx<K>,
  ) => void | Promise<void>;
}) {
  return class {
    command = spec.command;
    requiredServices = spec.needs;
    execute = spec.execute;
    getName(): string {
      return spec.name;
    }
  };
}
