# BACKLOG

Improvement candidates for `src/DiscordHandler/` and adjacent code, gathered from a self-review and a parallel review by the QualityDev agent on 2026-05-04. Each item has: the concrete problem, why it matters, and a sketch of the fix or test to write.

Last updated 2026-05-04 after typed-handler + Zod-validation work landed (`6a97255`, `b28903a`, `34a4977`, `9426b39`).

Decide which to pull into work. Mark with `[x]` once accepted/scheduled, `[~]` if explicitly declined, leave `[ ]` if undecided.

---

## Done on this branch

The following commits have landed on `main` and address parts of this backlog:

- `6a97255` feat(DiscordHandler): typed-ctx handler pattern with fail-fast `start()`
- `b28903a` feat(spaceState): POC handler using new typed pattern
- `34a4977` feat(DiscordHandler): runtime config validation via Zod
- `9426b39` feat(DiscordHandler): log structured error and exit cleanly on `start()` failure

What's now in place:
- An augmentable `Services` and `Config` type registry (`src/Services/registry.ts`).
- A `defineEventHandler` helper that gives handlers a `Pick<Services, K>`-typed ctx based on a declared `needs` array.
- `DiscordHandler.start()` verifies all typed handlers' service needs are met and validates the merged Zod config schema, logging a structured error via `this.logger.error` and throwing on failure.
- `index.js` wraps `start()` in a try/catch that calls `process.exit(1)` so the bot will not connect to Discord on a misconfiguration.
- One real handler (`SpaceStateInfo.poc.ts`) and one real service (`TrashService.ts`) demonstrate cross-file augmentation.
- Tests in `tests/DiscordHandler/DiscordHandler-Typed.test.ts` and `tests/Services/registry.test.ts` cover the new paths end-to-end.

---

## Now obsolete or superseded

These items existed in the original review but no longer fit the codebase. The fix described is no longer the right work.

### [~] 6. `decorate()` re-runs the entire constructor (latent)
- **Status:** superseded by the `addService(...).start()` pattern. The new flow gives consumers an explicit lifecycle without re-running `registerActions`. `decorate()` is still defined on the class but is unused (`index.js:88` has it commented out) and the typed-handler pattern doesn't go through it.
- **Replacement work:** delete `decorate`, `_copyHandlers`, and `useHandlers`. (Folded into the new "code to delete" item below.)

### [~] 9. `executeHandlers()` is dead code
- **Status:** superseded. The new pattern uses `start()`. `executeHandlers()` was only meant to be called after a `decorate` chain, which we no longer do.
- **Replacement work:** delete the method.

### [~] 10. `mergeDeep` treats arrays as objects
- **Status:** superseded. `mergeDeep` is only called from `decorate()`. If `decorate()` is removed, `mergeDeep` and the surrounding `ContextAppendType`/`Reconcile`/`IsBothObject` types in `src/DiscordHandler/types.ts` go with it.
- **Replacement work:** delete.

### [~] 13. `🚀` emoji at `executeHandlers` log
- **Status:** superseded. The line lives inside `executeHandlers()`, which we're deleting per #9.

### NEW [ ] 15. Delete the superseded decorate/executeHandlers/mergeDeep code path
- **Files:** `src/DiscordHandler/DiscordHandler.ts:107-189, 371-396`; `src/DiscordHandler/types.ts:21-52` (the parts only used by `decorate`/`mergeDeep`).
- **Problem:** Three private fields (`useHandlers`, `decorators` if unreachable elsewhere) and three public methods (`decorate`, `_copyHandlers`, `executeHandlers`, `use`) plus the `mergeDeep` helper and the `Reconcile`/`IsBothObject`/`ContextAppendType` types form a dead chain. They're not used by `index.js` and don't fit the new typed-handler model. Keeping them around invites future drift and makes the file ~100 lines longer than it needs to be.
- **Fix:** delete the lot, plus the `tests/DiscordHandler/DiscordHandler.test.ts` block titled `"Discord Handler - Events with context"` that tests `decorate` + `executeHandlers`. Keep the "test adding service" and "is event"/"is not event" tests — those exercise APIs that are still alive.
- **Risk:** the test file imports `Reconcile` indirectly; verify nothing else does before removing types.

---

## Highest-value (still open)

