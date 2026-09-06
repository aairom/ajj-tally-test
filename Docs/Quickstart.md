# Quickstart Guide — AJJ Custom Form Solution

This guide gets the full stack running locally in under 10 minutes.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|---|---|---|
| Node.js | 20.x LTS | API and embed build |
| npm | 10.x | Package management |
| Docker / Podman | Latest | PostgreSQL + Redis containers |
| Git | Any recent | Source checkout |

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/ajj-tally.git
cd ajj-tally
```

---

## 2. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and set the required values. At minimum:

```
DATABASE_URL=postgresql://ajj:ajj@localhost:5432/ajjforms
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-a-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
ALLOWED_ORIGINS=http://localhost:3000,https://your-site.com
```

---

## 3. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis in detached mode
docker-compose up -d postgres redis
```

Wait a few seconds for PostgreSQL to be ready, then run migrations:

```bash
cd api
npm install
npm run db:migrate
cd ..
```

---

## 4. Start the Backend API

```bash
cd api
npm run dev
```

The API starts on **http://localhost:8090** (avoids macOS AirDrop port conflict on 5000).

Confirm it is running:

```bash
curl http://localhost:8090/health
# Expected: {"status":"ok"}
```

---

## 5. Build the Embed Widget

```bash
cd embed
npm install
npm run build
```

The output file is written to `embed/dist/embed.iife.js`.

During development, use the watch/dev server:

```bash
npm run dev
```

The dev server hosts the widget at **http://localhost:5173/embed.iife.js**.

---

## 6. Test the Embed in a Local HTML Page

Create a file `test.html` in the project root:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AJJ Form Test</title>
  <script src="http://localhost:5173/embed.iife.js" defer></script>
</head>
<body>
  <h1>Test Page</h1>
  <ajj-form form-id="YOUR_FORM_ID" mode="inline" dynamic-height="true"></ajj-form>
</body>
</html>
```

Open `test.html` in a browser (via a local server, e.g. `npx serve .`).

---

## 7. Start Everything with One Command

Use the provided script to launch all services in detached mode:

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

This will:
1. Start Docker containers (PostgreSQL, Redis).
2. Run database migrations.
3. Start the API in the background.
4. Print the URL to access the API.

To stop all services gracefully:

```bash
./scripts/stop.sh
```

---

## 8. Run Tests

```bash
# API unit and integration tests
cd api && npm test

# Embed unit tests
cd embed && npm test

# End-to-end tests (requires running stack)
npm run test:e2e
```

---

## Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Secret for signing admin JWT tokens |
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP port (587 for STARTTLS, 465 for SSL) |
| `SMTP_USER` | Yes | SMTP authentication username |
| `SMTP_PASS` | Yes | SMTP authentication password |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed host domains |
| `S3_ENDPOINT` | No | S3-compatible endpoint URL (MinIO, R2, AWS) |
| `S3_ACCESS_KEY` | No | S3 access key ID |
| `S3_SECRET_KEY` | No | S3 secret access key |
| `S3_BUCKET` | No | S3 bucket name for file uploads |
| `RECAPTCHA_SECRET` | No | Google reCAPTCHA v3 secret key |
| `HCAPTCHA_SECRET` | No | hCaptcha secret key |
| `PORT` | No | API port (default: `8090`) |
| `NODE_ENV` | No | `development` or `production` |
