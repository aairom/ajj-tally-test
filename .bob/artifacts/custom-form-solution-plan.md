# Custom Self-Hosted Embeddable Form Solution — Technical Plan

**Project:** AJJ-Tally — Replace Tally.so with a Custom, Self-Hosted, Web-Embeddable Form Platform  
**Status:** Planning  
**Scope:** Full-stack custom form builder and embed runtime

---

## Top-Level Overview

This plan describes the design, architecture, and implementation roadmap for a custom, self-hosted form solution intended as a functional replacement for Tally.so. The solution is scoped specifically to the **embed use case**: a developer on a host website drops in a single `<script>` tag (or a minimal HTML snippet), and a fully functional form renders — either inline, as a popup, or full-page — with no dependency on any third-party SaaS platform.

The plan is grounded in a full audit of Tally.so's publicly documented features, a scored comparison of candidate technology stacks, a recommended architecture, a phased implementation roadmap, a proposed project directory structure, and a precise embedding interface specification.

---

## 1. Tally.so Feature Audit

### 1.1 Form Field Types (Input Blocks)

Tally.so organises all fields as "blocks" dropped into a document-like editor. The following field types are documented and must be replicated in the custom solution:

**Text and Number**
- **Short answer** — single-line free text, used for name, address, short responses.
- **Long answer** — multi-line text area for open-ended responses.
- **Number** — numeric-only input with optional formatting rules.

**Contact Information**
- **Email** — validated email address field.
- **Phone number** — formatted phone number field.
- **Link / URL** — field that accepts and validates a URL.
- **Electronic signature** — canvas-based drawn signature capture.

**Choice Fields**
- **Multiple choice** — radio-button-style list; configurable for single or multi-select.
- **Dropdown** — single-select dropdown with optional placeholder and default value.
- **Checkbox** — multiple-selection checkbox list; min/max selection configurable.
- **Multi-select** — multi-select from a dropdown-style menu (tag selector pattern).
- **Matrix / Likert** — grid of rows (statements) × columns (response options).
- **Ranking** — drag-to-reorder list for ordering preferences.

**Date and Time**
- **Date picker** — calendar date selector; supports date ranges and disabled specific dates.
- **Time picker** — 24-hour clock time selector.

**Rating and Scale**
- **Star rating** — visual star selector; configurable number of stars.
- **Linear scale** — numeric scale slider; configurable min, max, and step labels.
- **NPS (Net Promoter Score)** — 0–10 scale with Promoter/Passive/Detractor buckets.
- **CSAT (Customer Satisfaction)** — 1–5 emoji/icon scale.

**File Upload**
- **File upload** — single or multiple file attachment; configurable allowed file types.

**Hidden Fields**
- Non-visible fields pre-populated via URL query parameters; used for tracking, pre-fill, and personalisation (e.g., UTM parameters, pre-known email).

**Calculated Fields**
- Variables computed from other field values using expressions; used for score tallying, discount calculation, lead qualification, and conditional branching targets.

**Payment**
- Stripe-integrated payment block; not in scope for Phase 1 of the custom solution.

### 1.2 Content and Layout Blocks (Non-Input)

- **Text / Heading / Divider** — rich-text content within the form for instructions, section headers, etc.
- **Image** — embed an image (upload, URL, or Unsplash).
- **Embed** — inline content such as YouTube, Calendly, Google Maps, PDFs.
- **Columns** — two-column side-by-side layout for blocks.
- **Thank You page** — post-submission page; supports custom text, headings, links, media.

### 1.3 Conditional Logic

Tally's conditional logic engine supports six action types triggered by IF/THEN rules:

1. **Jump to page** — skip to a specific page based on conditions.
2. **Calculate a value** — assign a computed value to a calculated field.
3. **Make answer required** — dynamically enforce a field's required status.
4. **Show or hide blocks** — reveal or conceal any question, page, or content block.
5. **Hide button to disable completion** — conditionally prevent form submission.
6. **Redirect to URL** — send the respondent to an external URL after submission.

Conditions support AND/OR logic, nested condition groups, and any input field as a trigger. Conditions can reference input blocks, hidden fields, and calculated fields. There is no limit on the number of conditions.

### 1.4 Multi-Step / Multi-Page Forms

Forms can be divided into pages. Each page functions as a separate step. Navigation uses "Next" and "Back" buttons, and a **progress indicator** can be displayed. Pages can be skipped entirely via conditional logic (Jump to page). Progress is preserved if the respondent returns.

### 1.5 Answer Piping

Any previously answered field can be referenced by its `@fieldName` mention in subsequent question text, hint text, calculated fields, or the Thank You page. This creates a personalised, dynamic form experience (e.g., "Thanks, @FirstName! Your score is @Score.").

### 1.6 Validation

