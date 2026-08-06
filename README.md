# paraguas

[![npm](https://img.shields.io/npm/v/paraguas)](https://www.npmjs.com/package/paraguas)
[![CI](https://github.com/avivabou/paraguas/actions/workflows/ci.yml/badge.svg)](https://github.com/avivabou/paraguas/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/paraguas)](./LICENSE)

**One typed translation package. Every consumer world.** React in the browser, Node services on the server — shared keys, shared types, build-time guarantees.

```tsx
// "cta": "See [readMore]Read more[/readMore]"

texts.cart.cta({}, { readMore: (label) => <a href={url}>{label}</a> });  // ✅

texts.cart.cta({});
// ❌ tsc: Expected 2 arguments, but got 1 — the compiler won't let
//    literal [readMore]…[/readMore] tags reach your users
```

paraguas is the *mechanism* for running i18n as a first-class package in a TypeScript monorepo: a recipe-based build pipeline, a typed runtime proxy with embedded-component rendering, and a server-side loader. Your project owns the locale JSONs, the recipe definitions, and the generated types; paraguas owns validation, merging, codegen orchestration, and runtime resolution. It bundles [keys-weaver](https://github.com/avivabou/keys-weaver) as its default type generator.

```
npm install paraguas
```

## The problem it solves

Translations usually live in one place: the frontend. Then transactional emails, PDFs, CSV error messages, and scheduled jobs start leaking user-facing copy back into TypeScript string literals. Second-language coverage drifts. Nobody can review server-rendered output. CI can't catch missing keys outside the web app.

The fix is structural: make the translation package a dependency any TypeScript code can consume — same typed key inference, same ICU support, same locale files — whether it renders React in a browser or an email on a server.

## Concepts

- **Namespace** — one locale JSON file per language (`locales/en/catalog.json`, `locales/fr/catalog.json`). Nested JSON, ICU MessageFormat values.
- **Recipe** — a named subset of namespaces, deep-merged at build time into one bundle per consumer per language (`dist/<recipe>/<lang>.json`). The web app takes all namespaces; the email service takes only what it renders.
- **Token structure** — a pattern for tokens inside translation values. The built-in `bracketTagStructure` matches `[tag]label[/tag]` pairs used to embed components (links, buttons) inside copy.

```
locales/                         dist/                     (per recipe × language)
├── en/                          ├── web/
│   ├── catalog.json      →      │   ├── en.json
│   ├── cart.json         →      │   └── fr.json
│   ├── emails.json       →      └── emails/
│   └── common.json       →          ├── en.json
└── fr/  (mirror of en/)             └── fr.json

recipes: { web: ['catalog', 'cart', 'common'], emails: ['emails', 'common'] }
```

### Why recipes?

The email service never renders the product catalog; the web app never renders an order-confirmation email. Each consumer pulls only the namespaces it needs — smaller bundles, narrower types. And when the same namespace is in both recipes (`common`), copy on screen ≡ copy in the email, guaranteed by sharing the source file.

`LocaleKeysOf` types follow the recipe: the merged type for `emails` literally does not contain the catalog tree, so referencing it is a compile error — not a runtime miss.

### Deep-merge mechanics

Two namespaces may contribute to the same parent branch. Say `cart.json` (web-only) and `common.json` (shared) both root at `shop.actions`:

```jsonc
// cart.json (web recipe only)                   // common.json (web + emails)
{ "shop": { "actions": {                         { "shop": { "actions": {
    "buttons": {                                     "buttons": {
      "addToCart": "Add to cart",                      "viewOrder": "View order",
      "clear": "Clear"                                 "trackShipment": "Track shipment"
    }                                                },
} } }                                                "status": { "shipped": "Shipped" }
                                                 } } }
```

The `web` bundle's `shop.actions.buttons` has all four leaves; the `emails` bundle only `viewOrder`/`trackShipment`. Shared parents merge; **leaves must have exactly one owner** — if two namespaces define the same leaf path, the build fails naming both owners.

## `paraguas/build` — the pipeline

```ts
import { build, bracketTagStructure } from 'paraguas/build';

await build({
    localesDir: 'locales',
    distDir: 'dist',
    generatedDir: 'src/generated',
    languages: ['en', 'fr'],
    recipes: { web: ['catalog', 'cart', 'common'], emails: ['emails', 'common'] },
    structures: [bracketTagStructure],
    codegen: { layout: 'single-file', sortKeys: true, emitFactory: false },
});
```

### `build(config, extras?)` parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `localesDir` | `string` | ✅ | Root of the locale sources; expects `<localesDir>/<lang>/<namespace>.json` |
| `distDir` | `string` | ✅ | Output root for merged bundles: `<distDir>/<recipe>/<lang>.json` |
| `languages` | `readonly string[]` | ✅ | All languages; **`languages[0]` is the reference language** — every other language is validated against it, and it is the fallback source |
| `recipes` | `Record<string, readonly string[]>` | ✅ | Recipe name → ordered namespace list. Order matters only for merge precedence of shared parents |
| `generatedDir` | `string` | — | Where generated key types + `namespace-type-map.ts` go. Omit to skip codegen entirely |
| `structures` | `TokenStructure[]` | — | Token structures to **validate** cross-language (see below). Default: none |
| `codegen` | `Omit<GenerateOptions, 'source' \| 'output' \| 'functionName'>` | — | Passthrough to the bundled keys-weaver generator: `layout` (`'single-file'` \| `'per-node'`), `sortKeys`, `emitFactory`, `comments`, `banner`, `structures` |
| `generate` | `(req: { source, output, functionName }) => Promise \| unknown` | — | Replace the bundled generator entirely (custom codegen). When set, `codegen` is ignored |
| `functionNameFor` | `(namespace: string) => string` | — | Generated type/file base name per namespace. Default: PascalCase + `Keys` (`order-emails` → `OrderEmailsKeys`) |
| `extras.typeMapTypeParams` | `string[]` | — | Generic params for `namespace-type-map.ts` when a custom generator emits generic types. Unnecessary with the bundled generator |

### `TokenStructure` (validation-side)

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Name used in error messages (`unpaired embed token(s)…`) |
| `pattern` | `RegExp` | Global regex; capture group 1 = token name, group 2 = label. `bracketTagStructure` = `/\[(\w+)\](.*?)\[\/\1\]/g` |
| `malformedPattern` | `RegExp?` | Detects leftovers after well-formed pairs are stripped (`/\[\/?\w+\]/g` for brackets) — catches `[readMore]…[/readMor]` typos |

### Pipeline order — every run

1. **Validate** — refuses to ship a drifted bundle:
   - every namespace file exists in every language;
   - no leaf-path collisions across namespaces (each leaf has one owner);
   - key parity between the reference language and every other (`Missing in fr: …` / `Extra in fr: …` — no half-translations);
   - token parity per structure: unpaired tags and cross-language tag mismatches are build errors — a translation can move a tag to a different sentence position, but never drop or rename it.
2. **Merge** — deep-merge each recipe's namespaces, sort keys deterministically, write `dist/<recipe>/<lang>.json`.
3. **Codegen** — generate typed key functions per namespace, in-process (no CLI spawning), then emit `namespace-type-map.ts`.
4. **Prune** — delete generated files whose namespace no longer exists.

All validation failures throw one `ValidationError` listing every mismatch. Typical wiring: run on `postinstall` and in CI so `dist/` is always fresh and PR diffs show the merged output.

## `paraguas` — the runtime

Browser-safe entry: types, the proxy, token rendering, locale guards. No filesystem access.

### `createLocaleProxy<T>(t, options?)`

| Parameter | Type | Description |
| --- | --- | --- |
| `t` | `(key: string, values?: Record<string, unknown>) => string` | Your translate function — i18next's `t` in a web app, paraguas's own resolver on a server |
| `options.renderTokens` | `TokenRenderer?` | Renderer invoked when a call passes embed wrappers. Omit it and any wrappers call throws `MissingTokenRendererError` |

The proxy turns property access into dotted key paths and calls `t`. When the trailing argument is a **wrapper record** (an object whose values are all functions), it is never forwarded to `t`; the resolved string is routed through `renderTokens` instead.

```ts
texts.cart.summary({ count: 3 });                                   // plain ICU key → string
texts.cart.emptyHint({ }, { browse: (label) => <a href="/">{label}</a> }); // embed key → element
```

### Token helpers

| Export | Signature | Use |
| --- | --- | --- |
| `splitWithTokens` | `(text, wrappers, structure?) => Array<string \| T>` | The React-free split/interleave core — build custom renderers on it |
| `stringTokenRenderer` | `TokenRenderer<string>` | Joins parts into a plain string — emails, logs, string-only tests |
| `bracketTagStructure` | `TokenStructure` | The `[tag]label[/tag]` pattern, shared by build validation and runtime |

### `resolveLocale(raw, locales, localeSet)`

Per-request pick from a preloaded map: accepts anything (query param, header, stored preference); non-string or unsupported input falls back to `DEFAULT_LOCALE`; a supported-but-not-preloaded locale throws `LocaleNotPreloadedError`.

### `createLocaleSet(locales)`

`createLocaleSet(['en', 'fr'] as const)` → `{ SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale }` as one typed unit. `DEFAULT_LOCALE` is the first entry.

### `defineLocalePackage({ languages, recipes })`

The one-call glue for a consumer monorepo's i18n package — returns everything the pieces above would be wired into by hand:

| Field | What it is |
| --- | --- |
| `localeSet` | The `createLocaleSet` result for `languages` |
| `languages`, `recipes` | Passthrough, `const`-typed — spread into `build()` |
| `loadOptions(distDir, proxy?)` | `LoadOptions` factory for the server loaders |
| `resolve(raw, locales)` | `resolveLocale` bound to the package's locale set |

`LocaleKeysFor<typeof pkg, NamespaceTypeMap, R>` derives the recipe-keyed translation type from the package object. See the full setup below.

### Type utilities

| Utility | What it gives you |
| --- | --- |
| `LocaleKeysOf<Recipes, TypeMap, R>` | The deeply-merged translation type for a recipe |
| `NestedPaths<T>` | Union of every dotted key path — autocomplete on `'shop.actions.buttons.viewOrder' \| …` |
| `GetNestedValue<T, Path>` | The value type at a path — define a `Texts<P>` alias once in your glue package and use it in every helper signature |
| `DeepMerge<[A, B, …]>` | The type-level twin of the build-time merge |
| `LocaleKeysFor<Pkg, TypeMap, R>` | `LocaleKeysOf` keyed off a `defineLocalePackage` object |

## `paraguas/react` — the React renderer

React is an optional peer dependency; every other entry stays React-free.

```tsx
import { reactTokenRenderer } from 'paraguas/react';

const texts = createLocaleProxy<WebKeys>(tFn, { renderTokens: reactTokenRenderer });
```

Interleaves literal text with wrapper outputs inside a keyed `Fragment`, returns one `JSX.Element`.

### Embeds inside ICU plurals

Tags compose with ICU plural/select because ICU resolves **first** (branch selected, `#` substituted — brackets are plain text to ICU), then the surviving branch's tags render:

```ts
// "{count, plural, one {[undo]Undo # item[/undo]} other {# items — [undo]undo all[/undo]}}"
texts.cart.removed({ count: 1 }, { undo: (label) => <button>{label}</button> });
```

## `paraguas/server` — the loader

Node-only entry: filesystem loaders reading the pre-built recipe bundles. No HTTP, no React.

### Loader functions

| Function | Returns | Use |
| --- | --- | --- |
| `loadTypedLocale<T>(recipe, lang, options)` | `T` | One typed proxy for one recipe × language |
| `preloadTypedLocales<T>(recipe, options)` | `Map<string, T>` | One proxy per language — call once at boot |
| `loadLocale(recipe, lang, options)` | `TranslationResolver` | Lower-level: the raw `t(key, values?)` resolver |
| `preloadLocales(recipe, options)` | `Map<string, TranslationResolver>` | All languages as raw resolvers |

### `LoadOptions`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `distDir` | `string` | ✅ | Where the built bundles live — explicit so tests can point at fixtures |
| `languages` | `readonly string[]` | ✅ | Languages to accept/preload; `languages[0]` is the fallback source unless overridden |
| `fallbackLanguage` | `string?` | — | Override the fallback source language |
| `proxy` | `LocaleProxyOptions?` | — | Options for the typed proxy — e.g. `{ renderTokens: stringTokenRenderer }` for services that render embeds into strings |

Semantics: ICU resolves via `intl-messageformat` **with the requested locale's plural and formatting rules** (French output gets French plural categories and number grouping). A key missing in the requested language falls back to the reference language; missing in both throws `TranslationKeyError`. No hot-reload by design — language is a request-time decision over a boot-time preload.

## Best practice — full setup

Monorepo layout: one internal package owns the locale content; every consumer depends on it. `defineLocalePackage` collapses the glue to a single call:

```ts
// packages/my-i18n/src/package.ts — languages + recipes, once
import { defineLocalePackage } from 'paraguas';

export const i18nPackage = defineLocalePackage({
    languages: ['en', 'fr'] as const,
    recipes: { web: ['catalog', 'cart', 'common'], emails: ['emails', 'common'] } as const,
});
// → { localeSet, loadOptions(distDir, proxy?), resolve(raw, locales), languages, recipes }
```

```
packages/my-i18n/
├── locales/{en,fr}/{catalog,cart,emails,common}.json
├── src/
│   ├── package.ts        # the defineLocalePackage call above
│   ├── build.ts          # the build() call above; run on postinstall + CI
│   ├── index.ts          # type glue + paraguas re-exports (below)
│   └── generated/        # committed output of the build
└── server.ts             # subpath for Node consumers
```

```ts
// packages/my-i18n/src/index.ts — the type glue every consumer imports
import type { GetNestedValue, LocaleKeysFor, NestedPaths } from 'paraguas';
import type { NamespaceTypeMap } from './generated/namespace-type-map';
import { i18nPackage } from './package';

export type LocaleKeys<R extends keyof typeof i18nPackage.recipes> = LocaleKeysFor<typeof i18nPackage, NamespaceTypeMap, R>;
export type EmailKeys = LocaleKeys<'emails'>;
export type EmailTexts<P extends NestedPaths<EmailKeys>> = GetNestedValue<EmailKeys, P>;
export { createLocaleProxy } from 'paraguas';
export { i18nPackage };
```

The build call binds the same package object:

```ts
// packages/my-i18n/src/build.ts
await build({ localesDir, distDir, generatedDir, ...i18nPackage, structures: [bracketTagStructure] });
```

### Frontend (React + i18next)

```tsx
// web/src/i18n.ts
import type { LocaleKeys } from 'my-i18n';
import { createUseLocaleKeys } from 'paraguas/react-i18next';
import { reactTokenRenderer } from 'paraguas/react';

export type WebKeys = LocaleKeys<'web'>;
export const useTexts = createUseLocaleKeys<WebKeys>({ renderTokens: reactTokenRenderer });
```

```tsx
// web/src/cart/CartBanner.tsx
const { t: texts } = useTexts();

<p>{texts.cart.summary({ count: items.length })}</p>
<p>{texts.cart.emptyHint({}, { browse: (label) => <Link to="/catalog">{label}</Link> })}</p>
```

i18next loads `my-i18n/dist/web/<lang>.json` (bundle it in dev, fetch it lazily in prod) — paraguas doesn't care how the bundle reaches i18next.

### Node service (emails)

```tsx
// emails/src/i18n.ts
import { i18nPackage, type EmailKeys } from 'my-i18n';
import { stringTokenRenderer } from 'paraguas';
import { preloadTypedLocales } from 'paraguas/server';

const distDir = require.resolve('my-i18n/package.json').replace('package.json', 'dist');
const options = i18nPackage.loadOptions(distDir, { renderTokens: stringTokenRenderer });
export const preloadEmailLocales = () => preloadTypedLocales<EmailKeys>('emails', options);
```

```tsx
// emails/src/server.ts — boot once, pick per request
import { i18nPackage } from 'my-i18n';

const locales = preloadEmailLocales();

app.post('/order-shipped', (req, res) => {
    const { t, lang } = i18nPackage.resolve(req.query.lang, locales);
    sendEmail(renderShippedEmail({ t: t.emails.orderShipped, order }));
});
```

Thread **namespace slices**, not the whole tree — through the `EmailTexts` alias the glue package exports:

```ts
function renderShippedEmail({ t, order }: { t: EmailTexts<'emails.orderShipped'>; order: Order }) {
    return `${t.subject({ orderId: order.id })}\n${t.body({ eta: order.eta })}`;
}
```

### Tests — real bundles, key-based assertions

```ts
const tFr = loadTypedLocale<EmailKeys>('emails', 'fr', options);

it('renders the French shipped subject', () => {
    const email = renderShippedEmail({ t: tFr.emails.orderShipped, order });
    expect(email).toContain(tFr.emails.orderShipped.subject({ orderId: order.id }));
    // never a literal "Votre commande…" — copy changes must not break tests
});
```

Don't mock the i18n layer — the real loader is a sync fs read and catches copy bugs mocks hide.

### `paraguas/react-i18next` — the hook factory

For React apps on i18next, the consumer hook is one line (react-i18next + i18next are optional peers):

```tsx
import { createUseLocaleKeys } from 'paraguas/react-i18next';
import { reactTokenRenderer } from 'paraguas/react';

export const useTexts = createUseLocaleKeys<WebKeys>({ renderTokens: reactTokenRenderer });

const { t: texts } = useTexts();               // whole tree
const { t: actions } = useTexts('shop.actions'); // typed namespace slice
```

The hook returns `{ t, i18n, ready }`; `getNestedValue` (exported from the main entry) is the runtime twin of the `GetNestedValue` type if you slice manually.

## Using it right

```ts
// ❌ concatenating translated fragments — breaks word order in other languages
const msg = t.errors.notFound() + ' ' + t.actions.retry();
// ✅ one key owning the whole sentence, ICU params inside

// ❌ string surgery on translated text
t.greeting().replace('NAME', name);
// ✅ ICU param
t.greeting({ name });

// ❌ handing a helper the entire locale tree
function fmt(t: EmailKeys) { … }
// ✅ the slice it needs, via the alias defined once in the glue package
function fmt(t: EmailTexts<'emails.orderShipped'>) { … }
```

## How it compares

Different tools optimize for different things — this is where paraguas + keys-weaver sit:

| | paraguas + keys-weaver | i18next (+ react-i18next) | typesafe-i18n | Lingui |
| --- | --- | --- | --- | --- |
| Typed key paths | ✅ generated per namespace | ⚠️ via manual type augmentation | ✅ | ⚠️ ids are strings |
| Typed ICU params per key | ✅ required function args | ⚠️ partial | ✅ | ❌ runtime |
| **Compile-enforced embedded components** | ✅ per-key wrapper args | ❌ `<Trans>` is untyped per key | ❌ | ❌ `<Trans>` is untyped per key |
| Node services from the same keys | ✅ first-class loader | ⚠️ possible, DIY | ⚠️ | ⚠️ react-centric |
| Per-consumer bundles (recipes) | ✅ | ❌ | ❌ | ❌ |
| Locale-JSON git merge driver | ✅ shipped CLI | ❌ | ❌ | ❌ |
| Runtime framework | bring your own (works *with* i18next) | i18next | own | own |

paraguas is a *mechanism*, not a runtime replacement — the recommended frontend setup runs **on top of** i18next and adds the typing, recipes, and embed enforcement it lacks.

## Guarantees at a glance

| Layer | Guarantee |
| --- | --- |
| Compile time | Unknown key, missing ICU param, key referenced outside your recipe, embed key without wrappers — all `tsc` errors |
| Build time | Missing namespace file, leaf-path collision, key-parity drift, unpaired/renamed embed tags — all `ValidationError`s |
| Runtime | Requested-language miss falls back to the reference language; miss in both throws `TranslationKeyError`; unsupported locale input falls back to the default |

## `paraguas-merge-locales` — git merge driver

Locale JSONs conflict constantly on busy branches. The shipped CLI resolves them semantically — one side changed a key → take it; both made the same change → keep it; both changed it differently → fail as a real conflict:

```
# .gitattributes
locales/**/*.json merge=locale-json

# register the driver
git config merge.locale-json.driver 'paraguas-merge-locales --driver %O %A %B'

# or fix a file that already has conflict markers
paraguas-merge-locales --resolve locales/en/catalog.json
```

## License

MIT
