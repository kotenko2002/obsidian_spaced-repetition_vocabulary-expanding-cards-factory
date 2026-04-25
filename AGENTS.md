# Vocabulary Expanding Cards Factory — agent guide

Obsidian plugin that generates vocabulary flashcard `.md` files compatible with the **Spaced Repetition** community plugin. The user pastes a JSON array describing terms (with sentences, explanations, etc.); the plugin downloads pronunciation audio from Cambridge Dictionary and writes one or more flashcard cards per term.

## Two parallel flows

The plugin offers **two independent creation flows**. They share infrastructure (audio download, file building primitives, vault storage) but produce different card files.

### Flow A — Classic ("old", 4 cards per term)

- Entry: ribbon icon → **Create flashcard** (sync) or **Background processing** (fire-and-forget with random pauses).
- Modals: [`CreateFlashcardFileModal`](src/ui/CreateFlashcardFileModal.ts), [`BackgroundFlashcardModal`](src/ui/BackgroundFlashcardModal.ts), both extend [`BaseFlashcardModal`](src/ui/BaseFlashcardModal.ts) (a JSON-textarea+submit-button skeleton).
- Input model: [`InputFlashcardData`](src/models/InputFlashcardData.ts) — `term`, `explanation`, `sentences[]` (each with `sentence` + `termInSentenceForm`), optional `skipFullTermLookup`/`skipAudio`.
- Controller: [`FlashcardController`](src/controllers/FlashcardController.ts).
- Output per term: one file `Flashcard/(VOC) <term>.md` containing **2 sentence-gap cards (one per sentence) + 1 direct-translation card + 1 listening card**.
- Frontmatter tag: `flashcards/english/vocabulary` (default).

### Flow B — Image-based ("new", 1 card per term)

- Entry: ribbon icon → **Create image-based flashcards**.
- Modal: [`ImageFlashcardModal`](src/ui/ImageFlashcardModal.ts) — two-phase: Phase A (JSON textarea), Phase B (per-term wizard via [`ImageEnrichmentWizard`](src/ui/ImageEnrichmentWizard.ts)). Background processing kicks off after the wizard finishes.
- Input model: [`ImageInputFlashcardData`](src/models/ImageInputFlashcardData.ts) — single `sentence: string` (not array), plus optional `fallbackTranslation`. AI is responsible for English `explanation` and a `___`-style gap in `sentence` (no `(укр.)` suffix).
- Enriched model: [`EnrichedImageFlashcardData`](src/models/ImageFlashcardData.ts) — input + `uuid: string` (added by wizard) + optional `imagePath`.
- Controller: [`ImageFlashcardController`](src/controllers/ImageFlashcardController.ts).
- Output per term: one file `Flashcard/(VOC) <term> <uuid>.md` (UUID makes repeated terms with different contexts produce distinct files). Single card: sentence with gap → image hint OR fallback `*translation*` → answer + audio.
- Frontmatter tag: `flashcards/english/vocabulary-v2` (set via `withCustomTags(IMAGE_FLASHCARD_TAGS)` in the controller).

**Don't break Flow A when modifying Flow B.** They must coexist. The user can fall back to Flow A any time.

## Architecture layers

```
UI (Modal + Wizard)
  ↓
Controller (orchestrates one card creation)
  ↓
Services
  ├─ AudioDownloadService     ← cache-aware audio fetching
  ├─ CambridgeAudioService    ← Cambridge HTML scrape + audio download
  ├─ AudioConversionService   ← ogg ↔ mp3 via ffmpeg, mp3 concatenation
  ├─ VaultStorageService      ← thin wrapper over vault.adapter
  ├─ FlashcardBuilder         ← single-card markdown primitives
  └─ FlashcardFileBuilder     ← multi-card file assembler with frontmatter
```

`FlashcardBuilder` and `FlashcardFileBuilder` are **shared between flows**. New card types are added as new methods on these classes, not new builder classes.

## Key services

### `AudioDownloadService` ([src/services/AudioDownloadService.ts](src/services/AudioDownloadService.ts))

Owned by both controllers. Public API:

- `downloadAudioFiles(term, skipFullTermLookup, skipAudio): Promise<{ uk: string[], us: string[] }>` — checks term-level cache first; on miss calls `fetchAndConvertAudio` (private), concatenates per-word buffers if word-by-word fallback was used, writes `_Cache/<term>_<lang>.mp3`.
- `countdownDelay(label, index?, total?)` — visible random 4-12s pause (× `delayMultiplier`) between Cambridge requests. Used by both controllers and internally inside the word loop.

### Audio cache strategy (term + word)

Goal: never hit Cambridge if the audio is already on disk.

