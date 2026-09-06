# Implementation Roadmap — AJJ Custom Form Solution

This document defines the phased development plan for the custom form solution. Each phase has a clear goal, a set of deliverables, and an ordered list of sub-tasks.

---

## Phase 1 — Foundation and Core Field Rendering

**Goal:** A working embeddable form that renders fields from a JSON schema and submits data to the backend.

### Sub-Task 1.1 — Project Scaffolding

**Intent:** Establish the monorepo, toolchain, Docker infrastructure, and environment configuration baseline. Everything required to start building runs locally from this sub-task.

**Deliverables:**
- `embed/` workspace: Vite + Vue 3 + TypeScript configured; `vite.config.ts` in library mode outputting `embed.iife.js`.
- `api/` workspace: Node.js (Express or Fastify) + TypeScript configured.
- `docker-compose.yml`: `api`, `postgres`, `redis` services.
- `.env.example` with all required variables documented.
- `.gitignore` filtering `.env`, `node_modules`, `output/`, `input/`, `_*/`, `AGENTS.md`, `.bob/mcp.json`.
- `scripts/start.sh` and `scripts/stop.sh` with execute permissions (`chmod +x`).
- `README.md` skeleton.

**Todo:**
1. `npm create vite@latest embed -- --template vue-ts` in `embed/`.
2. Configure `vite.config.ts` for lib mode (IIFE format, entry `src/main.ts`).
3. `npm init` + Express/Fastify + TypeScript in `api/`.
4. Write `docker-compose.yml` with health checks on postgres and redis.
5. Create `.env.example` with all variable names and placeholder values.
6. Create `.gitignore`.
7. Write `scripts/start.sh` and `scripts/stop.sh`.

---

### Sub-Task 1.2 — Core Field Components

**Intent:** Implement the ten foundational field type Vue components and the dynamic field registry.

**Field types in scope:**
Short Answer, Long Answer, Email, Phone, Number, Multiple Choice, Dropdown, Checkbox, Date, Time.

**Deliverables:**
- One `.vue` single-file component per field type in `embed/src/components/fields/`.
- `fieldRegistry.ts`: `Map<FieldTypeEnum, Component>` for dynamic resolution.
- Unit tests for each field component (value writing, slot rendering, attribute passthrough).

**Todo:**
1. Define `FieldTypeEnum` and `FieldDefinition` TypeScript interface in `embed/src/types/fields.ts`.
2. Implement `FieldShortAnswer.vue` through `FieldTime.vue` (ten components).
3. Implement `fieldRegistry.ts`.
4. Write unit tests with Vitest + Vue Test Utils for each component.

---

### Sub-Task 1.3 — Form State, Validation, and Multi-Step Engine

**Intent:** Implement the three core runtime composables.

**Deliverables:**
- `useFormState.ts`: reactive `Map<fieldId, value>` with provide/inject.
- `useValidation.ts`: validates `validationRules[]` per field; returns `Map<fieldId, errorMessage>`.
- `useMultiStep.ts`: page navigation with `goNext()`, `goBack()`, `goToPage(n)`, progress percentage.
- `FormProgress.vue`, `FormNavigation.vue`, `FormPage.vue` layout components.
- Unit tests for all three composables.

**Todo:**
1. Implement `useFormState.ts`.
2. Implement `useValidation.ts` with rules: `required`, `email`, `phone`, `url`, `number`, `minLength`, `maxLength`, `minSelections`, `maxSelections`.
3. Implement `useMultiStep.ts`.
4. Implement layout components.
5. Wire composables together in `FormWidget.vue`.
6. Write unit tests.

---

### Sub-Task 1.4 — Backend API: Schema and Submission Endpoints

**Intent:** Implement the two core API endpoints and the PostgreSQL schema.

