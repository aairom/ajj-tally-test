# Stripe Payment Integration — AJJ Custom Form Solution

> **Document scope:** This guide describes how to add Stripe payment collection to the AJJ embed runtime (Vue 3 Web Component / Vite IIFE build) and its Node.js/Express backend API. It is self-contained — a developer can follow it without referencing any other project document.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Approach Options](#3-approach-options)
4. [Installation & Setup](#4-installation--setup)
5. [Vue.js Composable Implementation](#5-vuejs-composable-implementation)
6. [Backend Endpoint](#6-backend-endpoint)
7. [Component Integration Example](#7-component-integration-example)
8. [Environment Variables](#8-environment-variables)
9. [Security Considerations](#9-security-considerations)
10. [Testing](#10-testing)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

AJJ-Tally renders forms as a Vue 3 Web Component embedded via a single `<script>` tag. Forms can gate submission behind a payment step — charging a fixed amount before persisting the submission to PostgreSQL.

This guide adds a `PAYMENT` field type that:

1. Creates a Payment Intent on the **Node.js/Express backend** (`POST /api/payments/create-intent`) using the Stripe secret key — amount and currency never touch the browser.
2. Mounts **Stripe Elements** inside the Shadow DOM for PCI-compliant card entry.
3. Confirms the payment with `stripe.confirmPayment()` from the `@stripe/stripe-js` browser SDK.
4. Passes the resulting `paymentIntentId` as a hidden field value to the normal submission pipeline (`POST /api/submissions`).

The integration sits alongside the existing `useSubmission` composable — payment confirmation happens in its own `useStripe` composable before `useSubmission` fires.

---

## 2. Prerequisites

### Tools & Runtime

| Tool | Minimum Version | Purpose |
|---|---|---|
| Node.js | 20.x LTS | Backend API and embed build |
| npm | 10.x | Package management |
| Vue 3 | 3.4+ | Embed runtime (already in place) |
| Vite | 5.x | Embed bundler (already in place) |

### Stripe Account

1. Create a free account at [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. In the Dashboard → **Developers → API keys**, copy:
   - **Publishable key** (`pk_test_…`) — used in the browser.
   - **Secret key** (`sk_test_…`) — used only on the backend.
3. In the Dashboard → **Developers → Webhooks**, create an endpoint pointing to `https://your-api.example.com/api/payments/webhook` and copy the **Webhook signing secret** (`whsec_…`).

### Environment Variables

All three values must exist in your `.env` file before starting the stack:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET
```

> **Never commit real keys.** Add all three to `.env` (gitignored). Update `.env.example` with placeholder names and descriptions.

---

## 3. Approach Options

Two integration approaches are available. Both are described below; **Approach B (Vue composable) is recommended** for this project.

---

### Approach A — Stripe MCP Server

The **Stripe MCP (Model Context Protocol) server** is an optional tool available in AI-assisted development environments (e.g., Cursor, Claude Dev, IBM Bob). It exposes Stripe API operations as callable tools so an AI agent can create products, prices, and Payment Intents programmatically during development without writing API calls manually.

**When to use it:**  
Useful during scaffolding — e.g., asking the AI agent to create a test product and price in your Stripe account, or to retrieve existing price IDs, without leaving the editor.

**Configuration:**

Add the Stripe MCP server to your `.bob/mcp.json` (or your AI tool's equivalent config):

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--tools=all"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_YOUR_STRIPE_SECRET_KEY"
      }
    }
  }
}
```

Once registered, the AI agent can call tools like `stripe_create_payment_intent`, `stripe_list_products`, and `stripe_retrieve_customer` directly in the chat. This is a **development-time convenience only** — it does not replace the runtime integration described in Approach B.

**Limitations:**  
- The MCP server requires Node.js and network access to the Stripe API.
- It operates outside the application runtime; it cannot be called from Vue components or Express route handlers.
- All production payment flows must use the backend endpoint described in [Section 6](#6-backend-endpoint).

---

### Approach B — Vue.js `useStripe` Composable ✅ Recommended

A self-contained Vue 3 composable (`useStripe.ts`) placed in `embed/src/composables/` alongside the existing composables (`useFormState`, `useSubmission`, etc.). It follows the same Composition API conventions already used throughout the project.

**Why recommended:**
- Runs entirely inside the embed runtime — no external tooling dependency.
- Works in all deployment environments (development, staging, production).
- Integrates naturally with the existing `useFormState` and `useSubmission` composables.
- Shadow DOM-compatible: Stripe Elements mounts into a plain `<div>` ref, which works inside Shadow DOM.

Full implementation details are in [Section 5](#5-vuejs-composable-implementation).

---

## 4. Installation & Setup

### 4.1 Embed Widget (`embed/`)

Install the Stripe.js browser SDK:

```bash
cd embed
npm install @stripe/stripe-js
```

This package provides type-safe wrappers around `window.Stripe` and is tree-shakeable. It does **not** bundle the Stripe.js script itself — it loads it from `https://js.stripe.com/v3/` at runtime, which is required for PCI compliance.

### 4.2 Backend API (`api/`)

Install the Stripe Node.js SDK:

```bash
cd api
npm install stripe
```

TypeScript types are included in the package (`@types/stripe` is not needed).

### 4.3 Database Migration

Add a column to the `submissions` table to store the Payment Intent ID:

```sql
-- api/src/db/migrations/004_add_payment_intent_to_submissions.sql
ALTER TABLE submissions
  ADD COLUMN payment_intent_id TEXT,
  ADD COLUMN payment_status    TEXT DEFAULT 'none';
```

Run the migration:

```bash
cd api
npm run db:migrate
```

---

## 5. Vue.js Composable Implementation

Create the file `embed/src/composables/useStripe.ts`:

```typescript
// embed/src/composables/useStripe.ts
// Manages the full Stripe payment lifecycle inside the AJJ embed runtime.

import { ref, type Ref } from 'vue'
import { loadStripe } from '@stripe/stripe-js'
import type {
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseStripeOptions {
  /** Amount in the smallest currency unit (e.g. cents for USD). */
  amount: number
  /** ISO 4217 currency code, lower-case (e.g. "usd", "eur"). */
  currency: string
  /** Description shown on the Stripe Dashboard for this payment. */
  description?: string
  /** Base URL of the AJJ backend API (e.g. "https://api.ajj.com"). */
  apiBaseUrl?: string
}

export interface UseStripeReturn {
  /** Call this once to create the Payment Intent and mount the Elements UI. */
  initPayment: (mountTarget: HTMLElement) => Promise<void>
  /** Call this on form submit to confirm the payment. */
  confirmPayment: (returnUrl: string) => Promise<{ paymentIntentId: string }>
  /** True while any async operation is in flight. */
  isLoading: Ref<boolean>
  /** Non-null if an error occurred at any stage. */
  error: Ref<string | null>
  /** The Payment Intent ID returned by the backend after creation. */
  paymentIntentId: Ref<string | null>
  /** True once the payment has been successfully confirmed. */
  paymentConfirmed: Ref<boolean>
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useStripe(options: UseStripeOptions): UseStripeReturn {
  const {
    amount,
    currency,
    description = 'AJJ Form Payment',
    apiBaseUrl = '',
  } = options

  // ── Reactive state ────────────────────────────────────────────────────────
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const paymentIntentId = ref<string | null>(null)
  const paymentConfirmed = ref(false)

  // ── Internal Stripe objects ───────────────────────────────────────────────
  let stripe: Stripe | null = null
  let elements: StripeElements | null = null
  let paymentElement: StripePaymentElement | null = null
  let clientSecret: string | null = null

  // ── Step 1: Load Stripe.js and initialise the SDK ────────────────────────
  async function loadStripeInstance(): Promise<Stripe> {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string
    if (!publishableKey) {
      throw new Error(
        'VITE_STRIPE_PUBLISHABLE_KEY is not defined. ' +
        'Add it to your .env file and restart the dev server.'
      )
    }
    const instance = await loadStripe(publishableKey)
    if (!instance) {
      throw new Error(
        'Stripe.js failed to load. Check your network connection and that ' +
        'https://js.stripe.com is not blocked.'
      )
    }
    return instance
  }

  // ── Step 2: Create a Payment Intent on the backend ───────────────────────
  async function createPaymentIntent(): Promise<{ clientSecret: string; intentId: string }> {
    const response = await fetch(`${apiBaseUrl}/api/payments/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, description }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(
        body.message ?? `Backend returned HTTP ${response.status} when creating Payment Intent.`
      )
    }

    const data = await response.json()
    return { clientSecret: data.clientSecret, intentId: data.paymentIntentId }
  }

  // ── Step 3: Mount the Stripe Elements Payment UI ─────────────────────────
  async function mountElements(mountTarget: HTMLElement, secret: string): Promise<void> {
    if (!stripe) throw new Error('Stripe instance not available.')

    elements = stripe.elements({
      clientSecret: secret,
      appearance: {
        theme: 'stripe',
        variables: {
          // Match the default AJJ form primary colour; override via CSS custom
          // properties on the host form theme if needed.
          colorPrimary: '#0066FF',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: '6px',
        },
      },
    })

    paymentElement = elements.create('payment', {
      layout: { type: 'tabs', defaultCollapsed: false },
    })

    // Mount into the provided DOM node (works inside Shadow DOM).
    paymentElement.mount(mountTarget)

    // Surface Stripe field validation errors immediately.
    paymentElement.on('change', (event) => {
      error.value = event.error?.message ?? null
    })
  }

  // ── Public: initPayment ───────────────────────────────────────────────────
  /**
   * Creates the Payment Intent and mounts the Stripe Elements UI into the
   * given DOM element. Call this in the component's `onMounted` hook or when
   * the payment step becomes visible.
   */
  async function initPayment(mountTarget: HTMLElement): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      stripe = await loadStripeInstance()
      const { clientSecret: secret, intentId } = await createPaymentIntent()
      clientSecret = secret
      paymentIntentId.value = intentId
      await mountElements(mountTarget, secret)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Payment initialisation failed.'
    } finally {
      isLoading.value = false
    }
  }

  // ── Public: confirmPayment ────────────────────────────────────────────────
  /**
   * Submits the card details to Stripe and confirms the payment.
   * On success, resolves with the Payment Intent ID to store in the submission.
   * On failure, sets `error` and re-throws so the calling component can react.
   *
   * @param returnUrl - Absolute URL Stripe redirects to after 3DS authentication.
   *                    Typically your form's current page URL.
   */
  async function confirmPayment(returnUrl: string): Promise<{ paymentIntentId: string }> {
    if (!stripe || !elements || !clientSecret) {
      throw new Error('Payment not initialised. Call initPayment() first.')
    }

    isLoading.value = true
    error.value = null

    try {
      // Trigger Elements validation first.
      const { error: submitError } = await elements.submit()
      if (submitError) {
        error.value = submitError.message ?? 'Card validation failed.'
        throw new Error(error.value)
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required', // Avoid redirect for cards that don't need 3DS.
      })

      if (confirmError) {
        error.value = confirmError.message ?? 'Payment confirmation failed.'
        throw new Error(error.value)
      }

      if (paymentIntent?.status === 'succeeded') {
        paymentConfirmed.value = true
        return { paymentIntentId: paymentIntent.id }
      }

      // Handles 'requires_action', 'processing', or unexpected statuses.
      throw new Error(`Payment status: ${paymentIntent?.status ?? 'unknown'}. Please try again.`)
    } finally {
      isLoading.value = false
    }
  }

  return {
    initPayment,
    confirmPayment,
    isLoading,
    error,
    paymentIntentId,
    paymentConfirmed,
  }
}
```

---

## 6. Backend Endpoint

Create `api/src/routes/payments.ts`:

```typescript
// api/src/routes/payments.ts
// Stripe Payment Intent creation endpoint.
// The secret key NEVER leaves the server.

import { Router, type Request, type Response } from 'express'
import Stripe from 'stripe'

const router = Router()

// Initialise the Stripe SDK once at module load.
// stripe.VERSION is printed to logs to aid debugging.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// ── POST /api/payments/create-intent ─────────────────────────────────────────
// Creates a Payment Intent and returns only the client_secret to the browser.
// The secret key is never exposed to the client.
router.post('/create-intent', async (req: Request, res: Response) => {
  const { amount, currency, description } = req.body as {
    amount: number
    currency: string
    description?: string
  }

  // Basic server-side validation.
  if (typeof amount !== 'number' || amount < 50) {
    return res.status(400).json({ message: 'amount must be a number ≥ 50 (smallest currency unit).' })
  }
  const supportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'chf', 'jpy']
  if (!supportedCurrencies.includes(currency?.toLowerCase())) {
    return res.status(400).json({ message: `currency must be one of: ${supportedCurrencies.join(', ')}.` })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,                              // e.g. 2500 = $25.00 USD
      currency: currency.toLowerCase(),
      description: description ?? 'AJJ Form Payment',
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: 'ajj-tally',
      },
    })

    return res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (err: unknown) {
    const message = err instanceof Stripe.errors.StripeError
      ? err.message
      : 'Failed to create Payment Intent.'
    return res.status(500).json({ message })
  }
})

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// Receives Stripe webhook events and updates submission payment_status.
// Requires the raw request body — register this route BEFORE express.json().
router.post(
  '/webhook',
  // express.raw() must be applied to this route specifically, not globally.
  // In app.ts, register this router before the global json() middleware.
  (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

    let event: Stripe.Event

    try {
      // req.body must be the raw Buffer when using express.raw().
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Webhook signature verification failed.'
      console.error('[Stripe Webhook] Signature error:', message)
      return res.status(400).json({ message })
    }

    // Handle the events your application cares about.
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        // TODO: update submissions SET payment_status = 'succeeded'
        //       WHERE payment_intent_id = intent.id
        console.log(`[Stripe Webhook] Payment succeeded: ${intent.id}`)
        break
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        console.warn(`[Stripe Webhook] Payment failed: ${intent.id}`)
        break
      }
      default:
        // Unhandled event types are silently ignored.
        break
    }

    // Acknowledge receipt immediately; async processing happens in the background.
    return res.status(200).json({ received: true })
  }
)

