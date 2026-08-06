# paraguas demo

The 60-second tour: two languages, one embed-tagged key, and the compile error that keeps literal `[checkout]…[/checkout]` tags away from users.

```
npm install
npm start        # build → run → typecheck
```

Then open `src/demo.ts` and uncomment the last lines — `tsc` refuses a tagged key called without its wrapper, or with a wrong tag name.

[Open in StackBlitz](https://stackblitz.com/github/avivabou/paraguas/tree/main/examples/demo)
