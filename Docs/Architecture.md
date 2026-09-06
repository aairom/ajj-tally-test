# Architecture — AJJ Custom Form Solution

## System Overview

The solution is composed of two independently deployable layers:

| Layer | Technology | Responsibility |
|---|---|---|
| **Embed Runtime** | Vue 3 Web Component (Vite IIFE build) | Render the form, manage state, execute client-side logic, submit data |
| **Backend API** | Node.js (Express/Fastify) + PostgreSQL | Serve form schemas, persist submissions, send notifications, dispatch webhooks |

---

## High-Level Architecture

```
┌───────────────────────────────────────────────────────┐
│                      Host Website                      │
│   <script src="https://forms.ajj.com/embed.js">        │
│   <ajj-form form-id="abc123" mode="inline">            │
└────────────────────────┬──────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────┐
│             Embed Runtime (Vue 3 Web Component)       │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ FormWidget.vue  (Shadow DOM root)               │  │
│  │  ├── FormProgress.vue                           │  │
│  │  ├── FormPage.vue (active page only)            │  │
│  │  │    └── [FieldComponent] × n (from registry)  │  │
│  │  ├── FormNavigation.vue (Next / Back / Submit)  │  │
│  │  └── ThankYouPage.vue                           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  Composables:                                          │
│    useFormState · useMultiStep · useValidation         │
│    useConditionalLogic · useAnswerPiping · useSubmission│
└────────────────────────┬──────────────────────────────┘
                         │
          GET /api/forms/:id  (schema fetch)
          POST /api/submissions  (data submit)
                         │
                         ▼
┌───────────────────────────────────────────────────────┐
│                  Backend API (Node.js)                 │
│                                                        │
│  Routes: forms.ts · submissions.ts                     │
│  Middleware: auth · rateLimit · csrf · sanitise        │
│  Services: formService · submissionService             │
│             emailService · webhookService · storage    │
└──────┬───────────┬───────────────┬────────────────────┘
       │           │               │
       ▼           ▼               ▼
┌──────────┐  ┌─────────┐  ┌──────────────────┐
│PostgreSQL│  │  Redis  │  │ S3-compatible    │
│(forms +  │  │(rate    │  │ Object Storage   │
│submissions│ │limiting)│  │(file uploads)    │
└──────────┘  └─────────┘  └──────────────────┘
       │
       ├── Email Service (SMTP / SendGrid)
       └── Webhook Dispatcher (retry queue)
```

---

## Component Responsibilities

### Embed Runtime Composables

| Composable | Responsibility |
|---|---|
| `useFormState` | Reactive `Map<fieldId, value>` shared across all field components via provide/inject |
| `useMultiStep` | Page array management: `currentPageIndex`, `goNext()`, `goBack()`, `goToPage(n)` |
| `useValidation` | Evaluates `validationRules[]` per field on blur, page advance, and submit; returns `Map<fieldId, errorMessage>` |
| `useConditionalLogic` | Evaluates all IF/THEN rules against current state; produces `hiddenBlocks`, `requiredOverrides`, `jumpTarget`, `calculatedValues` |
| `useAnswerPiping` | String interpolation: replaces `@fieldName` tokens in question text with current field values |
| `useSubmission` | Handles POST to `/api/submissions`, loading states, error handling, retry on network failure |

### Field Component Registry

All field types are registered in `fieldRegistry.ts` as a `Map<FieldTypeEnum, Component>`. The `FormPage` component dynamically resolves the correct component per field definition — no switch statements in the render loop.

### Backend Submission Pipeline

On every `POST /api/submissions`:
1. Validate `Origin` / `Referer` against form's authorised domains allowlist.
2. Verify CSRF double-submit cookie token.
3. Sanitise all string inputs with `sanitize-html`.
4. Re-validate required fields and type constraints server-side.
5. Persist submission record to PostgreSQL.
6. Store uploaded files to S3 (if any); record object keys.
7. Enqueue async email notification job.
8. Enqueue async webhook dispatch job (with 5-attempt retry schedule).
9. Respond `201 Created` with `{ submissionId }`.

---

## Data Flow Diagram

```
[Browser]
  │  user fills fields
  ▼
[useFormState] ──► [useConditionalLogic] ──► derived: hidden/required/jump/calc
  │
  │  user clicks Submit
  ▼
[useValidation] ──► if errors: show inline ──► stop
  │  if valid
  ▼
[useSubmission] ──── POST /api/submissions ──► [API]
                                                  │
                                          persist to DB
                                                  │
                                    ┌─────────────┴────────────┐
                                    ▼                          ▼
                             Email queue               Webhook queue
                                    │                          │
                             send notification          POST to endpoint
```

---

## Security Layers

| Layer | Mechanism |
|---|---|
| Transport | HTTPS-only; embed script and API served over TLS |
| Origin validation | Per-form allowlist of authorised host domains checked on every submission |
| CSRF | Double-submit cookie pattern on submission endpoints |
| Input sanitisation | `sanitize-html` server-side; parameterised SQL queries |
| Rate limiting | Redis-backed: 5 submissions / IP / minute / formId |
| CAPTCHA | Optional hCaptcha / reCAPTCHA v3 token verified server-side |
| Authentication | JWT bearer tokens for admin/management API endpoints |
| CSP compliance | No `eval`, no `innerHTML` with untrusted content, no inline event handlers |
