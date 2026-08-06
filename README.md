# paraguas

**One typed translation package. Every consumer world.** React in the browser, Node services on the server — shared keys, shared types, build-time guarantees.

paraguas is the *mechanism* for running i18n as a first-class package in a TypeScript monorepo: a recipe-based build pipeline, a typed runtime proxy with embedded-component rendering, and a server-side loader. Your project owns the locale JSONs, the recipe definitions, and the generated types; paraguas owns validation, merging, codegen orchestration, and runtime resolution. Pair it with a codegen package such as [keys-weaver](https://github.com/avivabou/keys-weaver) for per-key typed functions.

```
npm install paraguas
```

## The problem it solves

Translations usually live in one place: the frontend. Then PDFs, emails, CSV error messages, and scheduled jobs start leaking user-facing copy back into TypeScript string literals. Second-language coverage drifts. Nobody can review server-rendered output. CI can't catch missing keys outside the web app.

The fix is structural: make the translation package a dependency any TypeScript code can consume — same typed key inference, same ICU support, same locale files — whether it renders React in a browser or a PDF on a server.

## Concepts

- **Namespace** — one locale JSON file per language (`locales/en/billing.json`, `locales/es/billing.json`). Nested JSON, ICU MessageFormat values.
- **Recipe** — a named subset of namespaces, deep-merged at build time into one bundle per consumer per language (`dist/<recipe>/<lang>.json`). The web app takes all namespaces; a PDF service takes only what it renders.
- **Token structure** — a pattern for tokens inside translation values. The built-in `bracketTagStructure` matches `[tag]label[/tag]` pairs used to embed components (links, buttons) inside copy.

```
locales/                         dist/                     (per recipe × language)
├── en/                          ├── web/
│   ├── billing.json      →      │   ├── en.json
│   ├── checkout.json     →      │   └── es.json
│   └── receipt.json      →      └── pdf/
└── es/  (mirror of en/)             ├── en.json
                                     └── es.json

recipes: { web: ['billing', 'checkout'], pdf: ['billing', 'receipt'] }
```

### Why recipes?

The PDF service never renders the checkout wizard; the web app never renders a receipt. Each consumer pulls only the namespaces it needs — smaller bundles, narrower types. And when the same namespace is in both recipes, copy on screen ≡ copy in the PDF, guaranteed by sharing the source file.

`LocaleKeys` types follow the recipe: the merged type for `pdf` literally does not contain the checkout tree, so referencing it is a compile error — not a runtime miss.

### Deep-merge mechanics

Two namespaces may contribute to the same parent branch. Say `commonButtons.json` (web-only) and `commonText.json` (shared) both root at `common.actions`:

```jsonc
// commonButtons.json (web recipe only)          // commonText.json (web + pdf)
{ "common": { "actions": {                       { "common": { "actions": {
    "buttons": {                                     "buttons": {
      "save": "Save",                                  "approve": "Approve",
      "cancel": "Cancel"                               "decline": "Decline"
    }                                                },
} } }                                                "status": { "approved": "Approved" }
                                                 } } }
```

The `web` bundle's `common.actions.buttons` has all four leaves; the `pdf` bundle only `approve`/`decline`. Shared parents merge; **leaves must have exactly one owner** — if two namespaces define the same leaf path, the build fails naming both owners.

## `paraguas/build` — the pipeline

```ts
import { build, bracketTagStructure } from 'paraguas/build';
import { generate } from 'keys-weaver';

await build({
    localesDir: 'locales',
    distDir: 'dist',
    generatedDir: 'src/generated',
    languages: ['en', 'es'],                 // languages[0] is the reference language
    recipes: { web: ['billing', 'checkout'], pdf: ['billing', 'receipt'] },
    structures: [bracketTagStructure],
    generate: ({ source, output, functionName }) =>
        generate({ source, output, functionName, layout: 'per-node', sortKeys: true }),
});
```

Pipeline order — every run:

1. **Validate** — refuses to ship a drifted bundle:
   - every namespace file exists in every language;
   - no leaf-path collisions across namespaces (each leaf has one owner);
   - key parity between the reference language and every other (`Missing in es: …` / `Extra in es: …` — no half-translations);
   - token parity per structure: unpaired tags (`[readMore]…[/readMor]`) and cross-language tag mismatches are build errors — a translation can move a tag to a different sentence position, but never drop or rename it.
2. **Merge** — deep-merge each recipe's namespaces, sort keys deterministically, write `dist/<recipe>/<lang>.json`.
3. **Codegen** — call the injected `generate` once per namespace, in-process (no CLI process spawning), then emit `namespace-type-map.ts` mapping namespace names to generated types.
4. **Prune** — delete generated files whose namespace no longer exists (no stale types surviving a namespace removal).

All validation failures throw one `ValidationError` listing every mismatch. Typical wiring: run on `postinstall` and in CI so `dist/` is always fresh and PR diffs show the merged output.

## `paraguas` — the runtime

Browser-safe entry: types, the proxy, token rendering, locale guards. No filesystem access.

```ts
import { createLocaleProxy, splitWithTokens, stringTokenRenderer } from 'paraguas';

const texts = createLocaleProxy<MyKeys>((key, values) => i18n.t(key, values), {
    renderTokens: (text, wrappers) => renderMyWay(splitWithTokens(text, wrappers)),
});

texts.billing.greeting({ name: 'Ada' });                       // 'Hi Ada!'
texts.billing.retry({ code }, { readMore: (label) => <a href={url}>{label}</a> });
```

The proxy turns property access into dotted key paths and calls your translate function — i18next in a web app, paraguas's own resolver on a server. When the trailing argument is a **wrapper record** (an object whose values are all functions), it is never forwarded to `t`; the resolved string is routed through the injected `renderTokens` instead. Wrappers without a configured renderer throw `MissingTokenRendererError`.

`splitWithTokens(text, wrappers)` is the React-free core: `'See [x]docs[/x] now'` → `['See ', wrappers.x('docs'), ' now']`. `stringTokenRenderer` joins the parts into a plain string (tests, emails, backends).

### `paraguas/react` — the React renderer

React consumers don't hand-roll the join — `paraguas/react` ships it (React is an optional peer dependency; every other entry stays React-free):

```tsx
import { reactTokenRenderer } from 'paraguas/react';

const texts = createLocaleProxy<MyKeys>(tFn, { renderTokens: reactTokenRenderer });
texts.billing.retry({ code }, { readMore: (label) => <a href={url}>{label}</a> });
```

It interleaves literal text with wrapper outputs inside a keyed `Fragment` and returns a single `JSX.Element`.

### Embeds inside ICU plurals

Token tags compose with ICU plural/select because of the resolution order: ICU resolves **first** (branch selected, `#` substituted — brackets are plain text to ICU), then the surviving branch's tags are rendered:

```ts
const resolver = createTranslationResolver({
    primary: { items: '{count, plural, one {[undo]Undo # item[/undo]} other {# items — [undo]undo all[/undo]}}' },
});
const texts = createLocaleProxy<ItemsKeys>((key, values) => resolver.t(key, values), {
    renderTokens: stringTokenRenderer,
});

texts.items({ count: 1 }, { undo: (label) => `<${label}>` }); // '<Undo 1 item>'
texts.items({ count: 3 }, { undo: (label) => `<${label}>` }); // '3 items — <undo all>'
```

### Type utilities

| Utility | What it gives you |
| --- | --- |
| `LocaleKeysOf<Recipes, TypeMap, R>` | The deeply-merged translation type for a recipe — `LocaleKeysOf<…, 'pdf'>` ≠ `LocaleKeysOf<…, 'web'>`; extra namespaces simply don't exist in the narrower type |
| `NestedPaths<T>` | Union of every dotted key path — autocomplete on `'common.buttons.approve' \| …` |
| `GetNestedValue<T, Path>` | The value type at a path — use it to hand helpers a **namespace slice** (`GetNestedValue<PdfKeys, 'billing'>`) instead of the whole tree |
| `DeepMerge<[A, B, …]>` | The type-level twin of the build-time merge |
| `createLocaleSet(['en', 'es'])` | `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `isSupportedLocale` guard, as one typed unit |

With a codegen like keys-weaver in front, every leaf is a typed function: unknown key → `tsc` error; forgotten ICU param → `tsc` error; renaming a key → compile error in every consumer; embed-tagged key called without wrappers → compile error.

## `paraguas/server` — the loader

Node-only entry: filesystem loaders reading the pre-built recipe bundles. No HTTP, no React.

```ts
import { preloadTypedLocales, resolveLocale } from 'paraguas/server';
import { createLocaleSet } from 'paraguas';

const localeSet = createLocaleSet(['en', 'es'] as const);

// boot — once per process; all locales held in memory
const locales = preloadTypedLocales<PdfKeys>('pdf', { distDir, languages: localeSet.SUPPORTED_LOCALES });

// per request — O(1) pick with fallback to the default locale
const { t, lang } = resolveLocale(req.query.lang, locales, localeSet);
return renderPdf(<Receipt t={t} />);
```

- `loadLocale` / `loadTypedLocale<T>` — one recipe × language; `preloadLocales` / `preloadTypedLocales<T>` — a `Map` of all languages.
- ICU is resolved via `intl-messageformat` **with the requested locale's plural and formatting rules** (Spanish output uses Spanish number grouping and plural categories).
- Missing key in the requested language falls back to the reference language; missing in both throws `TranslationKeyError`.
- `resolveLocale(raw, locales, localeSet)` accepts anything (query param, header, user pref) — non-string or unsupported input falls back to `DEFAULT_LOCALE`.
- `distDir` is explicit, so tests can point at a fixture directory.
- No hot-reload by design: locales don't swap mid-process; language is a request-time decision.

## Bringing a new consumer onto i18n

1. **Register a recipe** — add `myService: ['billing', 'errors']` to your recipes config.
2. **Rebuild** — the pipeline emits `dist/myService/{en,es}.json` + refreshed types.
3. **Wrapper module in your service** — `export type MyLocale = LocaleKeysOf<…, 'myService'>` + a `preload` function.
4. **Preload at boot**, keep the `Map` in your server context.
5. **Resolve per request** with `resolveLocale`.
6. **Thread `t` through handlers** — narrow to namespace slices (`GetNestedValue<MyLocale, 'errors'>`) rather than passing the whole tree.
7. **Wire the build order** — your service's `tsc` runs after the i18n build, so `dist/` and generated types exist.

The caller (web app, upstream service) decides the language and passes it along — query param, header, stored preference.

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
function fmt(t: PdfKeys) { … }
// ✅ the slice it needs
function fmt(t: GetNestedValue<PdfKeys, 'billing'>) { … }
```

Testing: load the real bundles (sync fs read — fast), assert against key calls, never against literal copy:

```ts
const tEs = loadTypedLocale<PdfKeys>('pdf', 'es', options);

it('renders the Spanish total label', () => {
    const pdf = renderInvoice(invoice, { locale: tEs });
    expect(pdf).toContain(tEs.invoice.total());   // not "Total" — copy changes must not break tests
});
```

Don't mock the i18n layer — the real loader catches copy bugs that mocks hide.

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
paraguas-merge-locales --resolve locales/en/billing.json
```

## License

MIT