Tally applies the following validation rules:
- Required fields: the form cannot advance or submit if a required field is empty.
- Email format validation on email fields.
- Phone format validation on phone fields.
- URL format validation on link fields.
- Number-only constraint on number fields.
- File type restriction on file upload fields.
- Date and time format enforcement.
- Min/max selection on checkbox and multi-select.

### 1.7 Submission Handling

- **Responses stored** server-side in Tally's own database.
- **Partial submissions** — configurable; captures data even if the form is not completed.
- **Duplicate submission prevention** — configurable; prevents the same respondent from submitting more than once.
- **Password-protected forms** — access gate before the form renders.
- **Data retention control** — ability to configure how long submission data is retained.

### 1.8 Notifications

- **Self email notification** — notifies the form owner on each submission; fully templated with dynamic field insertion via `@mentions`.
- **Respondent email notification** — sends a confirmation to the respondent's email address after submission.
- **Dynamic routing** — calculated fields can compute the recipient email address, enabling routing to different teams (sales, support, billing) based on form answers.
- **Webhook delivery** — POST request with a JSON payload to any HTTP(S) endpoint on each submission. Supports signing secret (SHA256), custom HTTP headers, and a five-attempt retry schedule (5 min → 30 min → 1 hr → 6 hr → 1 day).

### 1.9 Integrations

Native direct integrations: Notion, Google Sheets, Airtable, Slack, Coda.  
Automation platform integrations: Zapier, Make, Integrately, Pipedream, ApiX-Drive.  
Developer integrations: REST API, Webhooks, MCP server.

### 1.10 Theming and Customisation

- **Brand colours** — primary colour, background colour, button colour.
- **Fonts** — from a curated library.
- **Logo and cover image** — displayed at the top of the form.
- **Custom CSS** — full stylesheet injection for complete design control (Pro feature).
- **Advanced form layout** — column layout, text formatting, dividers.
- **Remove branding** — remove "Powered by Tally" attribution (Pro feature).

### 1.11 Embedding Methods

Tally provides three embed types for website integration:

1. **Standard embed** — an `<iframe>` injected into the page at a specific element. Options: fixed height, dynamic height, hide title, left-align, transparent background.
2. **Popup embed** — a floating modal triggered by a button click or JavaScript API call. Options: overlay background, trigger button text, auto-open timing.
3. **Full-page embed** — the form fills the entire viewport; used for dedicated landing pages.

All embed types are delivered via either an `<iframe>` snippet or a JavaScript snippet. The JavaScript approach also forwards the host page's URL query parameters to the form via hidden fields automatically.

Developer resources enable programmatic open/close of the popup and dynamic loading of embeds.

---

## 2. Technology Stack Evaluation

Three candidate approaches were evaluated against six criteria. Each criterion is scored 1 (poor) to 5 (excellent).

### Evaluation Criteria

| Criterion | Weight | Rationale |
|---|---|---|
| Embeddability (single script tag / iframe) | 25% | Core requirement: must drop into any host site without framework installation |
| Dependency footprint | 20% | Host sites vary; a large bundle is a barrier to adoption |
| Browser compatibility | 15% | Must work on modern browsers without polyfill complexity |
| Maintainability | 15% | Code must be updatable by a small team |
| Development speed | 15% | Time to deliver a working solution matters |
| Backend submission handling | 10% | Must integrate with a backend endpoint |

---

### Candidate A — Pure HTML5 + Vanilla JavaScript + CSS

**Overview:** No build toolchain required. The embed widget is a self-contained `.js` bundle that injects HTML into the host DOM, written entirely in hand-crafted JavaScript.

**Scores:**

| Criterion | Score | Notes |
|---|---|---|
| Embeddability | 5 | Trivial: one `<script>` tag, zero peer dependencies |
| Dependency footprint | 5 | Bundle can be under 15 KB gzipped; no framework overhead |
| Browser compatibility | 5 | Works in any ES5+ browser; trivially polyfillable |
| Maintainability | 2 | Complex logic (conditional engine, multi-step, dynamic rendering) quickly becomes hard to maintain without structure |
| Development speed | 2 | Must build all abstractions from scratch: reactivity, templating, component lifecycle |
| Backend submission handling | 4 | Straightforward `fetch` POST; no special requirements |
| **Weighted total** | **3.55** | |

**Verdict:** Optimal for a trivially simple contact form. Unsuitable for a Tally.so replacement with conditional logic, dynamic rendering, and multiple field types, as the lack of a reactivity system means all DOM diffing and state management must be written manually, producing fragile, difficult-to-test code.

---

### Candidate B — Alpine.js + Tailwind CSS (Lightweight Framework)

**Overview:** Alpine.js provides declarative reactivity via HTML attributes (`x-data`, `x-show`, `x-bind`, `x-on`). It adds approximately 15 KB to the bundle. Tailwind CSS handles styling via utility classes. A build step (Vite or Rollup) bundles everything into a single IIFE or ESM file for embedding.

