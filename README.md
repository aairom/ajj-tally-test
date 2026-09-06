# AJJ-Tally — Custom Self-Hosted Embeddable Form Solution

A fully custom, self-hosted replacement for Tally.so. Drop a single `<script>` tag onto any website and render a fully featured form — inline, as a popup, or full-page — with no third-party SaaS dependency.

---

## Architecture

```
Host Website (<ajj-form> Web Component)
       │
       ▼
Embed Runtime — Vue 3 Web Component (Vite IIFE build)
       │  GET /api/forms/:id · POST /api/submissions
       ▼
Backend API — Node.js + PostgreSQL
       │
       ├── Email notifications (SMTP / SendGrid)
       ├── Webhook dispatch (JSON POST, 5-attempt retry)
       └── File storage (S3-compatible)
```

See [`Docs/Architecture.md`](Docs/Architecture.md) for the full architecture diagram.

---

## Key Features

- **20+ field types**: text, email, phone, number, multiple choice, dropdown, checkbox, multi-select, matrix/Likert, ranking, date, time, star rating, NPS, CSAT, linear scale, file upload, electronic signature, hidden fields, calculated fields.
- **Conditional logic engine**: show/hide blocks, jump to page, calculate values, make fields required, redirect on completion — with AND/OR condition groups.
- **Multi-step navigation** with progress indicator and answer piping.
- **Three embed modes**: inline, popup (JS API + declarative trigger), full-page.
- **Shadow DOM isolation** via Vue 3 `defineCustomElement` — no CSS conflicts with the host page.
- **Email notifications**: self-notification and respondent confirmation with dynamic `@mention` field insertion.
- **Webhooks**: JSON POST on submission with SHA256 signing and retry queue.
- **Theming**: brand colours, fonts, logo, cover image, custom CSS per form.
- **Security**: CSRF protection, input sanitisation, rate limiting, optional CAPTCHA, HTTPS-only.

---

## Quick Start

```bash
git clone https://github.com/your-org/ajj-tally.git
cd ajj-tally
cp .env.example .env
# Edit .env with your database and SMTP credentials
./scripts/start.sh
```

See [`Docs/Quickstart.md`](Docs/Quickstart.md) for full setup instructions.

---

## Embedding

```html
<!-- 1. Load the embed script once -->
<script src="https://forms.ajj.com/embed.js" defer></script>

<!-- 2. Place the form element wherever you need it -->
<ajj-form form-id="YOUR_FORM_ID" mode="inline" dynamic-height="true"></ajj-form>
```

See [`Docs/EmbeddingGuide.md`](Docs/EmbeddingGuide.md) for the full embedding interface specification.

---

## Documentation

| Document | Description |
|---|---|
| [`Docs/Architecture.md`](Docs/Architecture.md) | System architecture and component map |
| [`Docs/Quickstart.md`](Docs/Quickstart.md) | Local development setup |
| [`Docs/EmbeddingGuide.md`](Docs/EmbeddingGuide.md) | Developer embedding reference |
| [`Docs/TallySoFeatureAudit.md`](Docs/TallySoFeatureAudit.md) | Feature audit / requirements baseline |
| [`Docs/StackEvaluation.md`](Docs/StackEvaluation.md) | Technology stack comparison |
| [`Docs/ImplementationRoadmap.md`](Docs/ImplementationRoadmap.md) | Phased development plan |
| [`Docs/ProjectStructure.md`](Docs/ProjectStructure.md) | File and folder structure |
| [`Docs/SchemaReference.md`](Docs/SchemaReference.md) | Form JSON schema reference |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Embed runtime | Vue 3 (Composition API) + Vite + TypeScript + Tailwind CSS |
| Backend API | Node.js (Express/Fastify) + TypeScript |
| Database | PostgreSQL |
| Cache / rate limiting | Redis |
| File storage | S3-compatible (AWS S3 / MinIO / Cloudflare R2) |
| Email | Nodemailer (SMTP) or SendGrid |
| Containerisation | Docker / Podman (Compose) |

---

## Project Structure

```
ajj-tally/
├── embed/          Vue 3 embed widget (Vite library build)
├── api/            Node.js backend API
├── Docs/           All project documentation
├── scripts/        Automation shell scripts (start.sh, stop.sh)
├── input/          Input documents (folder tracked, contents gitignored)
├── output/         Timestamped output files (folder tracked, contents gitignored)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Licence

MIT — see [LICENCE](LICENCE) for details.
