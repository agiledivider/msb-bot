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
import {
  ContextAppendType,
  DiscordEventMap,
  EventContext,
  Reconcile,
} from "./types";
import { BaseLogger } from "pino";
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

export class DiscordHandler<Decorators = {}> {
  private useHandlers: ((ctx: Decorators) => void)[] = [];
  private services: any;
  private client: Client;
  private actionLoader: ActionLoader;
  private options: DiscordHandlerOptions;
  readonly commands: Map<string, CommandHandler> = new Map();
  readonly events: Map<string, EventHandler> = new Map();
  private rest: REST;
  private logger?: BaseLogger;
  private config: object;

  constructor(
    options: DiscordHandlerOptions,
    private decorators: Decorators = {} as Decorators,
  ) {
    this.logger = options.logger;
    this.decorators = decorators;
    this.logger?.debug("this.decorators %o", this.decorators);
    this.services = [];
    this.options = options;
    this.client = options.client;
    this.actionLoader = new ActionLoader({
      path: options.handlerPath,
      logger: options.logger,
    });
    this.options.registerCommands = options.registerCommands || false;
    this.rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
    this.config = options.config;
    this.registerActions();
  }

  private eventHandlers: {
    [E in keyof DiscordEventMap]?: Array<
      (ctx: Decorators & EventContext<E>) => void
    >;
  } = {};

  on<E extends keyof DiscordEventMap>(
    event: E,
    handler: (ctx: Decorators & EventContext<E>) => void,
  ): this {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event]!.push(handler);

    // Register the Discord.js event if not already done
    if (!this.client.listenerCount(event)) {
      this.client.on(event, (...args: DiscordEventMap[E]) => {
        this.handleEvent(event, args);
      });
    }

    return this;
  }

  private handleEvent<E extends keyof DiscordEventMap>(
    event: E,
    args: DiscordEventMap[E],
  ) {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      const eventContext: EventContext<E> = { event, args };
      const fullContext = { ...this.decorators, ...eventContext };

      for (const handler of handlers) {
        handler(fullContext as Decorators & EventContext<E>);
      }
    }
  }

  decorate<Name extends string, Value>(
    name: Name,
    value: Value,
  ): DiscordHandler<Reconcile<Decorators, { [K in Name]: Value }>>;

  decorate<NewDecorators extends Record<string, unknown>>(
    decorators: NewDecorators,
  ): DiscordHandler<Reconcile<Decorators, NewDecorators>>;

  decorate<
    NewDecorators extends Record<string, unknown>,
    Type extends ContextAppendType = "append",
  >(
    options: { as: Type },
    decorators: NewDecorators,
  ): DiscordHandler<
    Reconcile<Decorators, NewDecorators, Type extends "override" ? true : false>
  >;

  decorate<
    Name extends string,
    Value,
    Type extends ContextAppendType = "append",
  >(
    options: { as: Type },
    name: Name,
    value: Value,
  ): DiscordHandler<
    Reconcile<
      Decorators,
      { [K in Name]: Value },
      Type extends "override" ? true : false
    >
  >;

  decorate(...args: any[]): DiscordHandler<any> {
    let decorators: Record<string, unknown> = {};
    let override = false;

    if (args.length === 1 && typeof args[0] === "object") {
      decorators = args[0];
    } else if (args.length === 2 && typeof args[0] === "string") {
      decorators = { [args[0]]: args[1] };
    } else if (
      args.length === 2 &&
      typeof args[0] === "object" &&
      "as" in args[0]
    ) {
      decorators = args[1];
      override = args[0].as === "override";
    } else if (
      args.length === 3 &&
      typeof args[0] === "object" &&
      "as" in args[0] &&
      typeof args[1] === "string"
    ) {
      decorators = { [args[1]]: args[2] };
      override = args[0].as === "override";
    }

    const newDecorators = mergeDeep(this.decorators, decorators, override);
    return new DiscordHandler(this.options, newDecorators)._copyHandlers(
      this.useHandlers,
    );
  }

  private _copyHandlers(handlers: ((ctx: any) => void)[]) {
    this.useHandlers = [...handlers];
    return this;
  }

  executeHandlers() {
    this.logger.info("🚀 Running app with context:");
    this.logger.info(this.decorators);
    for (const handler of this.useHandlers) {
      handler(this.decorators);
    }
  }

  use(handler: (ctx: Decorators) => void) {
    this.useHandlers.push(handler);
    return this;
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
      this.logger?.error(
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
        this.logger?.error(
          "Bot will not start — config validation failed.\n%s",
          detail,
        );
        throw e;
      }
    }
    this.logger?.info(
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

function mergeDeep<T, U>(
  target: T,
  source: U,
  override = false,
): Reconcile<T, U> {
  const result: any = { ...target };

  for (const key in source) {
    const srcVal = (source as any)[key];
    const tgtVal = (target as any)[key];

    if (
      !override &&
      typeof srcVal === "object" &&
      typeof tgtVal === "object" &&
      srcVal !== null &&
      tgtVal !== null
    ) {
      result[key] = mergeDeep(tgtVal, srcVal, override);
    } else {
      result[key] = srcVal;
    }
  }

  return result;
}
