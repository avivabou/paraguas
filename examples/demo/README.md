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
npm start          # build i18n → run both consumers → typecheck both
npm run preview    # email service + interactive browser app (language toggle, count slider,
                   # and a button that fetches a localized email from the express service)
```

[Open in StackBlitz](https://stackblitz.com/github/avivabou/paraguas/tree/main/examples/demo)

## What it demonstrates

- **Recipes** — `web` gets `catalog`+`cart`+`common`; `emails` gets `emails`+`common`. Referencing `texts.emails` from the web app is a compile error (see `typeSafetyShowcase` in `packages/web/src/demo.tsx`).
- **Deep merge** — `cart.json` and `common.json` both contribute to `shop.actions.buttons`; each consumer sees its recipe's union of that branch.
- **React embedding** — `[clear]…[/clear]` / `[checkout]…[/checkout]` tags become real `<button>`/`<a>` elements via `reactTokenRenderer`; the wrappers argument is compile-enforced. `npm run preview -w @demo/web` serves an interactive Vite app (the `clear` button actually mutates state), while `demo.tsx` prints the same components via `renderToStaticMarkup`.
- **Browser vs server loading** — the Vite app imports the dist bundles directly and resolves through the browser-safe `paraguas` entry (`browser-i18n.ts`); the console demos read from disk through `@demo/i18n/server` — same keys, same types, two runtimes.
- **ICU × embeds** — `cart.inboxNudge` puts the plural `#` *inside* the embedded label: `You have <a href="/inbox">5 unread messages</a>` — the link text morphs with the count, per language.
- **ICU variety** — plurals with a tag-free `=0` branch (`You have no unread messages` — no link rendered), `select` (gendered greeting), number formatting (`1,299` vs French `1 299`).
- **Three languages** — en, fr, es. Switch to Spanish and check the catalog for why the package is called *paraguas* ☂️.
- **Frontend → service round-trip** — the app's email button fetches `GET /api/order-shipped-email/:orderId?lang=<selected>` (vite proxy → express service): the same selected language localizes both the React page and the server-rendered email.
- **A real HTTP server** — `/email-service` is an express app: `GET /order-shipped-email/:orderId?lang=fr`. Locales preload at boot; `resolve-locale.ts` adapts the request query onto `i18nPackage.resolve`; unsupported (`de`) and missing `?lang=` fall back to `en`.
- **Types end-to-end** — `LocaleKeyTexts<'cart'>` namespace slices in component props; `@ts-expect-error` lines in `demo.tsx` prove wrong tags, missing wrappers, missing ICU params, and out-of-recipe access all fail `tsc`.
- **React-free services** — `@demo/email-service` has no React dependency; the i18n package's 3-line `jsx-shim.d.ts` covers the generated embed signatures for its typecheck.