### [ ] 1. Optional `logger` crashes when omitted
- **Files:** `src/DiscordHandler/DiscordHandler.ts:179, 193, 232, 261, 266, 280, 285`; `src/DiscordHandler/ActionLoader.ts:30, 32`
- **Problem:** `DiscordHandlerOptions.logger` is typed `logger?: BaseLogger` (optional), but `this.logger.info/debug/error/trace` is called unconditionally throughout the class. Constructing without a logger throws `TypeError: Cannot read properties of undefined`. The eight `tsc` "Object is possibly 'undefined'" errors on logger calls are real crashes, not noise. Production currently masks this because `index.js` always passes a pino instance.
- **Fix:** Default in constructor: `this.logger = options.logger ?? pino({ level: 'silent' })`. Or make `logger` required in `DiscordHandlerOptions`.
- **Test:** Construct `DiscordHandler` without a `logger`; call `start()`; assert no throw.

### [ ] 2. `services` initialized as `[]` but used as a map
- **File:** `src/DiscordHandler/DiscordHandler.ts:37, 54, 290`
- **Problem:** `private services: any` declared, then `this.services = []` (array) in the constructor, then `this.services[name] = service` in `addService` (treating it as an object map). The `...this.services` spread in `registerActions` only works *by accident* because string-keyed properties on arrays are still enumerable in object spread.
- **Fix:** `private services: Record<string, unknown> = {}`. Drop the assignment in the constructor.
- **Risk:** None — semantics unchanged.

### [ ] 3. Migrate legacy handlers to the typed-ctx pattern (was: untyped execute-context contract)
- **Files:** legacy handlers in `src/handlers/` that still destructure an untyped ctx, e.g. `spaceState/SpaceStateInfo.ts:16`, `memberCode/generateCodesCommand.ts`, `trashInfos/regularTrashInfos.ts:11`, `welcomeUsers/*`, `welcomeMember/*`, `presenceEvent.ts`.
- **Status:** the *pattern* is implemented (`defineEventHandler` + `requiredServices` + `Pick<Services, K>` ctx). The *migration* of existing handlers is the remaining work. Each file gets converted to `defineEventHandler({...})` plus its own `declare module` augmentation for any config slice it reads, then delete its untyped class body.
- **Sequencing:** safe to do one handler per PR. The framework supports both old and new shapes simultaneously, so there is no flag-day.

### [ ] 4. `refreshCommands` will crash on older runtimes; `config.guildId` is unsafe
- **File:** `src/DiscordHandler/DiscordHandler.ts:264, 270-273`
- **Problems:**
  - `this.commands.values().map((value, index) => value.command).toArray()` uses TC39 Iterator Helpers (`MapIterator#map`/`#toArray`). Available in current Bun and Node 22+; absent in Node 18 and older Bun. Will throw `TypeError: ... .map is not a function` if anyone runs it on an older runtime.
  - `this.config.guildId` errors at compile time because `config` is typed `object`. With the new registry, this can become `this.config: Config` (from `../Services/registry`), and `guildId` can be added either as a base field there or via a `declare module` augmentation in this file.
- **Fix:** `Array.from(this.commands.values()).map(v => v.command)`. Type `this.config` as `Config` from the registry, plus an augmentation contributing `guildId: string`.

### [ ] 5. Double-listener registration on event handlers; silent map overwrites
- **File:** `src/DiscordHandler/DiscordHandler.ts:203, 217-220, 222`
- **Problem:** `registerActions` calls `client.on(eventType, …)` for every loaded event handler with no deduplication. Two `Events.ClientReady` handlers register two independent listeners on the same client. Note that the new typed-handler path uses the *same* `client.on(...)` call site, so this issue affects both paths. Additionally, `this.events.set(action.getName(), action)` keys the registry by `getName()` (not by event type), so two handlers that share a name silently overwrite — but both listeners are still live on the Discord client.
- **Fix:** Track event-type registrations explicitly. Warn (or error) on duplicate `getName()` for events and commands. Same defensive treatment in `commands.set` (`:225`).
- **Test:** Load a directory with two handlers sharing `getName()`; assert one is loaded and the other rejected with a clear log.
- **Note (POC interaction):** the POC handler `SpaceStateInfo.poc.ts` and the original `SpaceStateInfo.ts` both register on `Events.ClientReady` today. That's deliberate during POC validation but is exactly the duplication this item describes. Once #3 migration is done, only one will remain.

---

## Medium priority

