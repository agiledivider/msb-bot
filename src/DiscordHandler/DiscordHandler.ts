import {
  ApplicationCommand,
  ApplicationCommandData,
  Client,
  GuildMember,
  Interaction,
  Message, MessageFlags,
  Presence,
  REST,
  Routes,
} from "discord.js";
import { Events } from "discord.js";
import { ActionLoader } from "./ActionLoader";
import pino, { BaseLogger } from "pino";
import spaceStateInfo from "../handlers/spaceState/SpaceStateInfo";
import { validateConfig } from "../Services/registry";

export interface DiscordHandlerOptions {
  client: Client;
  handlerPath: string;
  registerCommands?: boolean;
  config?: object;
  logger?: BaseLogger;
}

export interface Config {
  spaceStateInfo?: object;
}

export class DiscordHandler {
  private services: Record<string, unknown> = {};
  private client: Client;
  private actionLoader: ActionLoader;
  private options: DiscordHandlerOptions;
  readonly commands: Map<string, CommandHandler> = new Map();
  readonly events: Map<string, EventHandler> = new Map();
  private rest: REST;
  private logger: BaseLogger;
  private config: object;

  constructor(options: DiscordHandlerOptions) {
    // Default to a silent pino instance when no logger is provided so
    // every internal `this.logger.X(...)` call is safe regardless of
    // how the framework was constructed. Production passes a real
    // configured logger via DiscordHandlerOptions.
    this.logger = options.logger ?? pino({ level: "silent" });
    this.options = options;
    this.client = options.client;
    this.actionLoader = new ActionLoader({
      path: options.handlerPath,
      logger: this.logger,
    });
    this.options.registerCommands = options.registerCommands || false;
    this.rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
    this.config = options.config;
    this.registerActions();
  }

  // Build a context that only contains the services a handler declared
  // via `requiredServices`. Used for handlers defined with
  // `defineEventHandler`. Legacy handlers keep the old broad spread.
  private buildTypedCtx(
    requiredServices: readonly string[],
  ): Record<string, unknown> {
    const all: Record<string, unknown> = {
      client: this.client,
      logger: this.logger,
      discordHandler: this,
      ...this.services,
    };
    const ctx: Record<string, unknown> = {};
    for (const key of requiredServices) {
      ctx[key] = all[key];
    }
    return ctx;
  }

