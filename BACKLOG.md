# BACKLOG

Improvement candidates for `src/DiscordHandler/` and adjacent code, gathered from a self-review and a parallel review by the QualityDev agent on 2026-05-04. Each item has: the concrete problem, why it matters, and a sketch of the fix or test to write.

Last updated 2026-05-04 after #1, #2, and #15 landed on top of the typed-handler + Zod-validation work (`6a97255`, `b28903a`, `34a4977`, `9426b39`, `c622e3c`, `c631970`).

Decide which to pull into work. Mark with `[x]` once accepted/scheduled, `[~]` if explicitly declined, leave `[ ]` if undecided.

---

## Done on this branch

The following commits have landed on `main` and address parts of this backlog:

- `6a97255` feat(DiscordHandler): typed-ctx handler pattern with fail-fast `start()`
- `b28903a` feat(spaceState): POC handler using new typed pattern
- `34a4977` feat(DiscordHandler): runtime config validation via Zod
- `9426b39` feat(DiscordHandler): log structured error and exit cleanly on `start()` failure
- `c622e3c` refactor(DiscordHandler): delete superseded decorate/executeHandlers/mergeDeep code (resolves #6, #9, #10, #13)
- `c631970` fix(DiscordHandler): default to silent pino logger; fix services map type (resolves #1, #2)
- `d41f53d` chore: remove projects feature (command, service, schema, test) — fixes the only previously-failing test
- `ed19205` fix(DiscordHandler): type config from registry; replace Iterator Helpers (resolves #4)
- `d4a3ed7` refactor(spaceState): migrate SpaceStateInfo to defineEventHandler (first handler converted under #3)
- `3d11e22` refactor(presence): migrate presenceEvent to defineEventHandler (second handler under #3)
- `85a8934` refactor(ready): migrate readyHandler to defineEventHandler (third handler under #3; established `{ logger, ... }` destructure convention)
- `114c78d` style: destructure ctx in earlier-migrated handlers (consistency with the new convention)
- `bf0f434` refactor(welcome): migrate welcomeMessage to defineEventHandler (fourth handler under #3)
- `c7a2a43` refactor(welcomeMember): migrate welcomeInfos to defineEventHandler (fifth handler under #3; resolves a name-collision instance of #5)
- `e3dbc46` chore(trashInfos): delete empty regularTrashInfos handler (dead stub; -4 type errors)

What's now in place:
- An augmentable `Services` and `Config` type registry (`src/Services/registry.ts`).
- A `defineEventHandler` helper that gives handlers a `Pick<Services, K>`-typed ctx based on a declared `needs` array.
- `DiscordHandler.start()` verifies all typed handlers' service needs are met and validates the merged Zod config schema, logging a structured error via `this.logger.error` and throwing on failure.
- `index.js` wraps `start()` in a try/catch that calls `process.exit(1)` so the bot will not connect to Discord on a misconfiguration.
- `SpaceStateInfo.ts` uses the typed pattern with cross-file augmentation; the POC file has been retired.
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

### [x] 15. Delete the superseded decorate/executeHandlers/mergeDeep code path — DONE in `c622e3c`
- Removed the `<Decorators>` generic, `decorators`/`useHandlers` fields, `on`/`handleEvent`/`decorate` (4 overloads)/`_copyHandlers`/`executeHandlers`/`use`, the `mergeDeep` helper, and the `Reconcile`/`IsBothObject`/`Prettify`/`ContextAppendType`/`EventContext` types from `types.ts`. Removed the corresponding test block. Net -241 lines, -3 type errors.

---

## Highest-value (still open)

### [x] 1. Optional `logger` crashes when omitted — DONE in `c631970`
- Constructor now defaults to `pino({ level: "silent" })` when no logger is provided; the field is typed as required `BaseLogger`. Same defaulting in `ActionLoader`. Two tests verify constructor + `start()` succeed without a logger. Eliminated 8 "Object is possibly 'undefined'" type errors.

### [x] 2. `services` initialized as `[]` but used as a map — DONE in `c631970`
- Field is now `private services: Record<string, unknown> = {}`; constructor's `this.services = []` line removed. Semantics unchanged.

### [ ] 3. Migrate legacy handlers to the typed-ctx pattern (was: untyped execute-context contract)
- **Status:** in progress. Migrated: `SpaceStateInfo.ts` (`d4a3ed7`), `presenceEvent.ts` (`3d11e22`), `readyHandler.ts` (`85a8934`), `welcomeUsers/welcomeMessage.ts` (`bf0f434`), `welcomeMember/welcomeInfos.ts` (`c7a2a43`). Deleted as dead stubs: `trashInfos/regularTrashInfos.ts` (`e3dbc46`). Remaining handlers still on the untyped pattern: `memberCode/generateCodesCommand.ts`, `memberCode/listUnusedCodesCommand.ts`, `memberCode/membercodeCommand.ts`, `trashInfos/nextTrashDatesCommand.ts`, `trashInfos/reactOnButtonClickInteractionCreateHandler.ts`, `spaceState/changeSpaceState.ts`. Plus the untracked `askForInfos.ts`.
- **Per-handler steps:** convert to `defineEventHandler` (or `defineCommandHandler` once we add it) with explicit `needs`, destructure the ctx in the `execute` signature (e.g. `execute(args, { logger, config })`) — established convention — declare any config slice this handler reads via `registerConfigSlice` + `z.infer`, drop the untyped class body. Tighten any internal classes/services it constructs to take only what they actually need (see `d4a3ed7`'s `SpaceStateInfoProcessor` example).
- **Sequencing:** safe to do one handler per PR. The framework supports both old and new shapes simultaneously, so there is no flag-day.
- **Note:** the framework currently only supports `defineEventHandler`. Commands still use the legacy class shape. A `defineCommandHandler` helper needs to be added before the command handlers (`memberCode/*`, `nextTrashDatesCommand`, etc.) can be migrated.

### [x] 4. `refreshCommands` will crash on older runtimes; `config.guildId` is unsafe — DONE in `ed19205`
- Iterator Helpers replaced with `Array.from(this.commands.values()).map(v => v.command)`. `this.config` typed as `Config | undefined` from the registry. Framework's own `guildId` slice registered via `registerConfigSlice` so it's validated alongside handler slices at `start()`. -5 type errors.

### [ ] 5. Double-listener registration on event handlers; silent map overwrites
- **File:** `src/DiscordHandler/DiscordHandler.ts:203, 217-220, 222`
- **Problem:** `registerActions` calls `client.on(eventType, …)` for every loaded event handler with no deduplication. Two `Events.ClientReady` handlers register two independent listeners on the same client. Note that the new typed-handler path uses the *same* `client.on(...)` call site, so this issue affects both paths. Additionally, `this.events.set(action.getName(), action)` keys the registry by `getName()` (not by event type), so two handlers that share a name silently overwrite — but both listeners are still live on the Discord client.
- **Fix:** Track event-type registrations explicitly. Warn (or error) on duplicate `getName()` for events and commands. Same defensive treatment in `commands.set` (`:225`).
- **Test:** Load a directory with two handlers sharing `getName()`; assert one is loaded and the other rejected with a clear log.

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

### [ ] 16. `SpaceStateInfoProcessor` instantiates the MQTT client directly
- **File:** `src/handlers/spaceState/SpaceStateInfo.ts` (`SpaceStateInfoProcessor` constructor)
- **Problem:** the processor calls `mqtt.connect(...)` itself, reads `process.env.MQTT_URL`/`MQTT_USER`/`MQTT_PASSWORD` directly, and owns the lifecycle of the MQTT connection. That hides a hard dependency: the processor cannot be exercised without a live broker, can't be mocked for tests, and concentrates connection-management logic inside a feature handler instead of a reusable service. Same shape will recur for any future handler that wants MQTT.
- **Fix:** introduce an `MqttService` (e.g. `src/Services/mqttService.ts`) that owns the connection, exposes a small surface (`subscribe(topic, handler)`, maybe `publish(topic, payload)` later), and is registered in the `Services` registry by augmenting from its own file. `index.js` constructs and `addService("mqttService", ...)` it the same way `trashService` is wired today. `SpaceStateInfoProcessor` then takes an `MqttService` (or the handler subscribes via `ctx.mqttService.subscribe(topic, ...)` and the processor never sees mqtt directly). Env-var reading moves out of the processor and into the service constructor or — better — into the env-var schema from #12.
- **Test:** with the service in place, the processor (or the handler) can be tested with a fake `MqttService` that synthesises messages, verifying state-change handling and `checkChangeAbuse` without a real broker.
- **Note:** mirrors the dependency-injection pattern the rest of the framework now uses. Doing this also makes #14's prod-config story land cleaner since `MqttService` would read its config slice through `registerConfigSlice` like everyone else.

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

Done so far: #1, #2, #4, #6, #9, #10, #13, #15. Plus the projects feature removal (`d41f53d`) which fixed the only previously-failing test.

1. **#3 migration** — convert handlers to `defineEventHandler` one at a time. After each, delete the corresponding old class. The POC stays last; remove it once the real `SpaceStateInfo.ts` is migrated.
2. **#5 + #7 + #8** — once typing is solid these become mechanical: write the test first, then make the change.
3. **#14** — kill the bot-ID config switch; everything goes through `validateConfig`.
4. **#11 + #12** — small cleanups.

## Source

Reviewers: self + `QualityDev` agent on 2026-05-04. Items 1, 4, 5, 6, 7, 8 were independently flagged by both. Item 2 was a self-finding. Item 14 was added after the typed-handler work surfaced the prod-config bypass. Item 15 was added when the `decorate`-superseding work made #6/#9/#10/#13 mechanical-deletions rather than substantive design choices.
