# paraguas monorepo demo

A miniature monorepo showing the full mechanism — one i18n package, two consumer worlds:

```
packages/
├── i18n/             @demo/i18n — locale JSONs, defineLocalePackage, build, generated types
├── web/              @demo/web — React: components embedded inside translations
└── email-service/    @demo/email-service — Node service, zero React anywhere
```

```
npm install
npm start        # build i18n → run both consumers → typecheck both
```

[Open in StackBlitz](https://stackblitz.com/github/avivabou/paraguas/tree/main/examples/demo)

## What it demonstrates

- **Recipes** — `web` gets `catalog`+`cart`+`common`; `emails` gets `emails`+`common`. Referencing `texts.emails` from the web app is a compile error (see `typeSafetyShowcase` in `packages/web/src/demo.tsx`).
- **Deep merge** — `cart.json` and `common.json` both contribute to `shop.actions.buttons`; each consumer sees its recipe's union of that branch.
- **React embedding** — `[undo]…[/undo]` / `[checkout]…[/checkout]` tags become real `<button>`/`<a>` elements via `reactTokenRenderer`; the wrappers argument is compile-enforced.
- **ICU × embeds** — `cart.inboxNudge` puts the plural `#` *inside* the embedded label: `You have <a href="/inbox">5 unread messages</a>` — the link text morphs with the count, per language.
- **ICU variety** — plurals, `select` (gendered greeting), number formatting (`1,299` vs French `1 299`).
- **Locale resolution** — the email service preloads once and picks per request via `i18nPackage.resolve`; unsupported (`de`) and missing input fall back to `en`.
- **Types end-to-end** — `WebTexts<'cart'>` namespace slices in component props; `@ts-expect-error` lines in `demo.tsx` prove wrong tags, missing wrappers, missing ICU params, and out-of-recipe access all fail `tsc`.
- **React-free services** — `@demo/email-service` has no React dependency; the i18n package's 3-line `jsx-shim.d.ts` covers the generated embed signatures for its typecheck.
