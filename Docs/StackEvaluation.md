# Technology Stack Evaluation — AJJ Custom Form Solution

This document scores four candidate technology approaches for building the custom embeddable form solution. The evaluation is grounded in the primary constraint: the form must be deliverable to any host website via a single `<script>` tag, with no framework installation required on the host.

---

## Evaluation Criteria and Weights

| # | Criterion | Weight | Rationale |
|---|---|---|---|
| 1 | Embeddability (single script / iframe) | 25% | Core requirement; host sites have no build toolchain |
| 2 | Dependency footprint | 20% | Large bundles are a barrier on existing high-traffic pages |
| 3 | Browser compatibility | 15% | Must work on modern browsers without polyfill complexity |
| 4 | Maintainability | 15% | Small team; code must be legible and updatable |
| 5 | Development speed | 15% | Time-to-delivery is a real constraint |
| 6 | Backend submission handling | 10% | Must integrate with a REST endpoint |

Scores: 1 (poor) → 5 (excellent)

---

## Candidate A — Pure HTML5 + Vanilla JavaScript + CSS

### Overview

No framework, no build toolchain required at runtime. The embed widget is a self-contained `.js` file that programmatically builds and injects the form DOM. All reactivity, state management, and DOM diffing are hand-written.

### Scoring

| Criterion | Score | Justification |
|---|---|---|
| Embeddability | 5 | One `<script>` tag. Zero peer dependencies. Works anywhere. |
| Dependency footprint | 5 | Bundle under 15 KB gzipped. No runtime framework. |
| Browser compatibility | 5 | Works in any ES5+ browser. Trivially polyfillable. |
| Maintainability | 2 | Conditional logic engine, 20+ field types, and multi-step state require either a framework or a hand-rolled equivalent. Without structure, the codebase becomes brittle and hard to test. |
| Development speed | 2 | Every abstraction (reactivity, component lifecycle, templating) must be built from scratch. This is weeks of foundational work before any form field can be rendered. |
| Backend submission handling | 4 | Standard `fetch` POST. No special requirements. |

### Weighted Score: **3.55 / 5.00**

### Verdict

Vanilla JS is the right choice for a three-field contact form. It is the wrong choice for a Tally.so replacement requiring 20+ field types, a conditional logic engine, answer piping, and dynamic multi-step navigation. Building those features without a reactivity system produces unmaintainable code.

---

## Candidate B — Alpine.js + Tailwind CSS

### Overview

Alpine.js provides declarative reactivity via HTML attributes (`x-data`, `x-show`, `x-bind`, `x-on`). It is ~15 KB gzipped. Tailwind CSS handles utility-class styling. A Vite or Rollup build step bundles both into a single IIFE file.

### Scoring

| Criterion | Score | Justification |
|---|---|---|
| Embeddability | 5 | Single bundled file. `Alpine.start()` initialises from one call. With correct scoping, does not pollute host-page globals. |
| Dependency footprint | 5 | Alpine.js ~15 KB + purged Tailwind ~5–20 KB = well under 50 KB total. |
| Browser compatibility | 4 | All modern browsers. IE 11 needs minor polyfills. |
| Maintainability | 3 | Acceptable for bounded complexity. As the number of conditional logic rules and field types grows, `x-data` objects become large and difficult to navigate. No native file-based component model means modules must be invented manually. |
| Development speed | 4 | Rapid for interactive HTML. No virtual DOM to reason about. Familiar to most developers. |
| Backend submission handling | 4 | Standard `fetch` POST. |

### Weighted Score: **4.25 / 5.00**

### Verdict

Alpine.js is well suited for enhancing server-rendered pages with interactive islands. It is not designed for building standalone embeddable widgets with a rich, deeply nested component tree. Specifically: it has no file-based component model, no native equivalent to `defineCustomElement` for Shadow DOM isolation, and becomes difficult to maintain when the conditional logic engine grows beyond trivial complexity.

---

## Candidate C — Vue 3 (Composition API) + Vite + TypeScript

### Overview

Vue 3 with the Composition API provides a mature, file-based component model, fine-grained dependency-tracked reactivity, single-file components (`.vue`), and first-class TypeScript support. Vite's library mode outputs the entire widget as a single IIFE or ESM file. Vue's `defineCustomElement` converts any component into a native Web Component with Shadow DOM isolation.