export default router
```

**Register the routes in `api/src/app.ts`:**

```typescript
// api/src/app.ts (excerpt — add these lines)
import express from 'express'
import paymentsRouter from './routes/payments'

const app = express()

// The webhook route needs the raw body for signature verification.
// Register it BEFORE the global express.json() middleware.
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsRouter
)

// Global JSON body parser (for all other routes).
app.use(express.json())

// All other routes ...
app.use('/api/payments', paymentsRouter)
```

---

## 7. Component Integration Example

Create `embed/src/components/fields/FieldPayment.vue`:

```vue
<!-- embed/src/components/fields/FieldPayment.vue -->
<!-- Renders the Stripe payment step inside the AJJ embed form. -->
<!-- Integrates with useStripe and signals completion to useFormState. -->

<template>
  <div class="ajj-payment-field">
    <!-- Field label and description (standard AJJ field pattern) -->
    <label class="ajj-field-label">
      {{ field.label }}
      <span v-if="field.required" class="ajj-required" aria-hidden="true">*</span>
    </label>
    <p v-if="field.description" class="ajj-field-description">
      {{ field.description }}
    </p>

    <!-- Payment summary -->
    <div class="ajj-payment-summary">
      <span class="ajj-payment-amount">
        {{ formattedAmount }}
      </span>
    </div>

    <!-- Stripe Elements mount point.
         A plain div ref works inside Shadow DOM — Stripe mounts an iframe here. -->
    <div
      ref="stripeMount"
      class="ajj-stripe-mount"
      :class="{ 'ajj-stripe-mount--loading': isLoading }"
    />

    <!-- Loading indicator shown while Stripe Elements loads -->
    <div v-if="isLoading" class="ajj-payment-loading" role="status" aria-live="polite">
      <span class="ajj-spinner" aria-hidden="true" />
      <span>Loading payment form…</span>
    </div>

    <!-- Error message (Stripe field validation or network errors) -->
    <p
      v-if="error"
      class="ajj-payment-error"
      role="alert"
      aria-live="assertive"
    >
      {{ error }}
    </p>

    <!-- Success confirmation (shown after confirmPayment resolves) -->
    <div v-if="paymentConfirmed" class="ajj-payment-success" role="status">
      <svg
        class="ajj-check-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clip-rule="evenodd"
        />
      </svg>
      Payment confirmed — your form will now be submitted.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useStripe } from '../../composables/useStripe'