**Scores:**

| Criterion | Score | Notes |
|---|---|---|
| Embeddability | 5 | Single bundled file; Alpine initialises from a single `Alpine.start()` call; does not pollute the host page's global scope when correctly isolated |
| Dependency footprint | 5 | Alpine.js ~15 KB gzip; Tailwind (purged) ~5–20 KB; total well under 50 KB |
| Browser compatibility | 4 | Supports all modern browsers; IE 11 requires minor polyfills |
| Maintainability | 3 | Works well for moderate complexity; large conditional logic trees become unwieldy in `x-data` objects without a deliberate component architecture |
| Development speed | 4 | Rapid for interactive HTML; no virtual DOM abstraction to learn; familiar to most front-end developers |
| Backend submission handling | 4 | Standard fetch; no special requirements |
| **Weighted total** | **4.25** | |

**Verdict:** Excellent for a solution with a known, fixed set of field types and bounded complexity. The constraint is that Alpine does not support file-based component modules natively, making large codebases harder to organise without additional patterns.

---

### Candidate C — Vue 3 (Composition API) + Vite Build

**Overview:** Vue 3 with the Composition API delivers a mature component model, fine-grained reactivity, slot-based composition, and single-file components (`.vue`). Vite bundles the entire embed widget as a single IIFE or Web Component. The runtime (Vue 3 core without the compiler, i.e., the runtime-only build) adds approximately 22 KB gzipped.

**Scores:**

| Criterion | Score | Notes |
|---|---|---|
| Embeddability | 5 | Vite's `lib` mode produces a self-contained IIFE file loadable via one `<script>` tag; `defineCustomElement` enables Web Component mode |
| Dependency footprint | 4 | ~22–35 KB gzip with Vue runtime; acceptable but higher than Vanilla or Alpine |
| Browser compatibility | 4 | All modern browsers; IE requires polyfills (not a realistic concern today) |
| Maintainability | 5 | Single-file components, clear lifecycle, TypeScript support, well-known pattern for teams; conditional logic engine maps cleanly to composables |
| Development speed | 4 | Strong CLI, excellent DevTools, rich ecosystem of form-related utilities; component patterns well established |
| Backend submission handling | 4 | Standard fetch; Axios available in ecosystem |
| **Weighted total** | **4.50** | |

**Verdict:** The highest overall score. Vue 3 provides the right balance of maintainable component architecture and a small enough runtime for single-file embed delivery. Its reactivity system maps directly to form state management.

---

### Candidate D — React + Vite Build (Full Framework, for comparison)

**Overview:** React with a Vite build for a library-mode IIFE bundle.

**Scores:**

| Criterion | Score | Notes |
|---|---|---|
| Embeddability | 4 | Achievable via Vite lib mode; however React's synthetic event system and concurrent features add complexity to isolation in a host page |
| Dependency footprint | 3 | React + ReactDOM gzip ~42–45 KB; largest of the four options |
| Browser compatibility | 4 | Modern browsers well supported |
| Maintainability | 4 | Industry standard; large talent pool |
| Development speed | 3 | More boilerplate; JSX transpilation, hooks mental model; slower for form-centric UIs compared to Vue's template syntax |
| Backend submission handling | 4 | Standard fetch |
| **Weighted total** | **3.65** | |

**Verdict:** React is better suited for full applications than for embeddable widgets. Its larger footprint and additional isolation concerns in a host page context make it inferior to Vue 3 for this use case.

---

## 3. Recommended Stack and Justification

**Recommended stack: Vue 3 (Composition API) + Vite + TypeScript + Tailwind CSS**

**Backend: Node.js (Express or Fastify) + PostgreSQL**

### Rationale

Vue 3 scores highest across all weighted criteria when the embedding use case is the primary constraint. The specific reasons it outperforms the alternatives for this project are:

**Against Vanilla JavaScript (Candidate A):** A form with 15+ field types, conditional logic, multi-step navigation, and answer piping requires a reactivity system. Building this without one means writing a bespoke state-management and DOM-diffing layer — effectively reinventing Vue in an unmaintainable way. Every hour spent maintaining hand-rolled reactivity is an hour not spent on features.

**Against Alpine.js (Candidate B):** Alpine is optimal for sprinkling interactivity onto server-rendered HTML. It is not designed for building a standalone embeddable widget with a complex internal component tree. The lack of a file-based component model means field type implementations (matrix, ranking, file upload, signature) all live in the same data object or HTML file, defeating modularity. Alpine also has no equivalent to Vue's `defineCustomElement`, which is the cleanest path to a Web Component embed without global scope contamination.