### Scoring

| Criterion | Score | Justification |
|---|---|---|
| Embeddability | 5 | Vite `lib` mode outputs a self-contained `embed.iife.js` loadable via one `<script>` tag. `defineCustomElement` produces a true Web Component (`<ajj-form>`) with Shadow DOM isolation — the strongest possible embed isolation without an iframe. |
| Dependency footprint | 4 | Vue 3 runtime-only build ~22 KB gzipped. Full embed bundle (Vue + Tailwind + all fields) estimatable under 60 KB gzipped. Higher than Vanilla or Alpine but well within acceptable range for an interactive widget. |
| Browser compatibility | 4 | All modern browsers (Chrome, Firefox, Safari, Edge). IE11 is not supported but is not a realistic deployment target. |
| Maintainability | 5 | Single-file components with colocated template, script, and style. Clear component lifecycle. TypeScript types for the form schema. The Composition API maps directly to the form engine's concerns: `useFormState`, `useValidation`, `useConditionalLogic`, `useMultiStep` are independently testable composables. |
| Development speed | 4 | Strong tooling (Vite HMR, Vue DevTools). Rich ecosystem. Component patterns for forms are well established. Slightly slower than Alpine for trivial interactions but faster for complex, stateful UIs. |
| Backend submission handling | 4 | Standard `fetch`. Axios is available in the ecosystem if needed. |

### Weighted Score: **4.50 / 5.00**

### Verdict

Vue 3 is the highest-scoring candidate. It is the right tool for this use case because it provides the maintainable component architecture needed for 20+ field types and a conditional logic engine, while still producing a bundle small enough for single-script-tag embedding. The Web Component output via `defineCustomElement` is architecturally superior to an `<iframe>` embed and superior to Alpine's lack of Shadow DOM isolation.

---

## Candidate D — React + Vite Build

### Overview

React with a Vite library-mode build. Included for completeness as the most widely known framework.

### Scoring

| Criterion | Score | Justification |
|---|---|---|
| Embeddability | 4 | Achievable via Vite lib mode. However, React's synthetic event system can conflict with host-page event listeners, and React Concurrent Mode adds complexity to isolation in a foreign DOM context. |
| Dependency footprint | 3 | React + ReactDOM gzipped: ~42–45 KB. The heaviest baseline of the four candidates. |
| Browser compatibility | 4 | All modern browsers supported. |
| Maintainability | 4 | Industry standard. Largest talent pool. Hooks model is well understood. |
| Development speed | 3 | More boilerplate than Vue for presentational components. JSX transpilation adds a step. The hooks mental model is powerful but slower for form-centric, template-heavy UIs. |
| Backend submission handling | 4 | Standard `fetch`. |

### Weighted Score: **3.65 / 5.00**

### Verdict

React is an excellent choice for complex, long-lived web applications. For an embeddable form widget, its heavier baseline bundle (~20 KB more than Vue), more complex host-page isolation story, and greater verbosity for template-centric UI work make it the inferior choice compared to Vue 3.

---

## Summary Comparison Table

| Criterion | Weight | Vanilla JS | Alpine.js | **Vue 3** | React |
|---|---|---|---|---|---|
| Embeddability | 25% | 5 | 5 | **5** | 4 |
| Dependency footprint | 20% | 5 | 5 | **4** | 3 |
| Browser compatibility | 15% | 5 | 4 | **4** | 4 |
| Maintainability | 15% | 2 | 3 | **5** | 4 |
| Development speed | 15% | 2 | 4 | **4** | 3 |
| Backend handling | 10% | 4 | 4 | **4** | 4 |
| **Weighted Total** | | **3.55** | **4.25** | **4.50** | **3.65** |

---

## Recommendation

**Vue 3 (Composition API) + Vite + TypeScript + Tailwind CSS**

Vue 3 achieves the highest weighted score and is the only candidate that satisfies all three of the most critical constraints simultaneously: (1) single-script-tag embeddability with native Web Component output, (2) a structured component model for a 20-field-type library, and (3) a testable composable architecture for the conditional logic engine.

See [`Docs/Architecture.md`](./Architecture.md) for the full architecture built on this stack.