### [ ] 7. `run` dispatch path remains untested
- **Status:** the `execute` event-dispatch path is now covered end-to-end by `tests/DiscordHandler/DiscordHandler-Typed.test.ts` (event emission → captured ctx → assertions). The `run` path and the command `execute` path are still uncovered.
- **Test:** Add a fixture command handler with only `execute` (no `run`), emit `interactionCreate`, assert ctx contents. Same for a legacy `run`-only event handler.

### [ ] 8. `ActionLoader` swallows handler constructor failures silently
- **File:** `src/DiscordHandler/ActionLoader.ts:90-93`
- **Problem:** A handler whose constructor throws (missing env var, bad import, runtime require error) is silently skipped from the loaded set. The outer `catch` re-throws only file-level load errors, not constructor errors.
- **Test:** Add a fixture file that exports a class throwing in its constructor. Assert other handlers still load. Assert the error is logged through a spy logger so test infra can verify it.

### [ ] 14. Hardcoded bot-ID switch decides which config to use
- **File:** `src/Services/trashDiscordService.ts:48-52`
- **Problem:** `TrashDiscordService` chooses between `config.trashInfo` (loaded from `msb.config.json`) and a hardcoded inline `msb` object based on `this.client?.user?.id == '1319391085641994280'`. Production config lives in code instead of `msb.prod.config.json`, the choice happens at runtime based on bot identity rather than environment, and the prod path bypasses the new Zod-driven config validation introduced via `registerConfigSlice` (since the inline object isn't passed through `validateConfig`).
- **Fix:** Pick which config file to load once at startup (e.g. via `NODE_ENV` or an explicit env var) so `index.js` ends up holding a single config object. Delete the inline `msb` block. The `TrashDiscordService` constructor then just reads `config.trashInfo` unconditionally. Once this is gone, every config path runs through `validateConfig` at `start()`.
- **Depends on:** runtime config validation — already landed in `34a4977`.

---

## Lower priority

### [ ] 11. `src/commands/keyCodeCommand.js` is unreachable dead code
- **File:** `src/commands/keyCodeCommand.js` (untracked)
- **Problem:** `ActionLoader.isTypeScriptFile` (`ActionLoader.ts:53`) only matches `.ts`. The constructor loads from `handlerPath` which is `src/handlers/`, not `src/commands/`. So this file is never loaded. It also requires `../../msb.config.json` (gitignored).
- **Decision needed:** Port to TS and move under `src/handlers/`, or delete?

### [ ] 12. No env-var validation at startup
- **Files:** `src/index.js:112`, `src/DiscordHandler/DiscordHandler.ts:62, 276`
- **Problem:** `process.env.DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL`, `MQTT_USER`, `MQTT_PASSWORD` accessed without a guard. Missing values produce confusing downstream errors (e.g., `REST.setToken(undefined)` throws inside discord.js with a stack that doesn't reveal the cause).
- **Fix:** Now that Zod is a project dependency, this is one schema:
  ```ts
  const env = z.object({
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_CLIENT_ID: z.string(),
    DATABASE_URL: z.string().url(),
    MQTT_USER: z.string(),
    MQTT_PASSWORD: z.string(),
  }).parse(process.env);
  ```
  Place it at the top of `index.js`. Same fail-fast UX as `start()`.

---

## Recommended sequencing

1. **#15** — delete the superseded decorate/executeHandlers/mergeDeep block. ~100 lines come out, the file gets sharper, several other items dissolve as a side effect (#6, #9, #10, #13).
2. **#1 + #2** together — small, low risk, eliminates ~8 of the 89 `tsc` errors.
3. **#4** — wire `Config` from the registry into `this.config` and fix `refreshCommands` for older runtimes.
4. **#3 migration** — convert handlers to `defineEventHandler` one at a time. After each, delete the corresponding old class. The POC stays last; remove it once the real `SpaceStateInfo.ts` is migrated.
5. **#5 + #7 + #8** — once typing is solid these become mechanical: write the test first, then make the change.
6. **#14** — kill the bot-ID config switch; everything goes through `validateConfig`.
7. **#11 + #12** — small cleanups.

## Source

Reviewers: self + `QualityDev` agent on 2026-05-04. Items 1, 4, 5, 6, 7, 8 were independently flagged by both. Item 2 was a self-finding. Item 14 was added after the typed-handler work surfaced the prod-config bypass. Item 15 was added when the `decorate`-superseding work made #6/#9/#10/#13 mechanical-deletions rather than substantive design choices.