1. **Term-level cache check** at top of `downloadAudioFiles`: if both `_Cache/<term>_uk.mp3` and `_Cache/<term>_us.mp3` exist → return paths immediately. No Cambridge calls, no countdowns, no concatenation.
2. **Word-level cache check** inside the word-by-word fallback loop: for each word, if both `_Cache/<word>_uk.mp3` and `_Cache/<word>_us.mp3` exist → read from disk via `VaultStorageService.readBinary`, push to results, skip Cambridge fetch AND skip countdown for this iteration.
3. **Persistence**: when a word IS fetched, both individual `<word>_<lang>.mp3` files are written via `createBinaryIfNotExists`. So future flashcards that share a word reuse it.
4. **Countdown logic**: tracked via `cambridgeFetchAttempted` flag — countdown fires only if a real Cambridge call happened earlier in this term (full-term lookup or any earlier uncached word). A run of consecutive cache hits has no delays at all.
5. **Edge case — partial cache** (only UK or only US exists for a word): treated as miss. Cambridge returns both audio URLs in one HTML request anyway.

### `VaultStorageService` ([src/services/VaultStorageService.ts](src/services/VaultStorageService.ts))

Thin wrapper over `vault` and `vault.adapter`. Methods:

| Method | Behaviour |
|--------|-----------|
| `createFolderIfNotExists(path)` | Idempotent folder create |
| `createFileIfNotExists(path, contents)` | Skip if exists; uses `vault.create` |
| `createBinaryIfNotExists(path, data)` | Skip if exists; uses `vault.createBinary` |
| `writeBinary(path, data)` | **Overwrites**; uses `vault.adapter.writeBinary` |
| `binaryExists(path)` | `vault.adapter.exists(path)` |
| `readBinary(path)` | `vault.adapter.readBinary(path)` |

Use `createBinaryIfNotExists` for cache writes (no overwrite is the intent), `writeBinary` only for "user wants to replace" semantics (image paste in wizard).

### `FlashcardFileBuilder` ([src/services/FlashcardFileBuilder.ts](src/services/FlashcardFileBuilder.ts))

The single file builder used by **both flows**. Card-adding methods append cards to an internal list; `build()` joins them with `---` separators and prepends frontmatter.

Methods:

- `addSentenceGapCard(data, idx)`, `addSentenceGapCards(data)`, `addDirectTranslationCard(data)`, `addListeningCard(data)` — Flow A cards, take `FlashcardData`.
- `addSentenceGapWithImageCard(data)` — Flow B card, takes `ImageFlashcardData`.
- `withCustomTags(tags: string[])` — configurator (returns `this`); replaces default tag set for this build.
- `reset()` — clears cards AND custom tags. Always call before reuse.
- `build()` — produces the full `.md` content. Uses default tags (`FRONTMATTER_TAGS`) unless `withCustomTags` was called.

**Don't add a parallel `XxxFlashcardFileBuilder` for new card types.** Add a method here. Frontmatter, `formatCreatedAt`, separator, and tag handling are reused for free. For tag overrides, use `withCustomTags(...)` chained before `build()`.

### `FlashcardBuilder` ([src/services/FlashcardBuilder.ts](src/services/FlashcardBuilder.ts))

Per-card primitives: `addTitle`, `addSentence`, `addQuestionLine`, `addSentenceAnswer`, `addTermExplanation`, `addAudioUs`, `addAudioUk`, `addImage`, `addFallbackTranslation`, `addSource`. Each returns `this`. Reset via `reset()`.

Note: `addImage` and `addFallbackTranslation` deliberately do **not** prepend a `\n` — they expect the previous primitive (`addSentence`) to already end with one, so the rendered Markdown places the image/translation directly under the sentence with no blank line between.

`addSource(url)` renders `🔗 <url>` as the last line of the card (after audio). It is called only by `addSentenceGapWithImageCard` (Flow B) when `data.source` is set. **Flow A cards do not render a source line by design** — Flow A predates this feature and stays frozen. Use the V2 `source` field for things like a YouTube link with timestamp pointing back to where the user encountered the term.

## File naming conventions

Audio cache (`_Cache/`):
- Single word or term, full lookup: `<term>_<lang>.mp3` (e.g. `_Cache/by_hand_uk.mp3`)
- Individual words from word-by-word fallback: `<word>_<lang>.mp3` (e.g. `_Cache/hand_uk.mp3`) — same scheme, so a standalone `hand` flashcard's audio doubles as a word-level cache entry for any multi-word term containing `hand`.
- Path scheme generated by [`termToAudioFileBase(term)`](src/helpers/termHelpers.ts:9) (lowercase, spaces → `_`).

Images (Flow B, also in `_Cache/`):
- `<term>_<uuid>.<ext>` (e.g. `_Cache/by_hand_a3f12c89.png`). Extension derived from clipboard MIME type. UUID is per-wizard-item (generated once when the wizard receives the input array), shared with the flashcard file. Helper: [`termToImageFileBase(term, uuid)`](src/helpers/termHelpers.ts:13), UUID via [`generateShortUuid()`](src/helpers/termHelpers.ts:18) (`crypto.randomUUID().slice(0, 8)`).