**Deliverables:**
- PostgreSQL migrations: `forms` table, `submissions` table.
- `GET /api/forms/:formId` — serve form JSON schema (public, rate-limited).
- `POST /api/submissions` — receive, validate, sanitise, and persist a submission.
- Origin/Referer header validation middleware.
- `sanitise.ts` middleware using `sanitize-html`.
- Server-side field type and required-field validation.
- Basic self-email notification on submission (SMTP).
- `GET /health` endpoint.

**Todo:**
1. Write and run PostgreSQL migration files.
2. Implement `formService.ts` (CRUD for forms).
3. Implement `submissionService.ts` (persist + retrieve submissions).
4. Implement `GET /api/forms/:formId` route.
5. Implement `POST /api/submissions` route with middleware chain.
6. Implement `emailService.ts` for self-notification.
7. Write integration tests for both endpoints.

---

### Sub-Task 1.5 — Embed Entry Point and Web Component Registration

**Intent:** Package the Vue 3 application as a `<ajj-form>` Web Component, confirm it loads from a single `<script>` tag, and test the inline embed mode on a bare HTML page.

**Deliverables:**
- `embed/src/main.ts` using `defineCustomElement(FormWidget)`.
- `embed.iife.js` built output verified to load and render from a plain HTML file.
- Manual test page `test.html` in the project root.

**Todo:**
1. Update `main.ts` to use `defineCustomElement` and `customElements.define('ajj-form', ...)`.
2. Build the embed and verify the IIFE loads without errors in a browser.
3. Create `test.html` and confirm inline embed renders.

---

## Phase 2 — Conditional Logic and Advanced Fields

**Goal:** The form adapts dynamically based on user responses; all remaining field types are available.

### Sub-Task 2.1 — Conditional Logic Engine

**Deliverables:**
- `useConditionalLogic.ts` evaluating all six action types: Jump, Calculate, Require, Show, Hide, Redirect.
- AND/OR condition groups with nesting.
- Integration with `useMultiStep` (jump target), `useFormState` (calculated values), and field visibility in `FormPage.vue`.
- Unit tests covering all action types and edge cases (conflicting rules, empty conditions, circular references).

---

### Sub-Task 2.2 — Advanced Field Components

**Field types in scope:**
Multi-select, Linear scale, Star rating, NPS, CSAT, Ranking, Matrix/Likert, File upload, Electronic signature, Hidden fields, Calculated fields.

**Deliverables:**
- Twelve new field component `.vue` files.
- File upload backend integration (S3-compatible storage; `storageService.ts`).
- Signed URL generation for file retrieval.
- Unit tests for all new components.

---

### Sub-Task 2.3 — Answer Piping

**Deliverables:**
- `useAnswerPiping.ts`: string interpolation replacing `@fieldName` tokens.
- `interpolate.ts` utility function.
- Applied to: question text, hint text, Thank You page content, calculated field expressions.
- Unit tests with various piping scenarios.

---

### Sub-Task 2.4 — Custom Thank You Page and Redirect

**Deliverables:**
- `ThankYouPage.vue` component rendering custom text, headings, links, and media from the schema.
- Redirect on completion: conditional logic Redirect action handled in `useSubmission.ts`.
- Webhook dispatcher with 5-attempt retry queue in `webhookService.ts`.

---

## Phase 3 — Theming, Embed Modes, and Notifications

**Goal:** Forms are fully branded; all three embed modes work; rich notifications fire reliably.

### Sub-Task 3.1 — Theming System

**Deliverables:**
- CSS custom property injection from the form schema's `theme` object (primary colour, background, button colour, font family).
- Per-form custom CSS stylesheet injection from schema field.
- Logo and cover image rendering in `FormWidget.vue`.

---

### Sub-Task 3.2 — Popup and Full-Page Embed Modes

**Deliverables:**
- Popup mode: overlay modal, `AJJForms.open()` / `AJJForms.close()` JS API, `data-ajj-form` declarative trigger.
- Full-page mode: viewport-filling CSS for `mode="fullpage"`.
- `auto-open` delay attribute for popup.
- `postMessage` dynamic height reporting to host page for inline embeds without Shadow DOM.

