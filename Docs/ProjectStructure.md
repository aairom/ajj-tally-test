# Project Structure — AJJ Custom Form Solution

This document describes the recommended file and folder structure for the entire project.

---

## Root Layout

```
ajj-tally/
│
├── embed/                    # Vue 3 embed widget (Vite library build)
├── api/                      # Node.js backend API
├── Docs/                     # All project documentation
├── scripts/                  # Automation shell scripts
├── input/                    # Input documents (content tracked, files ignored)
├── output/                   # Timestamped output files (content ignored)
├── docker-compose.yml        # Full-stack local deployment
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
└── README.md                 # Project overview and quickstart link
```

---

## Embed Widget (`embed/`)

```
embed/
├── src/
│   ├── main.ts                      # defineCustomElement entry point
│   │                                #   registers <ajj-form> custom element
│   │
│   ├── FormWidget.vue               # Root Web Component
│   │                                #   Shadow DOM root; wires all composables
│   │
│   ├── components/
│   │   ├── fields/                  # One .vue file per field type
│   │   │   ├── FieldShortAnswer.vue
│   │   │   ├── FieldLongAnswer.vue
│   │   │   ├── FieldEmail.vue
│   │   │   ├── FieldPhone.vue
│   │   │   ├── FieldNumber.vue
│   │   │   ├── FieldMultipleChoice.vue
│   │   │   ├── FieldDropdown.vue
│   │   │   ├── FieldCheckbox.vue
│   │   │   ├── FieldMultiSelect.vue
│   │   │   ├── FieldDate.vue
│   │   │   ├── FieldTime.vue
│   │   │   ├── FieldRating.vue
│   │   │   ├── FieldLinearScale.vue
│   │   │   ├── FieldNPS.vue
│   │   │   ├── FieldCSAT.vue
│   │   │   ├── FieldRanking.vue
│   │   │   ├── FieldMatrix.vue
│   │   │   ├── FieldFileUpload.vue
│   │   │   ├── FieldSignature.vue
│   │   │   ├── FieldHidden.vue
│   │   │   └── FieldCaptcha.vue
│   │   │
│   │   ├── layout/                  # Structural / navigation components
│   │   │   ├── FormPage.vue         # Renders the active page's fields
│   │   │   ├── FormProgress.vue     # Progress bar (currentPage / totalPages)
│   │   │   ├── FormNavigation.vue   # Next / Back / Submit buttons
│   │   │   ├── ThankYouPage.vue     # Post-submission screen
│   │   │   └── PasswordGate.vue     # Pre-form password protection screen
│   │   │
│   │   └── ui/                      # Reusable primitive components
│   │       ├── BaseButton.vue
│   │       ├── BaseInput.vue
│   │       ├── BaseTextarea.vue
│   │       ├── BaseSelect.vue
│   │       └── ErrorMessage.vue
│   │
│   ├── composables/
│   │   ├── useFormState.ts          # Reactive Map<fieldId, value>
│   │   ├── useMultiStep.ts          # Page navigation logic
│   │   ├── useValidation.ts         # Client-side validation engine
│   │   ├── useConditionalLogic.ts   # IF/THEN rule evaluator
│   │   ├── useAnswerPiping.ts       # @fieldName token interpolation
│   │   └── useSubmission.ts         # POST submission, loading, error handling
│   │
│   ├── types/
│   │   ├── schema.ts                # FormSchema, PageSchema, FieldDefinition
│   │   ├── fields.ts                # FieldTypeEnum, FieldConfig per type
│   │   └── logic.ts                 # LogicRule, Condition, ActionType
│   │
│   └── utils/
│       ├── fieldRegistry.ts         # Map<FieldTypeEnum, Component>
│       ├── interpolate.ts           # Answer piping string substitution
│       └── queryParams.ts           # Host-page URL param extraction
│
├── dist/                            # Build output (gitignored)
│   └── embed.iife.js                # Final deployable embed bundle
│
├── vite.config.ts                   # Lib mode: format=iife, entry=src/main.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
├── vitest.config.ts
└── package.json
```

