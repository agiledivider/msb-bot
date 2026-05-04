// POC — handler-definition helper that gives each handler a typed ctx
// based on the services it declares as `needs`.
//
// Example:
//   defineEventHandler({
//     name: "my-handler",
//     eventType: Events.ClientReady,
//     needs: ["client", "logger", "config"],
//     execute([], ctx) {
//       ctx.config.spaceStateInfo.channelId  // typed
//       ctx.trashService                     // compile error — not in `needs`
//     },
//   })

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