  private registerActions() {
    const actions = this.actionLoader.load();
    this.logger.debug(actions);
    actions.forEach((action: any) => {
      if (action.eventType) {
        if (action.execute && typeof action.execute === "function" ) {
          this.logger.trace(
            "registering event %o on %s",
            action.eventType.toString(),
            action.constructor.name,
          );
          this.client.on(action.eventType.toString(), (...args) => {
            const required = action.requiredServices;
            const ctx = Array.isArray(required)
              ? this.buildTypedCtx(required)
              : {
                  client: this.client,
                  logger: this.logger,
                  discordHandler: this,
                  ...this.services,
                };
            action.execute(args, ctx);
          });
        } else {
          this.logger.trace(
            "registering event %o on %s",
            action.eventType.toString(),
            action.constructor.name,
          );
          this.client.on(
            action.eventType.toString(),
            action.run.bind(this, this.client, this),
          );
        }
        this.events.set(action.getName(), action);
      } else if (action.command) {
        //this.client.on('interactionCreate', action.run.bind(this, this.client, this))
        this.commands.set(action.command.name, action);
      }
    });
    this.client.on("interactionCreate", async (interaction) => {
      if (interaction.isCommand()) {
        const command = this.commands.get(interaction.commandName);
        if (!command) {
          this.logger.error(`No command found for ${interaction.commandName}`);
          interaction.reply({
            content: `sorry, no command found for ${interaction.commandName}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        try {
          if (typeof command.execute === "function" && command.execute) {
            this.logger.debug("executing command %o", command.command.name);
            command.execute({
              interaction,
              client: this.client,
              discordHandler: this,
              ...this.services,
            });
          } else {
            command.run(this.client, interaction, this);
          }
        } catch (error) {
          console.error(`ERROR running ${interaction.commandName}`, error);
        }
      }
    });
    this.refreshCommands();
  }

  async refreshCommands() {
    if (this.options.registerCommands === false) {
      this.logger.info("skipping command registration");
      return;
    }
    const guildId = this.config.guildId;
    try {
      this.logger.info(
        `Started refreshing ${this.commands.size} application (/) commands for guild ${guildId}.`,
      );

      const commandJson: ApplicationCommandData[] = this.commands
        .values()
        .map((value, index) => value.command)
        .toArray();

      const data: ApplicationCommand[] = (await this.rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
        { body: commandJson },
      )) as ApplicationCommand[];

      this.logger.info(
        `Successfully reloaded ${data.length} application (/) commands.`,
      );
    } catch (error) {
      // And of course, make sure you catch and log any errors!
      this.logger.error("ERROR %o", error);
    }
  }

  addService(name: string, service: any) {
    this.services[name] = service;
  }

  // Verify that every loaded handler's declared `requiredServices` are
  // actually registered. Throws with a single error listing every gap so
  // misconfiguration surfaces at startup rather than as silent
  // `undefined`s when an event fires. Call after the addService() chain
  // is complete and before client.login().
  start(): this {
    const all: Record<string, unknown> = {
      client: this.client,
      logger: this.logger,
      discordHandler: this,
      ...this.services,
    };
    const errors: string[] = [];
    const all_actions = [
      ...this.events.values(),
      ...this.commands.values(),
    ];
    for (const action of all_actions as any[]) {
      const required = action.requiredServices;
      if (!Array.isArray(required)) continue;
      for (const key of required) {
        if (!(key in all)) {
          errors.push(
            `Handler "${action.getName()}" needs service "${key}" but it was not registered. Add .addService("${key}", ...) before .start().`,
          );
        }
      }
    }
    if (errors.length > 0) {
      const msg = `${errors.length} unmet service requirement(s):\n  - ${errors.join("\n  - ")}`;
      this.logger.error(
        "Bot will not start — service registration is incomplete.\n%s",
        msg,
      );
      throw new Error(`DiscordHandler.start(): ${msg}`);
    }
    // Validate runtime config against every slice registered by
    // services/handlers via `registerConfigSlice`. No-op if nothing
    // registered, so legacy code paths are unaffected. On failure log
    // the structured Zod error via the project logger before
    // propagating, so the message lands in the same log stream as the
    // rest of the boot sequence rather than as an uncaught-exception
    // stack trace.
    if (this.config) {
      try {
        validateConfig(this.config);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        this.logger.error(
          "Bot will not start — config validation failed.\n%s",
          detail,
        );
        throw e;
      }
    }
    this.logger.info(
      `Verified ${all_actions.length} handlers; all required services present.`,
    );
    return this;
  }

  service(name: string) {
    return this.services[name] || null;
  }

  isEvent(eventName: string) {
    return Object.values(Events).includes(eventName as Events);
  }
}

export interface ActionHandler {
  getName(): string;
}

export interface CommandHandler extends ActionHandler {
  commandJson?: () => object;
  command: ApplicationCommandData;
  execute?: (...args: any[]) => void;
  run?: (...args: any[]) => void;
}

export interface EventHandler extends ActionHandler {
  eventType: Events;
  run?: (...args: any[]) => void;
  execute?: (...args: any[]) => void;
}

export interface ClientReadyHandler extends EventHandler {
  eventType: Events;
  run?: (client: Client, handler: DiscordHandler) => void;
}

export interface GuildMemberAddHandler extends EventHandler {
  eventType: Events;
  run?: (
    client: Client,
    handler: DiscordHandler,
    newMember: GuildMember,
  ) => void;
}

export interface GuildMemberUpdateHandler extends EventHandler {
  eventType: Events.GuildMemberUpdate;
  run?: (
    client: Client,
    handler: DiscordHandler,
    oldMember: GuildMember,
    newMember: GuildMember,
  ) => void;
}

export interface PresenceUpdateHandler extends EventHandler {
  eventType: Events.PresenceUpdate;
  run?: (
    client: Client,
    handler: DiscordHandler,
    oldPresence: Presence,
    newPresence: Presence,
  ) => void;
}

export interface InteractionCreateHandler extends EventHandler {
  eventType: Events.InteractionCreate;
  run?: (
    client: Client,
    handler: DiscordHandler,
    interaction: Interaction,
  ) => void;
}

export interface MessageCreateHandler extends EventHandler {
  eventType: Events.MessageCreate;
  run?: (client: Client, handler: DiscordHandler, message: Message) => void;
  execute?: (
    [message]: [message: Message],
    { client, handler }: { client: Client<true>; handler: DiscordHandler },
  ) => Promise<void> | void;
}