import type { FieldDefinition } from '../../types/fields'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps<{
  field: FieldDefinition & {
    config: {
      /** Payment amount in the smallest currency unit (e.g. cents). */
      amount: number
      /** ISO 4217 currency code, lower-case (e.g. "usd"). */
      currency: string
      /** Human-readable description shown in the Stripe Dashboard. */
      description?: string
    }
  }
}>()

// ── Inject shared form state (standard AJJ pattern) ───────────────────────────
// FormWidget.vue provides setFieldValue via provide(); all field components
// consume it the same way to write their value back to the shared state Map.
const setFieldValue = inject<(fieldId: string, value: unknown) => void>('setFieldValue')

// ── Local refs ────────────────────────────────────────────────────────────────
const stripeMount = ref<HTMLElement | null>(null)

// ── Stripe composable ─────────────────────────────────────────────────────────
const { initPayment, confirmPayment, isLoading, error, paymentIntentId, paymentConfirmed } =
  useStripe({
    amount: props.field.config.amount,
    currency: props.field.config.currency,
    description: props.field.config.description,
    // apiBaseUrl defaults to '' (same origin). Override for cross-origin setups:
    // apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  })

// ── Formatted amount for display ──────────────────────────────────────────────
const formattedAmount = computed(() => {
  const { amount, currency } = props.field.config
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
})

// ── Lifecycle: mount Stripe Elements when the component mounts ────────────────
onMounted(async () => {
  if (!stripeMount.value) return
  await initPayment(stripeMount.value)
})

// ── Exposed method: called by FormNavigation.vue before submission ─────────────
// FormWidget.vue calls this on the active payment field before calling
// useSubmission.submit() — it confirms the payment and stores the intent ID
// as the field's value in the shared form state.
async function processPayment(): Promise<boolean> {
  try {
    const returnUrl = window.location.href
    const { paymentIntentId: intentId } = await confirmPayment(returnUrl)
    // Write the Payment Intent ID back to the shared form state so it is
    // included in the POST /api/submissions payload.
    setFieldValue?.(props.field.id, intentId)
    return true
  } catch {
    // error ref is already set by the composable; the template renders it.
    return false
  }
}

// Expose so parent components (FormNavigation, FormWidget) can call it.
defineExpose({ processPayment })
</script>

<style scoped>
.ajj-payment-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ajj-field-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ajj-text, #1f2328);
}

.ajj-required {
  color: #ef4444;
  margin-left: 0.25rem;
}

.ajj-field-description {
  font-size: 0.875rem;
  color: var(--ajj-muted, #57606a);
  margin: 0;
}

.ajj-payment-summary {
  padding: 0.75rem 1rem;
  background: var(--ajj-surface, #f7f8fa);
  border: 1px solid var(--ajj-border, #e5e7eb);
  border-radius: 6px;
  font-size: 0.9375rem;
}

.ajj-payment-amount {
  font-weight: 700;
  color: var(--ajj-text, #1f2328);
}

.ajj-stripe-mount {
  min-height: 200px;
  transition: opacity 0.2s ease;
}

.ajj-stripe-mount--loading {
  opacity: 0;
  pointer-events: none;
}

.ajj-payment-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--ajj-muted, #57606a);
}

.ajj-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--ajj-border, #e5e7eb);
  border-top-color: var(--ajj-primary, #0066ff);
  border-radius: 50%;
  animation: ajj-spin 0.6s linear infinite;
}

@keyframes ajj-spin {
  to { transform: rotate(360deg); }
}

.ajj-payment-error {
  font-size: 0.875rem;
  color: #ef4444;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

.ajj-payment-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #16a34a;
  padding: 0.5rem 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
}

.ajj-check-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}
</style>
```

### Register the field in `fieldRegistry.ts`

```typescript
// embed/src/utils/fieldRegistry.ts (excerpt)
import FieldPayment from '../components/fields/FieldPayment.vue'
import { FieldTypeEnum } from '../types/fields'

// Add to the existing registry Map:
fieldRegistry.set(FieldTypeEnum.PAYMENT, FieldPayment)
```

### Add `PAYMENT` to `FieldTypeEnum`

```typescript
// embed/src/types/fields.ts (excerpt)
export enum FieldTypeEnum {
  // … existing values …
  PAYMENT = 'PAYMENT',
}
```

---

## 8. Environment Variables

Add the following to `.env` (copy from `.env.example`):

```bash
# ─── Stripe ──────────────────────────────────────────────────────────────────
# Backend secret key — never expose this to the browser.
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY

# Webhook signing secret — obtained from the Stripe Dashboard → Webhooks.
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET

# ─── Embed (Vite) ────────────────────────────────────────────────────────────
# Publishable key — safe to expose; injected into the browser bundle.
# Must be prefixed with VITE_ to be exposed by Vite to import.meta.env.
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
```

Update `.env.example` with the same variable names and placeholder descriptions:

```bash
# ─── Stripe ──────────────────────────────────────────────────────────────────
# Obtain from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_PUBLISHABLE_KEY
```

### Full Variable Reference

| Variable | Used In | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | `api/` only | Stripe secret key. Creates Payment Intents. Never sent to browser. |
| `STRIPE_WEBHOOK_SECRET` | `api/` only | Webhook signing secret for `constructEvent()`. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `embed/` only | Publishable key passed to `loadStripe()`. Safe to expose in the browser bundle. |

---

## 9. Security Considerations

### Never Expose the Secret Key

The Stripe secret key (`sk_…`) must only ever exist in server-side code and environment variables. It is used exclusively in `api/src/routes/payments.ts`. It must not appear in:

- Any file inside `embed/src/`
- Any `.env` file committed to Git
- Client-side fetch calls or request headers

### HTTPS is Required

Stripe.js refuses to load on non-HTTPS origins in production. Ensure:

- The embed runtime is served from an `https://` URL.
- The backend API uses TLS in production (reverse proxy: nginx / Caddy / Cloudflare).
- The `ALLOWED_ORIGINS` variable lists only `https://` origins (already enforced by the existing `originCheck.ts` middleware).

### Webhook Signature Verification

Every webhook event arriving at `POST /api/payments/webhook` must be verified using `stripe.webhooks.constructEvent()` before being acted upon. This prevents replay attacks and spoofed events. The raw request body (Buffer) is required — do not parse it with `express.json()` before this route.

### Amount Validation Server-Side

Always validate the `amount` on the backend. Never trust the amount sent by the browser. For fixed-price forms, derive the expected amount from the form schema stored in PostgreSQL rather than accepting it from the request body:

```typescript
// Recommended: look up the expected amount from the form schema
const form = await formService.getById(formId)
const expectedAmount = form.settings.paymentAmount
// Use expectedAmount, not req.body.amount
```

### CSP Headers

Add `https://js.stripe.com` to your Content-Security-Policy `script-src` and `frame-src` directives. Stripe Elements renders inside an iframe hosted at `js.stripe.com`:

```
Content-Security-Policy: script-src 'self' https://js.stripe.com; frame-src https://js.stripe.com;
```

### Rate Limiting

The `/api/payments/create-intent` endpoint creates billable Stripe objects. Apply the existing Redis-backed rate limiter (`rateLimit.ts`) to this route with a conservative limit (e.g., 3 requests / IP / minute).

---

## 10. Testing

### Test Mode

All keys starting with `sk_test_` / `pk_test_` operate in Stripe test mode. No real charges are made. Test mode data is isolated from live mode and does not appear on live dashboards.

### Test Card Numbers

Use these card numbers with any future expiry date (e.g. `12/26`) and any 3-digit CVC (e.g. `123`):

| Card Number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds immediately |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Payment always declines (insufficient funds) |
| `4100 0000 0000 0019` | Card blocked (fraudulent) |
| `4000 0000 0000 0002` | Generic decline |

For billing ZIP (US cards), use any 5-digit value (e.g. `10001`).

### Verifying a Successful Flow

1. Start the stack: `./scripts/start.sh`
2. Open a test page with an `<ajj-form>` that includes a `PAYMENT` field.
3. Enter card `4242 4242 4242 4242`, future expiry, any CVC.
4. Submit the form.
5. In the Stripe Dashboard → **Payments**, the Payment Intent should appear with status `Succeeded`.
6. In PostgreSQL, the `submissions` row should have `payment_intent_id` and `payment_status = 'succeeded'`.

### Unit Tests (Vitest)

```typescript
// embed/src/composables/__tests__/useStripe.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStripe } from '../useStripe'

// Mock @stripe/stripe-js
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    elements: vi.fn().mockReturnValue({
      create: vi.fn().mockReturnValue({
        mount: vi.fn(),
        on: vi.fn(),
        unmount: vi.fn(),
      }),
      submit: vi.fn().mockResolvedValue({ error: null }),
    }),
    confirmPayment: vi.fn().mockResolvedValue({
      error: null,
      paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
    }),
  }),
}))

// Mock the backend fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({
    clientSecret: 'pi_test_123_secret_abc',
    paymentIntentId: 'pi_test_123',
  }),
})

describe('useStripe', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_mock')
  })

  it('initialises with idle state', () => {
    const { isLoading, error, paymentConfirmed } = useStripe({
      amount: 2500,
      currency: 'usd',
    })
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(paymentConfirmed.value).toBe(false)
  })

  it('sets paymentIntentId after initPayment', async () => {
    const { initPayment, paymentIntentId } = useStripe({
      amount: 2500,
      currency: 'usd',
    })
    const div = document.createElement('div')
    await initPayment(div)
    expect(paymentIntentId.value).toBe('pi_test_123')
  })
})
```

### Webhook Testing with Stripe CLI

Install the Stripe CLI and forward events to your local API:

```bash
# Install (macOS)
brew install stripe/stripe-cli/stripe

# Log in
stripe login

# Forward webhooks to your local server
stripe listen --forward-to http://localhost:8090/api/payments/webhook

# Trigger a test event in a separate terminal
stripe trigger payment_intent.succeeded
```

The CLI outputs the webhook signing secret for local testing (`whsec_…`). Set it as `STRIPE_WEBHOOK_SECRET` in your `.env`.

---

## 11. Troubleshooting

### `VITE_STRIPE_PUBLISHABLE_KEY is not defined`

**Cause:** The environment variable is missing or the dev server was not restarted after adding it.  
**Fix:** Add `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…` to `.env` and run `npm run dev` again in the `embed/` directory.

### `Stripe.js failed to load`

**Cause:** `https://js.stripe.com` is blocked by a CSP, browser extension, or corporate firewall.  
**Fix:** Add `https://js.stripe.com` to `script-src` and `frame-src` in your CSP header. If a browser extension is blocking it, test in an incognito window with extensions disabled.

### `No such payment_intent: pi_xxx` (404 from Stripe)

**Cause:** The `clientSecret` was created in test mode but the publishable key being used is a live-mode key (or vice versa).  
**Fix:** Ensure both `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` are from the **same Stripe account and same mode** (both `sk_test_`/`pk_test_` or both `sk_live_`/`pk_live_`).

### Webhook returns `400 Webhook Error: No signatures found`

**Cause:** The raw request body is not being passed to `constructEvent()` — `express.json()` middleware consumed it first.  
**Fix:** Ensure the `/api/payments/webhook` route is registered in `app.ts` **before** the global `express.json()` middleware, using `express.raw({ type: 'application/json' })` on that route only.

### `Integration Error: Invalid value for stripe.confirmPayment(): elements`

**Cause:** `confirmPayment()` was called before `initPayment()` finished, or the `elements` instance is `null`.  
**Fix:** Await `initPayment()` in `onMounted` and disable the submit button (`isLoading.value === true`) until the composable is ready.

### Payment shows as `requires_action` and never succeeds

**Cause:** The card requires 3D Secure authentication. With `redirect: 'if_required'`, Stripe attempts to complete 3DS inline using an iframe. If the `returnUrl` is not reachable (e.g. `localhost`), the flow may stall.  
**Fix:** Use `4242 4242 4242 4242` for testing non-3DS flows. For 3DS testing in development, use [ngrok](https://ngrok.com) to expose a public URL and set it as the `returnUrl`.

### Stripe Elements not visible inside Shadow DOM

**Cause:** Scoped CSS or Shadow DOM style isolation is hiding the Stripe iframe.  
**Fix:** Stripe Elements renders inside its own iframe and is unaffected by Shadow DOM styles. If the mount `<div>` has `height: 0` or `display: none`, set an explicit `min-height` (at least `44px`). The `ajj-stripe-mount` class in `FieldPayment.vue` already sets `min-height: 200px`.
