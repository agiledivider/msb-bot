// POC — central registry. Both `Services` and `Config` are intentionally
// augmentable: each service/handler declares its own slice via
// `declare module "../services/registry"` and TypeScript merges all
// declarations into one type at compile time.
//
// To add a service: in the service's own file, augment `Services`.
// To add a config slice: in the handler/service that reads it, augment
// `Config`.
//
// Result: zero central edits when adding new services or config sections.
// Conflicts (two handlers declaring incompatible shapes for the same key)
// surface at use-sites as `never`.

import { Client } from "discord.js";
import { Logger } from "pino";

// Augmentable. Each handler/service that reads msb.config.json declares
// its slice via module augmentation. See e.g. SpaceStateInfo.poc.ts.
export interface Config {
  // Intentionally empty — augmentations contribute every field.
  // If you want fields that are *always* present (e.g. guildId), add
  // them here.
}

// Augmentable. The framework provides client/logger/config out of the
// box; project services augment this interface from their own modules.
export interface Services {
  client: Client;
  logger: Logger;
  config: Config;
}
