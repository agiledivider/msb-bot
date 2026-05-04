// POC — what SpaceStateInfo would look like under the new pattern.
// The original SpaceStateInfo.ts is untouched and still in use.
//
// Things to poke at in the editor:
//   1. Hover `ctx` inside execute — it's typed
//      `Pick<Services, "client"|"logger"|"config"|"trashService">`.
//   2. `ctx.trashService` is typed even though it's defined in a
//      different file — augmentation merges across files.
//   3. Try `ctx.config.spaceSateInfo` (typo) — compile error.
//   4. Try `ctx.spaceStateService` — compile error (not declared in `needs`,
//      and not augmented anywhere).
// The `declare module` block below contributes this handler's config
// slice to the global Config interface. Other handlers/services contribute
// their slices the same way in their own files; TypeScript merges them all.

import { Events, TextChannel } from "discord.js";
import { z } from "zod";
import { defineEventHandler } from "../../DiscordHandler/define";
import { registerConfigSlice } from "../../Services/registry";

// Single source of truth: the Zod schema produces both the runtime
// validator (via `registerConfigSlice` → collected and run by
// DiscordHandler.start()) and the compile-time type (via `z.infer`).
const configSlice = registerConfigSlice({
  spaceStateInfo: z.object({
    channelId: z.string(),
    guildId: z.string(),
    mqttTopic: z.string(),
  }),
});

declare module "../../Services/registry" {
  interface Config extends z.infer<typeof configSlice> {}
}

export default defineEventHandler({
  name: "spacestate-poc",
  eventType: Events.ClientReady,
  needs: ["client", "logger", "config", "trashService"],
  async execute([], ctx) {
    ctx.logger.debug("spaceStateInfo execute called");
    ctx.logger.debug(
      "channelId %s",
      ctx.config.spaceStateInfo.channelId,
    );

    const channel = ctx.client.channels.cache.get(
      ctx.config.spaceStateInfo.channelId,
    );
    if (!channel || !(channel instanceof TextChannel)) {
      ctx.logger.error("channel not found: %s", String(channel));
      return;
    }

    // Cross-file augmentation in action: trashService is contributed
    // to Services by src/Services/TrashService.ts, declared as a need
    // here, and ends up typed in ctx.
    const trashDates = await ctx.trashService.getNextTrashDates();
    ctx.logger.info(
      "spacestate ready, channel: %s, %d trash dates upcoming",
      channel.name,
      trashDates.length,
    );

    // ---- BREAK TESTS (uncomment to verify the type system catches each) ----
    // ctx.config.spaceSateInfo.channelId  // typo → TS2551 "Did you mean 'spaceStateInfo'?"
    // ctx.spaceStateService               // not declared as a need → TS2339
    // ctx.trashService.bogusMethod()      // valid service, bogus method → TS2339
  },
});