**Against React (Candidate D):** React carries a ~20 KB heavier baseline than Vue 3, a more complex isolation model in host pages (React's synthetic event system can interfere with host-page events), and is significantly more verbose for template-heavy UI work like form fields. Vue's template syntax is faster to write and read for presentational components, which form fields fundamentally are.

**Why Vue 3 specifically:**
- `defineCustomElement` allows the entire form to be packaged as a native Web Component (`<ajj-form>`), providing the strongest possible isolation from the host page's styles and scripts via the Shadow DOM.
- The Composition API maps cleanly to the form engine's concerns: `useFormState`, `useConditionalLogic`, `useValidation`, `useMultiStep` are natural, testable composables.
- Vite's `lib` mode produces an optimised IIFE with tree-shaking enabled; the final bundle for the embed runtime can be kept under 60 KB gzipped.
- TypeScript support is first-class, enabling typed field definitions and a maintainable conditional logic schema.
- The Vue ecosystem includes well-maintained utilities for form validation (VeeValidate), which can be incorporated if needed.

---

## 4. Architecture Plan

### 4.1 System Overview

The solution consists of two independently deployable layers:

1. **Embed Runtime** — A compiled Vue 3 Web Component bundle distributed as a single JavaScript file from a CDN or self-hosted static server. Responsible for rendering the form, managing state, executing client-side validation, and submitting data.

2. **Backend API** — A Node.js REST API responsible for serving form definitions (JSON schema), receiving submissions, storing responses, sending notifications, and dispatching webhooks.

```
Host Website
  └── <script src="https://forms.ajj.com/embed.js">
  └── <ajj-form form-id="abc123" mode="inline">
          │
          ▼
      [Embed Runtime - Vue 3 Web Component]
          │  Fetch form schema (GET /api/forms/:id)
          │  Submit responses (POST /api/submissions)
          ▼
      [Backend API - Node.js / Express]
          │
          ├── [PostgreSQL - Form definitions + Submissions]
          ├── [Email service - Nodemailer / SendGrid]
          ├── [Webhook dispatcher]
          └── [File storage - S3-compatible / local]
```

### 4.2 Frontend Form Runtime

**Form Schema:** The backend serves each form as a JSON document defining its pages, fields, conditional logic rules, theme settings, and submission behaviour. The embed runtime fetches this schema on initialisation and renders accordingly — no form definition is hard-coded in the embed script.

**Field Component Architecture:** Each field type is an encapsulated Vue component. Components are registered dynamically from a component registry keyed by field type string (e.g., `"SHORT_ANSWER"`, `"MULTIPLE_CHOICE"`, `"DATE"`). Adding a new field type requires only implementing one new component and registering it — the core rendering loop requires no modification.

**Form State Management:** A Composition API composable (`useFormState`) maintains a reactive map of `fieldId → value`. All field components read from and write to this shared state via `inject/provide`. No global store (Pinia or Vuex) is required for a single-form embed; a scoped provide/inject pattern keeps state isolated per form instance.

**Multi-Step Navigation:** A `useMultiStep` composable manages the array of page definitions. It exposes `currentPageIndex`, `totalPages`, `canGoBack`, `canGoForward`, `goToPage(n)`, `goNext()`, and `goBack()`. The progress indicator is computed from `currentPageIndex / totalPages`. Pages are rendered conditionally based on `currentPageIndex` — only the active page's fields are rendered into the DOM.

### 4.3 Client-Side Validation Engine

Validation is a `useValidation` composable that evaluates each field's configuration against the current state map. Validation runs:
- On field blur (immediate feedback).
- On "Next" button click before page advance.
- On "Submit" button click before API call.

Each field definition in the schema carries a `validationRules` array (e.g., `["required", "email", "minLength:5"]`). The engine iterates this array and returns a map of `fieldId → errorMessage`. Error messages are injected into each field component via the provide/inject pattern.

### 4.4 Conditional Logic Engine

A `useConditionalLogic` composable evaluates all conditional logic blocks on every state change. It receives the full logic rule set from the form schema and the current `formState` map.

Each rule has the shape:
```
{ when: "all"|"any", conditions: [...], action: ActionType, target: ... }
```

The engine produces derived state on each evaluation:
- `hiddenBlocks`: a Set of fieldIds that should not be rendered.
- `requiredOverrides`: a Map of fieldId → boolean.
- `jumpTarget`: a page index override for Next navigation.
- `calculatedValues`: a Map of fieldId → computed value.

The main form render loop reads from this derived state on each reactive update. Because Vue 3's reactivity is dependency-tracked, only the components that depend on changed derived state re-render.

### 4.5 Embedding and Invocation Model

The embed is packaged as a **Web Component** using Vue 3's `defineCustomElement`. This approach provides:
- **Shadow DOM isolation**: the form's styles are encapsulated and cannot be overridden by the host page's CSS, nor can the form's internal styles leak out.
- **Zero global pollution**: no `window` properties, no global event listeners outside the component's own lifecycle.
- **Standard HTML interface**: the host developer uses a standard HTML element API (`<ajj-form>`) to configure and control the form.

Three invocation modes are supported:

**Mode 1 — Inline (Standard Embed):**
The form renders directly in the document flow inside the `<ajj-form>` element.

**Mode 2 — Popup:**
A floating overlay modal is triggered programmatically or by a host-page button click. The `<ajj-form>` element is inserted into the document but remains hidden until `window.AJJForms.open('formId')` is called.

**Mode 3 — Full Page:**
The form fills the entire viewport. Used for dedicated form landing pages.

### 4.6 Backend API

The API is a stateless Node.js service (Express or Fastify) with a PostgreSQL database. All form definitions and submission data are stored in PostgreSQL.

**Core API endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/forms/:formId` | Fetch form schema (public, rate-limited) |
| `POST` | `/api/submissions` | Receive and persist a form submission |
| `GET` | `/api/submissions/:formId` | List submissions (authenticated) |
| `POST` | `/api/forms` | Create a form (authenticated) |
| `PUT` | `/api/forms/:formId` | Update a form (authenticated) |

**Submission Processing Pipeline (per submission):**
1. Validate CSRF token / Origin header.
2. Sanitise all string inputs (strip script tags, HTML injection).
3. Re-validate required fields and data types server-side (client-side validation is not trusted).
4. Persist submission record to PostgreSQL.
5. Handle file uploads to S3-compatible storage if present.
6. Enqueue email notification job (asynchronous, via a job queue).
7. Enqueue webhook dispatch job (asynchronous, with retry logic).
8. Return `201 Created` with a submission ID.

**File Storage:** File upload fields store binary data in an S3-compatible bucket (AWS S3, MinIO, Cloudflare R2). The backend stores only the object key; a signed URL is generated on demand for retrieval.

### 4.7 Security Considerations

**CSRF Protection:**
- For all submissions from the embed widget, the backend validates the `Origin` or `Referer` header against an allowlist of authorised host domains configured per form.
- A CSRF double-submit cookie pattern is used for form submission endpoints as a secondary defence layer.

**Input Sanitisation:**
- All string inputs are sanitised server-side using a library such as `DOMPurify` (server-side) or `sanitize-html`. HTML tags and script injection are stripped. Parameterised queries are used for all database operations (no string interpolation in SQL).

**Rate Limiting:**
- Submission endpoint is rate-limited per IP address (e.g., 5 submissions per IP per minute per formId) using a Redis-backed rate limiter (or in-memory with a sliding window for single-instance deployments).

**CAPTCHA:**
- Google reCAPTCHA v3 (invisible) or hCaptcha is integrated as an optional field type. When enabled, the backend verifies the token before persisting the submission.

**HTTPS:**
- All API communication and the embed script are served over HTTPS. Mixed content (HTTP form in HTTPS host page) is blocked by browsers and must be avoided.

**Content Security Policy:**
- The embed script is designed to work within typical CSP configurations. It does not use `eval`, `innerHTML` with untrusted content, or inline event handlers.

**Authentication (Admin):**
- The form management API is protected by JWT bearer tokens. The admin UI (out of scope for Phase 1) will use short-lived access tokens and refresh tokens.

---

## 5. Implementation Roadmap

### Phase 1 — Foundation and Core Field Rendering
**Goal:** A working embeddable form that renders fields from a JSON schema and submits data to the backend.

**Deliverables:**
- Project scaffolding (Vite + Vue 3 + TypeScript + Tailwind).
- Web Component embed entry point (`defineCustomElement`).
- Field components: Short Answer, Long Answer, Email, Phone, Number, Multiple Choice, Dropdown, Checkbox, Date, Time.
- Form state management composable.
- Client-side validation for all Phase 1 field types.
- Multi-step navigation with progress indicator.
- Backend API: form schema endpoint, submission endpoint, PostgreSQL schema.
- Server-side validation and input sanitisation.
- Basic self email notification on submission.
- HTTPS-only, CORS and Origin validation.

---

### Phase 2 — Conditional Logic and Advanced Fields
**Goal:** The form adapts dynamically based on user responses.

**Deliverables:**
- Conditional logic engine composable.
- Support for all six action types: Jump, Calculate, Require, Show/Hide, Hide button, Redirect.
- AND/OR condition groups.
- Additional field types: Multi-select, Linear scale, Star rating, NPS, CSAT, Ranking, Matrix/Likert, File upload, Hidden fields, Calculated fields.
- Answer piping (@ mention interpolation in question text and Thank You page).
- Custom Thank You page (text, links, redirect on completion).
- File upload backend: S3-compatible storage, signed URL retrieval.
- Webhook dispatcher with retry logic.

---

### Phase 3 — Theming, Embedding Modes, and Notifications
**Goal:** The form is fully branded, embeds correctly in all three modes, and sends rich notifications.

**Deliverables:**
- Full theming system: colour variables, font selection, logo, cover image.
- Custom CSS injection capability (per-form stylesheet from schema).
- Popup embed mode (modal overlay with JS API open/close).
- Full-page embed mode.
- Dynamic height (postMessage from iframe to host page).
- Host page URL query parameter forwarding to hidden fields.
- Respondent email notification.
- Dynamic email notification routing via calculated fields.
- reCAPTCHA integration (optional per form).

---

### Phase 4 — Security Hardening, Testing, and Documentation
**Goal:** Production-ready, secure, and documented.

**Deliverables:**
- Rate limiting (Redis-backed, per IP/per form).
- CSRF double-submit cookie implementation.
- Partial submission capture (save progress on page advance).
- Duplicate submission prevention (cookie + server-side token).
- Password-protected form gate.
- Unit tests for: conditional logic engine, validation engine, all field components.
- Integration tests for: submission API, webhook dispatch, email dispatch.
- End-to-end tests (Playwright) for: inline embed, popup embed, multi-step navigation, conditional logic.
- Embedding documentation and developer guide.
- Deployment scripts (Docker Compose: API + PostgreSQL + Redis).

---

## 6. File and Folder Structure

```
ajj-tally/
│
├── embed/                          # Vue 3 embed widget (Vite library build)
│   ├── src/
│   │   ├── main.ts                 # defineCustomElement entry point
│   │   ├── FormWidget.vue          # Root Web Component
│   │   ├── components/
│   │   │   ├── fields/             # One .vue file per field type
│   │   │   │   ├── FieldShortAnswer.vue
│   │   │   │   ├── FieldLongAnswer.vue
│   │   │   │   ├── FieldEmail.vue
│   │   │   │   ├── FieldPhone.vue
│   │   │   │   ├── FieldNumber.vue
│   │   │   │   ├── FieldMultipleChoice.vue
│   │   │   │   ├── FieldDropdown.vue
│   │   │   │   ├── FieldCheckbox.vue
│   │   │   │   ├── FieldMultiSelect.vue
│   │   │   │   ├── FieldDate.vue
│   │   │   │   ├── FieldTime.vue
│   │   │   │   ├── FieldRating.vue
│   │   │   │   ├── FieldLinearScale.vue
│   │   │   │   ├── FieldNPS.vue
│   │   │   │   ├── FieldCSAT.vue
│   │   │   │   ├── FieldRanking.vue
│   │   │   │   ├── FieldMatrix.vue
│   │   │   │   ├── FieldFileUpload.vue
│   │   │   │   ├── FieldSignature.vue
│   │   │   │   └── FieldHidden.vue
│   │   │   ├── layout/             # Structural components
│   │   │   │   ├── FormPage.vue
│   │   │   │   ├── FormProgress.vue
│   │   │   │   ├── FormNavigation.vue
│   │   │   │   └── ThankYouPage.vue
│   │   │   └── ui/                 # Generic UI primitives
│   │   │       ├── BaseButton.vue
│   │   │       ├── BaseInput.vue
│   │   │       └── ErrorMessage.vue
│   │   ├── composables/
│   │   │   ├── useFormState.ts     # Reactive state map for all field values
│   │   │   ├── useMultiStep.ts     # Page navigation logic
│   │   │   ├── useValidation.ts    # Client-side validation engine
│   │   │   ├── useConditionalLogic.ts  # IF/THEN rule evaluator
│   │   │   ├── useAnswerPiping.ts  # @ mention interpolation
│   │   │   └── useSubmission.ts    # Form submit, retry, error handling
│   │   ├── types/
│   │   │   ├── schema.ts           # Form schema TypeScript interfaces
│   │   │   ├── fields.ts           # Field type enums and configs
│   │   │   └── logic.ts            # Conditional logic rule types
│   │   └── utils/
│   │       ├── fieldRegistry.ts    # Map of fieldType → component
│   │       ├── interpolate.ts      # Answer piping string interpolation
│   │       └── queryParams.ts      # Host page URL param forwarding
│   ├── vite.config.ts              # Lib mode build: outputs embed.iife.js
│   ├── tsconfig.json
│   └── package.json
│
├── api/                            # Node.js backend API
│   ├── src/
│   │   ├── app.ts                  # Express/Fastify app setup
│   │   ├── routes/
│   │   │   ├── forms.ts            # GET /api/forms/:id, POST/PUT /api/forms
│   │   │   └── submissions.ts      # POST /api/submissions, GET /api/submissions/:formId
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT bearer token validation
│   │   │   ├── rateLimit.ts        # Per-IP, per-form rate limiting
│   │   │   ├── csrf.ts             # CSRF double-submit cookie
│   │   │   └── sanitise.ts         # Input sanitisation
│   │   ├── services/
│   │   │   ├── formService.ts      # Form CRUD operations
│   │   │   ├── submissionService.ts # Submission persistence and processing
│   │   │   ├── emailService.ts     # Nodemailer / SendGrid integration
│   │   │   ├── webhookService.ts   # Webhook dispatch with retry queue
│   │   │   └── storageService.ts   # S3-compatible file upload / signed URLs
│   │   ├── db/
│   │   │   ├── client.ts           # PostgreSQL connection (pg / Drizzle ORM)
│   │   │   └── migrations/         # SQL migration files
│   │   └── types/
│   │       └── index.ts
│   ├── tsconfig.json
│   └── package.json
│
├── Docs/
│   ├── Architecture.md             # Mermaid architecture diagram
│   ├── Quickstart.md               # Developer quickstart guide
│   ├── EmbeddingGuide.md           # Embedding interface specification
│   └── SchemaReference.md          # Form JSON schema documentation
│
├── scripts/
│   ├── start.sh                    # Launch application in detached mode
│   └── stop.sh                     # Graceful shutdown
│
├── docker-compose.yml              # API + PostgreSQL + Redis
├── .env.example                    # Environment variable template
├── .gitignore
└── README.md
```

---

## 7. Embedding Interface Specification

### 7.1 One-Time Script Inclusion

A single `<script>` tag is added once to the host website's HTML (ideally in the `<head>` or before `</body>`):

```html
<script src="https://forms.ajj.com/embed.js" defer></script>
```

This script registers the `<ajj-form>` custom element globally in the browser. It must be loaded only once per page, regardless of how many forms are embedded.

---

### 7.2 Inline Embed (Standard)

The form renders in-place in the document flow wherever the `<ajj-form>` element is placed:

```html
<ajj-form
  form-id="abc123"
  mode="inline"
  height="600"
  dynamic-height="true"
  hide-title="false"
  align="center"
  transparent-bg="false"
></ajj-form>
```

**Attribute reference:**

| Attribute | Type | Default | Description |
|---|---|---|---|
| `form-id` | string | — | **Required.** The unique identifier of the form to render. |
| `mode` | `"inline"` \| `"popup"` \| `"fullpage"` | `"inline"` | Rendering mode. |
| `height` | number (px) | `500` | Fixed height in pixels when `dynamic-height` is false. |
| `dynamic-height` | boolean | `true` | Automatically adjusts height to form content; eliminates scroll bars. |
| `hide-title` | boolean | `false` | Suppresses the form title at the top of the embed. |
| `align` | `"center"` \| `"left"` | `"center"` | Horizontal alignment of form content. |
| `transparent-bg` | boolean | `false` | Removes the white background so the form inherits the host page background. |
| `prefill` | JSON string | — | Key-value pairs to pre-populate hidden fields or visible fields. |
| `language` | string | `"en"` | ISO language code for UI strings. |

---

### 7.3 Popup Embed

The form opens as a floating overlay modal. The host page renders a trigger button or calls the JavaScript API:

**Option A — Declarative trigger button:**
```html
<button data-ajj-form="abc123" data-ajj-mode="popup">
  Contact Us
</button>
```
Any element with the `data-ajj-form` attribute automatically becomes a click trigger for the popup.

**Option B — Programmatic JavaScript API:**
```html
<script>
  // Open the popup
  window.AJJForms.open('abc123');

  // Close the popup
  window.AJJForms.close('abc123');

  // Listen for submission events
  window.AJJForms.on('submit', 'abc123', function(data) {
    console.log('Form submitted', data);
  });
</script>
```

**Popup-specific attributes on `<ajj-form>`:**

| Attribute | Type | Default | Description |
|---|---|---|---|
| `mode` | `"popup"` | — | Sets popup mode. |
| `overlay-color` | string | `"rgba(0,0,0,0.5)"` | CSS colour for the overlay background. |
| `auto-open` | number | — | Delay in milliseconds before the popup opens automatically (e.g., `3000` for 3 seconds). |
| `close-on-submit` | boolean | `true` | Automatically closes the popup on successful submission. |

---

### 7.4 Full-Page Embed

```html
<!-- Full page: place as the only content in the <body> -->
<ajj-form
  form-id="abc123"
  mode="fullpage"
  transparent-bg="true"
></ajj-form>
```

---

### 7.5 Pre-filling Fields via URL Parameters

Any URL query parameter matching a field's `name` or a hidden field's key is automatically forwarded to the form. No special configuration is required:

```
https://example.com/contact?email=alice@example.com&ref=newsletter
```
If the form has a hidden field with key `ref` and a field named `email`, both will be pre-filled.

Additional programmatic pre-fill via the `prefill` attribute:

```html
<ajj-form
  form-id="abc123"
  prefill='{"email": "alice@example.com", "source": "homepage"}'
></ajj-form>
```

---

### 7.6 JavaScript Events API

The embed exposes a small event subscription API for host page integration:

| Event | Payload | Description |
|---|---|---|
| `ready` | `{ formId }` | Form schema loaded and rendered. |
| `page-change` | `{ formId, pageIndex, totalPages }` | Respondent navigated to a new page. |
| `submit` | `{ formId, submissionId, data }` | Form submitted successfully. |
| `error` | `{ formId, message }` | A submission error occurred. |
| `close` | `{ formId }` | Popup was closed without submission. |

Usage:

```javascript
window.AJJForms.on('submit', 'abc123', function(payload) {
  // Track submission in analytics
  gtag('event', 'form_submit', { form_id: payload.formId });
});
```

---

### 7.7 Configuration Summary Table

| Feature | Attribute / Method | Notes |
|---|---|---|
| Form identity | `form-id` attribute | Required on all embeds |
| Render mode | `mode` attribute | `inline`, `popup`, `fullpage` |
| Dynamic resize | `dynamic-height` attribute | Recommended for inline |
| Hide form title | `hide-title` attribute | |
| Transparent background | `transparent-bg` attribute | |
| Field pre-fill | `prefill` attribute or URL params | URL params auto-forwarded |
| Open popup | `AJJForms.open(id)` | JS API |
| Close popup | `AJJForms.close(id)` | JS API |
| Event listening | `AJJForms.on(event, id, fn)` | JS API |
| Trigger button | `data-ajj-form` attribute | No JS required |

---

## Sub-Tasks for Implementation

### Sub-Task 1 — Project Scaffolding
**Intent:** Establish the monorepo structure, toolchain, and CI baseline.  
**Expected Outcomes:** Vite + Vue 3 + TypeScript embed project and Node.js API project both boot locally; Docker Compose starts API + PostgreSQL + Redis; `.env.example` in place.  
**Todo List:**
1. Initialise monorepo with `embed/` and `api/` workspaces.
2. Configure Vite lib mode in `embed/vite.config.ts` to output `embed.iife.js`.
3. Configure Express/Fastify API with TypeScript in `api/`.
4. Create Docker Compose with `api`, `postgres`, `redis` services.
5. Create `.env.example`, `.gitignore`, `README.md`.
6. Create `scripts/start.sh` and `scripts/stop.sh` with execute permissions.  
**Status:** [ ] pending

---

### Sub-Task 2 — Core Field Components (Phase 1 Fields)
**Intent:** Implement the ten foundational field type components and the field registry.  
**Expected Outcomes:** All Phase 1 field types render correctly; values write to `useFormState`; field components are unit-tested.  
**Status:** [ ] pending

---

### Sub-Task 3 — Form State, Validation, and Multi-Step Engine
**Intent:** Implement `useFormState`, `useValidation`, and `useMultiStep` composables.  
**Expected Outcomes:** Multi-step navigation advances and regresses correctly; required field validation blocks page advance; error messages render per field.  
**Status:** [ ] pending

---

### Sub-Task 4 — Backend API: Form Schema + Submission Endpoints
**Intent:** Implement GET `/api/forms/:id` and POST `/api/submissions` with PostgreSQL persistence.  
**Expected Outcomes:** Form schema is served correctly; submissions are persisted with sanitised inputs; server-side validation rejects invalid payloads.  
**Status:** [ ] pending

---

### Sub-Task 5 — Conditional Logic Engine
**Intent:** Implement `useConditionalLogic` composable with all six action types.  
**Expected Outcomes:** Show/hide, Jump, Calculate, Require, Hide-button, and Redirect actions all function correctly across multi-step and single-step forms; unit-tested with edge cases.  
**Status:** [ ] pending

---

### Sub-Task 6 — Advanced Field Components (Phase 2 Fields)
**Intent:** Implement remaining field types: Multi-select, Linear scale, NPS, CSAT, Star rating, Ranking, Matrix, File upload, Electronic signature, Hidden fields, Calculated fields.  
**Expected Outcomes:** All field types render and interact with the conditional logic engine; file upload integrates with S3-compatible storage backend.  
**Status:** [ ] pending

---

### Sub-Task 7 — Theming, Embed Modes, and Notification Services
**Intent:** Implement theming CSS variables, popup and full-page embed modes, email notifications, and webhook dispatch.  
**Expected Outcomes:** Forms can be themed per-schema; popup opens/closes programmatically; email and webhook fire reliably on submission.  
**Status:** [ ] pending

---

### Sub-Task 8 — Security Hardening, Testing, and Documentation
**Intent:** Implement all security layers; write unit, integration, and E2E tests; produce developer documentation.  
**Expected Outcomes:** Rate limiting, CSRF, and CAPTCHA in place; all tests pass; `Docs/EmbeddingGuide.md` and `Docs/Architecture.md` complete.  
**Status:** [ ] pending