---

## Backend API (`api/`)

```
api/
├── src/
│   ├── app.ts                       # Express/Fastify app factory
│   ├── server.ts                    # HTTP server entry point (binds port)
│   │
│   ├── routes/
│   │   ├── forms.ts                 # GET /api/forms/:id
│   │   │                            # POST /api/forms (auth)
│   │   │                            # PUT /api/forms/:id (auth)
│   │   ├── submissions.ts           # POST /api/submissions
│   │   │                            # GET /api/submissions/:formId (auth)
│   │   └── health.ts                # GET /health
│   │
│   ├── middleware/
│   │   ├── auth.ts                  # JWT bearer token verification
│   │   ├── rateLimit.ts             # Redis-backed per-IP/per-form rate limiter
│   │   ├── csrf.ts                  # CSRF double-submit cookie
│   │   ├── sanitise.ts              # sanitize-html string input sanitisation
│   │   └── originCheck.ts           # Origin/Referer allowlist validation
│   │
│   ├── services/
│   │   ├── formService.ts           # Form CRUD (read/write PostgreSQL)
│   │   ├── submissionService.ts     # Submission persist + processing pipeline
│   │   ├── emailService.ts          # Nodemailer/SendGrid: self + respondent emails
│   │   ├── webhookService.ts        # Webhook dispatch with 5-attempt retry queue
│   │   └── storageService.ts        # S3-compatible upload / signed URL retrieval
│   │
│   ├── db/
│   │   ├── client.ts                # PostgreSQL connection pool (pg or Drizzle ORM)
│   │   └── migrations/
│   │       ├── 001_create_forms.sql
│   │       ├── 002_create_submissions.sql
│   │       └── 003_create_webhook_events.sql
│   │
│   └── types/
│       └── index.ts                 # Shared TypeScript interfaces for API layer
│
├── tests/
│   ├── unit/                        # Unit tests for services and middleware
│   └── integration/                 # Supertest integration tests for routes
│
├── tsconfig.json
└── package.json
```

---

## Documentation (`Docs/`)

```
Docs/
├── Architecture.md                  # System architecture diagram and component map
├── Quickstart.md                    # Local development setup guide
├── EmbeddingGuide.md                # Developer embedding interface specification
├── TallySoFeatureAudit.md           # Feature audit used as requirements baseline
├── StackEvaluation.md               # Technology comparison and recommendation
├── ImplementationRoadmap.md         # Phased development plan with sub-tasks
├── ProjectStructure.md              # This file
└── SchemaReference.md               # Form JSON schema full field reference
```

---

## Scripts (`scripts/`)

```
scripts/
├── start.sh                         # Start all services in detached mode; prints URL
└── stop.sh                          # Gracefully stop all services
```

Both files must have execute permissions:

```bash
chmod +x scripts/start.sh scripts/stop.sh
```

---

## Infrastructure Files (Root)

| File | Purpose |
|---|---|
| `docker-compose.yml` | Defines `api`, `postgres`, and `redis` services |
| `.env.example` | Documents all required environment variables with placeholder values |
| `.gitignore` | Excludes `.env`, `node_modules`, `dist/`, `output/`, `input/` contents, `_*/`, `AGENTS.md`, `.bob/mcp.json`, `.playwright-mcp` |
| `README.md` | Project overview, licence, architecture summary, and quickstart link |

---

## .gitignore Rules Summary

```gitignore
# Environment
.env
.env.*
!.env.example

# Dependencies
node_modules/
**/node_modules/

# Build output
embed/dist/
api/dist/

# Output files (folder tracked, contents ignored)
output/*
!output/.gitkeep

# Input files (folder tracked, contents ignored)
input/*
!input/.gitkeep

# Private folders (underscore prefix convention)
_*/

# Binary / model files
*.onnx
*.onnx.data
*.so
*.tgz
*.tar.gz
*.zip
*.dylib

# Tools
.playwright-mcp/
AGENTS.md
.bob/mcp.json
```