---

### Sub-Task 3.3 — Host Page URL Parameter Forwarding

**Deliverables:**
- `queryParams.ts` utility extracting host page URL search params.
- Auto-population of hidden fields and `prefill`-matching fields on form load.
- `prefill` attribute JSON parsing and field population.

---

### Sub-Task 3.4 — Respondent Email Notification and Dynamic Routing

**Deliverables:**
- Respondent email notification: configurable `To:` field sourced from the form's email field.
- Dynamic `To:` routing via calculated field for team-based dispatch (sales/support/billing).
- Email template rendering with `@mention` field substitution.

---

### Sub-Task 3.5 — reCAPTCHA / hCaptcha Integration

**Deliverables:**
- `FieldCaptcha.vue` component (invisible reCAPTCHA v3 or hCaptcha).
- Server-side token verification in `submissionService.ts`.
- Optional per-form configuration (enable/disable, provider choice).

---

## Phase 4 — Security Hardening, Testing, and Documentation

**Goal:** Production-ready, secure, fully tested, and documented.

### Sub-Task 4.1 — Security Hardening

**Deliverables:**
- Redis-backed rate limiter: 5 submissions / IP / minute / formId (`rateLimit.ts`).
- CSRF double-submit cookie (`csrf.ts` middleware).
- Partial submission capture: save state on each page advance.
- Duplicate submission prevention: server-side idempotency token + browser cookie.
- Password-protected form gate: password hash stored in form schema; pre-render gate component.

---

### Sub-Task 4.2 — Test Suite

**Deliverables:**
- Unit tests (Vitest): all composables, all field components, conditional logic engine, validation engine.
- Integration tests (Supertest): all API endpoints.
- End-to-end tests (Playwright): inline embed render, popup open/close, multi-step navigation, conditional show/hide, form submission, file upload.
- Minimum coverage target: 80%.

---

### Sub-Task 4.3 — Documentation

**Deliverables:**
- `Docs/Architecture.md` — system diagram and component responsibilities.
- `Docs/Quickstart.md` — local setup guide.
- `Docs/EmbeddingGuide.md` — developer embedding reference.
- `Docs/TallySoFeatureAudit.md` — feature baseline documentation.
- `Docs/StackEvaluation.md` — technology comparison.
- `Docs/SchemaReference.md` — full JSON schema documentation for form definitions.
- `README.md` — project overview, architecture summary, quickstart link.
- Docker Compose deployment package: production `docker-compose.yml` with environment variable instructions.

---

## Sub-Task Status Tracker

| Sub-Task | Phase | Status |
|---|---|---|
| 1.1 Project Scaffolding | 1 | [ ] pending |
| 1.2 Core Field Components | 1 | [ ] pending |
| 1.3 Form State, Validation, Multi-Step | 1 | [ ] pending |
| 1.4 Backend API: Schema + Submission | 1 | [ ] pending |
| 1.5 Embed Entry Point / Web Component | 1 | [ ] pending |
| 2.1 Conditional Logic Engine | 2 | [ ] pending |
| 2.2 Advanced Field Components | 2 | [ ] pending |
| 2.3 Answer Piping | 2 | [ ] pending |
| 2.4 Thank You Page + Webhook Dispatch | 2 | [ ] pending |
| 3.1 Theming System | 3 | [ ] pending |
| 3.2 Popup and Full-Page Embed Modes | 3 | [ ] pending |
| 3.3 URL Parameter Forwarding | 3 | [ ] pending |
| 3.4 Respondent Email + Dynamic Routing | 3 | [ ] pending |
| 3.5 reCAPTCHA / hCaptcha Integration | 3 | [ ] pending |
| 4.1 Security Hardening | 4 | [ ] pending |
| 4.2 Test Suite | 4 | [ ] pending |
| 4.3 Documentation | 4 | [ ] pending |