Flashcard files (`Flashcard/`):
- Flow A: `(VOC) <term>.md`
- Flow B: `(VOC) <term> <uuid>.md` (uuid same as the term's image)

## Image paste UX (Flow B, [`ImageEnrichmentWizard`](src/ui/ImageEnrichmentWizard.ts))

- Paste handler attached to **`document`** with **capture phase** (`true` 3rd arg). Caught regardless of which element is focused inside the modal.
- Wizard starts inactive-flag-aware: `isActive=true` on construct, set to `false` in `cleanup()`. Document handler bails out when not active.
- `cleanup()` is **public**; called from `ImageFlashcardModal.onClose()` so the document listener doesn't leak when the user closes via X. Also called on Finish (just before `onComplete`).
- Replace image = paste again. `writeBinary` overwrites (UUID is per-item, not per-paste, so the same path is reused). No orphan files for replacements within an item.
- Clear image = X overlay button (Lucide `x` icon via Obsidian's `setIcon()`) in the top-right of the preview, only enabled when an image is set. Click clears `imagePath` and re-renders.
- Next/Finish disabled while neither image nor `fallbackTranslation` is set.
- No back button by design — closing mid-wizard discards in-progress data (user explicitly chose this; orphan PNGs in `_Cache/` are accepted because the user runs an unlinked-files cleanup plugin separately).

## Adding new functionality (recipes)

### Add a new card type

1. Decide if it's Flow A, Flow B, or a new flow. If new flow: new model + new controller + new modal in parallel files.
2. Add a method `addXxxCard(data: ...)` on [`FlashcardFileBuilder`](src/services/FlashcardFileBuilder.ts) and its interface.
3. If you need new in-card primitives (e.g. table, callout), add them on [`FlashcardBuilder`](src/services/FlashcardBuilder.ts) and its interface.
4. Wire the new method into the relevant controller's markdown-build call.
5. If the new flow needs different frontmatter tags, define the constant in the controller and pass via `.withCustomTags([...])` chained before `.build()`.

### Add a new modal entry point

1. New file in `src/ui/`. Either extend `BaseFlashcardModal` (if you only need the standard JSON-textarea + submit pattern) or extend `Modal` directly (for multi-phase UIs like `ImageFlashcardModal`).
2. Wire as a third menu item in [`main.ts`](src/main.ts) inside the ribbon-icon callback.
3. Export the modal class from [`src/index.ts`](src/index.ts) if other modules need to import it.

### Reuse audio download from a new controller

Don't duplicate audio logic. Inject `AudioDownloadService` via constructor and call `downloadAudioFiles(term, skipFullTermLookup, skipAudio)`. Caching is automatic.

## Build, lint, run

- `npm run dev` — esbuild watch + tsc (development).
- `npm run build` — `tsc -noEmit -skipLibCheck && esbuild production`. Output goes straight to `main.js` next to `manifest.json`.
- After build: **reload the plugin in Obsidian** (Settings → Community plugins → toggle off/on) — Obsidian caches the bundled JS and won't pick up changes otherwise.
- DevTools console (Ctrl+Shift+I) is the place to debug runtime issues. Several modules emit `[Service] ...` console logs.

## Coding conventions specific to this plugin

- **TypeScript strict** is on. Don't disable it.
- **Tabs for indentation** (project preference, see existing files).
- **No new build artifacts in git**: `main.js` is built locally; the release pipeline attaches it to GitHub releases.
- **No external runtime deps that aren't already bundled**: esbuild already bundles everything. Avoid pulling in heavy packages — the plugin is meant to stay small.
- **Prefer composition over inheritance** for services (no abstract `BaseController`-style class — each controller is concrete and small).
- **Old flow is frozen**: changes to `FlashcardController`, `BaseFlashcardModal`, `CreateFlashcardFileModal`, `BackgroundFlashcardModal` should be behaviour-preserving (tested via "create a card with the old menu, file output identical to before"). New behaviour goes into Flow B or a new flow.
- **No clever tag/version state machines on the file builder**: tag selection is a configurator (`withCustomTags`), not a state flag. If a future v3 flow appears, define its own constant in its controller and pass it through.

## Generic Obsidian plugin conventions (still apply)

- `manifest.json` `id` is stable; never rename after release.
- Bump `version` (SemVer) + update `versions.json` for each release.
- Register all listeners with `this.register*` so they clean up on plugin unload — except long-lived `document.addEventListener` patterns explicitly tied to component lifecycle (e.g. wizard's paste listener, cleaned up in `cleanup()`).
- Don't hit the network outside the user-triggered audio download. No telemetry.
- Default to local/offline; the only external service is `dictionary.cambridge.org`.
- UX copy: sentence case for headings/buttons, **bold** for literal UI labels, arrow notation for nav (**Settings → Community plugins**).
- Plugin is `isDesktopOnly: true` because audio conversion uses Node `fluent-ffmpeg`. Don't use Node-only APIs in code paths that should be mobile-safe (none today).

## References

- Obsidian API docs: https://docs.obsidian.md
- Spaced Repetition plugin (the consumer of generated `.md` files): https://github.com/st3v3nmw/obsidian-spaced-repetition
- Cambridge Dictionary (audio source): https://dictionary.cambridge.org
