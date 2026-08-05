# paraguas

A generic i18n mechanism for TypeScript monorepos: a **recipe-based locale build pipeline**, a **typed runtime proxy** with embedded-component rendering, and a **server-side loader** — consumable by both frontend apps and backend services.

paraguas owns the mechanism; your project owns the locale JSONs, the recipe definitions, and the generated types. Pair it with a codegen package such as [keys-weaver](https://github.com/avivabou/keys-weaver) for per-key typed functions.

```
npm install paraguas
```

## Concepts

- **Namespace** — one locale JSON file per language (`locales/en/billing.json`, `locales/es/billing.json`).
- **Recipe** — a named subset of namespaces merged into a single runtime bundle (`dist/<recipe>/<lang>.json`). A web app can consume all namespaces; a PDF service only the few it needs.
- **Token structure** — a pattern for tokens inside translation values (the built-in `bracketTagStructure` matches `[tag]label[/tag]` pairs used to embed components in copy).

## `paraguas/build` — the pipeline

```ts
import { build, bracketTagStructure } from 'paraguas/build';
import { generate } from 'keys-weaver';

await build(
    {
        localesDir: 'locales',
        distDir: 'dist',
        generatedDir: 'src/generated',
        languages: ['en', 'es'],
        recipes: { frontend: ['pages', 'billing'], pdf: ['billing'] },
        structures: [bracketTagStructure],
        generate: ({ source, output, functionName }) =>
            generate({ source, output, functionName, layout: 'per-node' }),
    },
);
```

(`build` also accepts a second `extras` argument — e.g. `{ typeMapTypeParams: [...] }` when the codegen emits generic key types; with keys-weaver's defaults the generated types are non-generic and it is unnecessary.)

Pipeline order:

1. **Validate** — every namespace exists in every language; no leaf-path collisions across namespaces; per-language key parity (missing/extra keys listed); per-structure token parity (unpaired tokens, cross-language tag mismatches).
2. **Merge** — deep-merge each recipe's namespaces, sort keys deterministically, write `dist/<recipe>/<lang>.json`.
3. **Codegen** — call the injected `generate` once per namespace, in-process (no CLI spawning), then emit `namespace-type-map.ts` mapping namespace names to their generated types.

All validation failures throw a single `ValidationError` listing every mismatch.

## `paraguas` — the runtime

```ts
import { createLocaleProxy, splitWithTokens, stringTokenRenderer } from 'paraguas';

const texts = createLocaleProxy<MyKeys>((key, values) => i18n.t(key, values), {
    renderTokens: (text, wrappers) => renderMyWay(splitWithTokens(text, wrappers)),
});

texts.billing.greeting({ name: 'Ada' });
texts.billing.retry({ accountingName }, { readMore: (label) => <a href={url}>{label}</a> });
```

The proxy turns property access into dotted key paths and calls your translate function. When the trailing argument is a **wrapper record** (an object whose values are all functions), it is never forwarded to `t` — the resolved string is routed through the injected `renderTokens` instead. Passing wrappers without a configured renderer throws `MissingTokenRendererError`.

`splitWithTokens(text, wrappers)` is the React-free core: it splits `'See [x]docs[/x] now'` into `['See ', wrappers.x('docs'), ' now']`. A React consumer joins the parts with `createElement(Fragment, …)`; `stringTokenRenderer` joins them into a plain string (handy for tests and backends).

### Embeds inside ICU plurals

Token tags compose with ICU plural/select because of the resolution order: the proxy resolves the ICU message **first** (branch selected, `#` substituted — brackets are plain text to ICU), and only **then** renders the tags of the surviving branch:

```ts
const resolver = createTranslationResolver({
    primary: {
        items: '{count, plural, one {[undo]Undo # item[/undo]} other {# items — [undo]undo all[/undo]}}',
    },
});
const texts = createLocaleProxy<ItemsKeys>((key, values) => resolver.t(key, values), {
    renderTokens: stringTokenRenderer,
});

texts.items({ count: 1 }, { undo: (label) => `<${label}>` }); // '<Undo 1 item>'
texts.items({ count: 3 }, { undo: (label) => `<${label}>` }); // '3 items — <undo all>'
```

Tags in non-selected branches are never rendered; a tag may appear in some branches only — the wrapper is simply unused for counts that select a tag-less branch.

Type utilities: `DeepMerge`, `MapNamespaces`, `LocaleKeysOf<Recipes, TypeMap, Recipe>`, `NestedPaths`, `GetNestedValue`, plus `createLocaleSet(['en', 'es'])` for locale guards.

## `paraguas/server` — the loader

```ts
import { loadTypedLocale, preloadTypedLocales } from 'paraguas/server';

const texts = loadTypedLocale<PdfKeys>('pdf', 'es', { distDir, languages: ['en', 'es'] });
const all = preloadTypedLocales<PdfKeys>('pdf', { distDir, languages: ['en', 'es'] });
```

Reads merged recipe JSON from disk, resolves ICU messages via `intl-messageformat` **with the correct locale's plural and formatting rules**, and falls back to the reference language for missing keys (missing in both → `TranslationKeyError`).

## License

MIT
