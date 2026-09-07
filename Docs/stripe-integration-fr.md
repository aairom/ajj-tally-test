# Intégration des paiements Stripe — AJJ Custom Form Solution

> **Portée du document :** Ce guide explique comment ajouter la collecte de paiements Stripe au moteur d'intégration AJJ (Web Component Vue 3 / build Vite IIFE) et à son API backend Node.js/Express. Il est autonome — un développeur peut le suivre sans consulter aucun autre document du projet.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Options d'approche](#3-options-dapproche)
4. [Installation et configuration](#4-installation-et-configuration)
5. [Implémentation du composable Vue.js](#5-implémentation-du-composable-vuejs)
6. [Endpoint backend](#6-endpoint-backend)
7. [Exemple d'intégration dans un composant](#7-exemple-dintégration-dans-un-composant)
8. [Variables d'environnement](#8-variables-denvironnement)
9. [Considérations de sécurité](#9-considérations-de-sécurité)
10. [Tests](#10-tests)
11. [Résolution des problèmes courants](#11-résolution-des-problèmes-courants)

---

## 1. Vue d'ensemble

AJJ-Tally affiche des formulaires sous la forme d'un Web Component Vue 3 intégré via une seule balise `<script>`. Les formulaires peuvent conditionner la soumission à une étape de paiement — en débitant un montant fixe avant de persister la soumission dans PostgreSQL.

Ce guide ajoute un type de champ `PAYMENT` qui :

1. Crée un Payment Intent sur le **backend Node.js/Express** (`POST /api/payments/create-intent`) en utilisant la clé secrète Stripe — le montant et la devise ne transitent jamais par le navigateur.
2. Monte **Stripe Elements** à l'intérieur du Shadow DOM pour la saisie sécurisée de la carte, conforme PCI.
3. Confirme le paiement avec `stripe.confirmPayment()` depuis le SDK navigateur `@stripe/stripe-js`.
4. Transmet l'identifiant `paymentIntentId` obtenu comme valeur d'un champ caché vers le pipeline de soumission normal (`POST /api/submissions`).

L'intégration s'appuie sur le composable existant `useSubmission` — la confirmation du paiement se fait dans son propre composable `useStripe` avant que `useSubmission` ne soit déclenché.

---

## 2. Prérequis

### Outils et environnement d'exécution

| Outil | Version minimale | Rôle |
|---|---|---|
| Node.js | 20.x LTS | API backend et build de l'intégration |
| npm | 10.x | Gestion des dépendances |
| Vue 3 | 3.4+ | Moteur d'intégration (déjà en place) |
| Vite | 5.x | Bundler de l'intégration (déjà en place) |

### Compte Stripe

1. Créez un compte gratuit sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Dans le Dashboard → **Développeurs → Clés API**, copiez :
   - La **clé publiable** (`pk_test_…`) — utilisée dans le navigateur.
   - La **clé secrète** (`sk_test_…`) — utilisée uniquement côté backend.
3. Dans le Dashboard → **Développeurs → Webhooks**, créez un endpoint pointant vers `https://votre-api.example.com/api/payments/webhook` et copiez le **secret de signature du webhook** (`whsec_…`).

### Variables d'environnement

Les trois valeurs suivantes doivent être présentes dans votre fichier `.env` avant de démarrer la stack :

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET
```

> **Ne commitez jamais de vraies clés.** Ajoutez les trois dans `.env` (ignoré par git). Mettez à jour `.env.example` avec les noms de variables et des descriptions en guise de valeurs indicatives.

---

## 3. Options d'approche

Deux approches d'intégration sont disponibles. Les deux sont décrites ci-dessous ; **l'approche B (composable Vue) est recommandée** pour ce projet.

---

### Approche A — Serveur MCP Stripe

Le **serveur MCP (Model Context Protocol) de Stripe** est un outil optionnel disponible dans les environnements de développement assistés par IA (par exemple Cursor, Claude Dev, IBM Bob). Il expose les opérations de l'API Stripe sous forme d'outils appelables, permettant à un agent IA de créer des produits, des prix et des Payment Intents de manière programmatique pendant le développement, sans écrire d'appels API manuellement.

**Quand l'utiliser :**  
Utile lors du scaffolding — par exemple, demander à l'agent IA de créer un produit et un prix de test dans votre compte Stripe, ou de récupérer des identifiants de prix existants, sans quitter l'éditeur.

**Configuration :**

Ajoutez le serveur MCP Stripe à votre `.bob/mcp.json` (ou l'équivalent pour votre outil IA) :

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

Une fois enregistré, l'agent IA peut appeler des outils tels que `stripe_create_payment_intent`, `stripe_list_products` et `stripe_retrieve_customer` directement dans le chat. Il s'agit d'une **commodité réservée au développement** — elle ne remplace pas l'intégration au moment de l'exécution décrite dans l'approche B.

**Limitations :**  
- Le serveur MCP nécessite Node.js et un accès réseau à l'API Stripe.
- Il fonctionne en dehors du runtime de l'application ; il ne peut pas être appelé depuis des composants Vue ou des handlers de routes Express.
- Tous les flux de paiement en production doivent utiliser l'endpoint backend décrit dans la [Section 6](#6-endpoint-backend).

---

### Approche B — Composable Vue.js `useStripe` ✅ Recommandée

Un composable Vue 3 autonome (`useStripe.ts`) placé dans `embed/src/composables/` aux côtés des composables existants (`useFormState`, `useSubmission`, etc.). Il suit les mêmes conventions de l'API de Composition déjà utilisées dans l'ensemble du projet.

**Pourquoi cette approche est recommandée :**
- S'exécute entièrement dans le runtime de l'intégration — pas de dépendance à un outillage externe.
- Fonctionne dans tous les environnements de déploiement (développement, staging, production).
- S'intègre naturellement avec les composables `useFormState` et `useSubmission` existants.
- Compatible Shadow DOM : Stripe Elements se monte dans un `<div>` ref ordinaire, ce qui fonctionne à l'intérieur du Shadow DOM.

Les détails complets d'implémentation se trouvent en [Section 5](#5-implémentation-du-composable-vuejs).

---

## 4. Installation et configuration

### 4.1 Widget d'intégration (`embed/`)

Installez le SDK navigateur Stripe.js :

```bash
cd embed
npm install @stripe/stripe-js
```

Ce package fournit des wrappers TypeScript autour de `window.Stripe` et est compatible avec le tree-shaking. Il ne bundle **pas** le script Stripe.js lui-même — il le charge depuis `https://js.stripe.com/v3/` au moment de l'exécution, ce qui est requis pour la conformité PCI.

### 4.2 API backend (`api/`)

Installez le SDK Node.js de Stripe :

```bash
cd api
npm install stripe
```

Les types TypeScript sont inclus dans le package (le package `@types/stripe` n'est pas nécessaire).

### 4.3 Migration de base de données

Ajoutez une colonne à la table `submissions` pour stocker l'identifiant du Payment Intent :

```sql
-- api/src/db/migrations/004_add_payment_intent_to_submissions.sql
ALTER TABLE submissions
  ADD COLUMN payment_intent_id TEXT,
  ADD COLUMN payment_status    TEXT DEFAULT 'none';
```

Exécutez la migration :

```bash
cd api
npm run db:migrate
```

---

## 5. Implémentation du composable Vue.js

Créez le fichier `embed/src/composables/useStripe.ts` :

```typescript
// embed/src/composables/useStripe.ts
// Gère le cycle de vie complet du paiement Stripe dans le moteur AJJ.

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
  /** Montant dans la plus petite unité monétaire (ex. centimes pour EUR). */
  amount: number
  /** Code de devise ISO 4217 en minuscules (ex. "eur", "usd"). */
  currency: string
  /** Description affichée dans le Dashboard Stripe pour ce paiement. */
  description?: string
  /** URL de base de l'API backend AJJ (ex. "https://api.ajj.com"). */
  apiBaseUrl?: string
}

export interface UseStripeReturn {
  /** À appeler une seule fois pour créer le Payment Intent et monter l'interface Elements. */
  initPayment: (mountTarget: HTMLElement) => Promise<void>
  /** À appeler lors de la soumission du formulaire pour confirmer le paiement. */
  confirmPayment: (returnUrl: string) => Promise<{ paymentIntentId: string }>
  /** Vrai lorsqu'une opération asynchrone est en cours. */
  isLoading: Ref<boolean>
  /** Non nul si une erreur s'est produite à n'importe quelle étape. */
  error: Ref<string | null>
  /** L'identifiant du Payment Intent renvoyé par le backend après création. */
  paymentIntentId: Ref<string | null>
  /** Vrai une fois le paiement confirmé avec succès. */
  paymentConfirmed: Ref<boolean>
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useStripe(options: UseStripeOptions): UseStripeReturn {
  const {
    amount,
    currency,
    description = 'Paiement formulaire AJJ',
    apiBaseUrl = '',
  } = options

  // ── État réactif ──────────────────────────────────────────────────────────
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const paymentIntentId = ref<string | null>(null)
  const paymentConfirmed = ref(false)

  // ── Objets Stripe internes ────────────────────────────────────────────────
  let stripe: Stripe | null = null
  let elements: StripeElements | null = null
  let paymentElement: StripePaymentElement | null = null
  let clientSecret: string | null = null

  // ── Étape 1 : Charger Stripe.js et initialiser le SDK ────────────────────
  async function loadStripeInstance(): Promise<Stripe> {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string
    if (!publishableKey) {
      throw new Error(
        'VITE_STRIPE_PUBLISHABLE_KEY n\'est pas définie. ' +
        'Ajoutez-la à votre fichier .env et redémarrez le serveur de développement.'
      )
    }
    const instance = await loadStripe(publishableKey)
    if (!instance) {
      throw new Error(
        'Stripe.js n\'a pas pu se charger. Vérifiez votre connexion réseau et que ' +
        'https://js.stripe.com n\'est pas bloqué.'
      )
    }
    return instance
  }

  // ── Étape 2 : Créer un Payment Intent côté backend ────────────────────────
  async function createPaymentIntent(): Promise<{ clientSecret: string; intentId: string }> {
    const response = await fetch(`${apiBaseUrl}/api/payments/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, description }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(
        body.message ?? `Le backend a retourné HTTP ${response.status} lors de la création du Payment Intent.`
      )
    }

    const data = await response.json()
    return { clientSecret: data.clientSecret, intentId: data.paymentIntentId }
  }

  // ── Étape 3 : Monter l'interface Stripe Elements ──────────────────────────
  async function mountElements(mountTarget: HTMLElement, secret: string): Promise<void> {
    if (!stripe) throw new Error('Instance Stripe non disponible.')

    elements = stripe.elements({
      clientSecret: secret,
      appearance: {
        theme: 'stripe',
        variables: {
          // Correspond à la couleur primaire par défaut du formulaire AJJ.
          // Peut être remplacée via les propriétés CSS personnalisées du thème.
          colorPrimary: '#0066FF',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: '6px',
        },
      },
    })

    paymentElement = elements.create('payment', {
      layout: { type: 'tabs', defaultCollapsed: false },
    })

    // Monte dans le nœud DOM fourni (fonctionne à l'intérieur du Shadow DOM).
    paymentElement.mount(mountTarget)

    // Remonte immédiatement les erreurs de validation des champs Stripe.
    paymentElement.on('change', (event) => {
      error.value = event.error?.message ?? null
    })
  }

  // ── Public : initPayment ──────────────────────────────────────────────────
  /**
   * Crée le Payment Intent et monte l'interface Stripe Elements dans
   * l'élément DOM fourni. À appeler dans le hook `onMounted` du composant
   * ou lorsque l'étape de paiement devient visible.
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
      error.value = err instanceof Error ? err.message : 'Échec de l\'initialisation du paiement.'
    } finally {
      isLoading.value = false
    }
  }

  // ── Public : confirmPayment ───────────────────────────────────────────────
  /**
   * Soumet les détails de la carte à Stripe et confirme le paiement.
   * En cas de succès, résout avec l'identifiant du Payment Intent à stocker
   * dans la soumission.
   * En cas d'échec, définit `error` et relance l'erreur pour que le composant
   * appelant puisse réagir.
   *
   * @param returnUrl - URL absolue vers laquelle Stripe redirige après
   *                    l'authentification 3DS. Généralement l'URL de la page actuelle.
   */
  async function confirmPayment(returnUrl: string): Promise<{ paymentIntentId: string }> {
    if (!stripe || !elements || !clientSecret) {
      throw new Error('Paiement non initialisé. Appelez initPayment() d\'abord.')
    }

    isLoading.value = true
    error.value = null

    try {
      // Déclenche d'abord la validation d'Elements.
      const { error: submitError } = await elements.submit()
      if (submitError) {
        error.value = submitError.message ?? 'La validation de la carte a échoué.'
        throw new Error(error.value)
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required', // Évite la redirection pour les cartes sans 3DS.
      })

      if (confirmError) {
        error.value = confirmError.message ?? 'La confirmation du paiement a échoué.'
        throw new Error(error.value)
      }

      if (paymentIntent?.status === 'succeeded') {
        paymentConfirmed.value = true
        return { paymentIntentId: paymentIntent.id }
      }

      // Gère les statuts 'requires_action', 'processing' ou inattendus.
      throw new Error(`Statut du paiement : ${paymentIntent?.status ?? 'inconnu'}. Veuillez réessayer.`)
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

## 6. Endpoint backend

Créez le fichier `api/src/routes/payments.ts` :

```typescript
// api/src/routes/payments.ts
// Endpoint de création du Payment Intent Stripe.
// La clé secrète ne quitte JAMAIS le serveur.

import { Router, type Request, type Response } from 'express'
import Stripe from 'stripe'

const router = Router()

// Initialise le SDK Stripe une seule fois au chargement du module.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// ── POST /api/payments/create-intent ─────────────────────────────────────────
// Crée un Payment Intent et ne retourne au navigateur que le client_secret.
// La clé secrète n'est jamais exposée au client.
router.post('/create-intent', async (req: Request, res: Response) => {
  const { amount, currency, description } = req.body as {
    amount: number
    currency: string
    description?: string
  }

  // Validation côté serveur.
  if (typeof amount !== 'number' || amount < 50) {
    return res.status(400).json({ message: 'amount doit être un nombre ≥ 50 (plus petite unité monétaire).' })
  }
  const devisesAcceptees = ['eur', 'usd', 'gbp', 'cad', 'aud', 'chf', 'jpy']
  if (!devisesAcceptees.includes(currency?.toLowerCase())) {
    return res.status(400).json({ message: `currency doit être l'une de : ${devisesAcceptees.join(', ')}.` })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,                              // ex. 2500 = 25,00 EUR
      currency: currency.toLowerCase(),
      description: description ?? 'Paiement formulaire AJJ',
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
      : 'Impossible de créer le Payment Intent.'
    return res.status(500).json({ message })
  }
})

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// Reçoit les événements webhook Stripe et met à jour le payment_status
// de la soumission correspondante.
// Nécessite le corps brut de la requête pour la vérification de la signature.
// Enregistrez cette route AVANT le middleware express.json() dans app.ts.
router.post(
  '/webhook',
  (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

    let event: Stripe.Event

    try {
      // req.body doit être un Buffer brut avec express.raw().
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Échec de la vérification de la signature webhook.'
      console.error('[Stripe Webhook] Erreur de signature :', message)
      return res.status(400).json({ message })
    }

    // Traitement des événements pertinents.
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        // TODO : UPDATE submissions SET payment_status = 'succeeded'
        //        WHERE payment_intent_id = intent.id
        console.log(`[Stripe Webhook] Paiement réussi : ${intent.id}`)
        break
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        console.warn(`[Stripe Webhook] Paiement échoué : ${intent.id}`)
        break
      }
      default:
        // Les types d'événements non gérés sont silencieusement ignorés.
        break
    }

    // Accusé de réception immédiat ; le traitement asynchrone se fait en arrière-plan.
    return res.status(200).json({ received: true })
  }
)

export default router
```

**Enregistrez les routes dans `api/src/app.ts` :**

```typescript
// api/src/app.ts (extrait — ajoutez ces lignes)
import express from 'express'
import paymentsRouter from './routes/payments'

const app = express()

// La route webhook nécessite le corps brut pour la vérification de la signature.
// À enregistrer AVANT le middleware global express.json().
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsRouter
)

// Parseur JSON global (pour toutes les autres routes).
app.use(express.json())

// Toutes les autres routes de paiement...
app.use('/api/payments', paymentsRouter)
```

---

## 7. Exemple d'intégration dans un composant

Créez le fichier `embed/src/components/fields/FieldPayment.vue` :

```vue
<!-- embed/src/components/fields/FieldPayment.vue -->
<!-- Affiche l'étape de paiement Stripe dans le formulaire AJJ. -->
<!-- S'intègre avec useStripe et signale la complétion à useFormState. -->

<template>
  <div class="ajj-payment-field">
    <!-- Libellé et description du champ (modèle standard AJJ) -->
    <label class="ajj-field-label">
      {{ field.label }}
      <span v-if="field.required" class="ajj-required" aria-hidden="true">*</span>
    </label>
    <p v-if="field.description" class="ajj-field-description">
      {{ field.description }}
    </p>

    <!-- Récapitulatif du paiement -->
    <div class="ajj-payment-summary">
      <span class="ajj-payment-amount">
        {{ montantFormate }}
      </span>
    </div>

    <!-- Point de montage de Stripe Elements.
         Un div ref ordinaire fonctionne à l'intérieur du Shadow DOM —
         Stripe y monte une iframe. -->
    <div
      ref="stripeMount"
      class="ajj-stripe-mount"
      :class="{ 'ajj-stripe-mount--loading': isLoading }"
    />

    <!-- Indicateur de chargement affiché pendant le chargement de Stripe Elements -->
    <div v-if="isLoading" class="ajj-payment-loading" role="status" aria-live="polite">
      <span class="ajj-spinner" aria-hidden="true" />
      <span>Chargement du formulaire de paiement…</span>
    </div>

    <!-- Message d'erreur (validation des champs Stripe ou erreurs réseau) -->
    <p
      v-if="error"
      class="ajj-payment-error"
      role="alert"
      aria-live="assertive"
    >
      {{ error }}
    </p>

    <!-- Confirmation de succès (affichée une fois confirmPayment résolu) -->
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
      Paiement confirmé — votre formulaire va être soumis.
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
      /** Montant du paiement dans la plus petite unité monétaire (ex. centimes). */
      amount: number
      /** Code de devise ISO 4217 en minuscules (ex. "eur"). */
      currency: string
      /** Description lisible affichée dans le Dashboard Stripe. */
      description?: string
    }
  }
}>()

// ── Injection de l'état partagé du formulaire (modèle standard AJJ) ───────────
// FormWidget.vue expose setFieldValue via provide() ; tous les composants de
// champ l'injectent de la même façon pour écrire leur valeur dans le Map partagé.
const setFieldValue = inject<(fieldId: string, value: unknown) => void>('setFieldValue')

// ── Refs locaux ───────────────────────────────────────────────────────────────
const stripeMount = ref<HTMLElement | null>(null)

// ── Composable Stripe ─────────────────────────────────────────────────────────
const { initPayment, confirmPayment, isLoading, error, paymentIntentId, paymentConfirmed } =
  useStripe({
    amount: props.field.config.amount,
    currency: props.field.config.currency,
    description: props.field.config.description,
    // apiBaseUrl prend la valeur '' par défaut (même origine).
    // À surcharger pour les configurations cross-origin :
    // apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  })

// ── Montant formaté pour l'affichage ─────────────────────────────────────────
const montantFormate = computed(() => {
  const { amount, currency } = props.field.config
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
})

// ── Cycle de vie : montage de Stripe Elements à l'initialisation du composant ──
onMounted(async () => {
  if (!stripeMount.value) return
  await initPayment(stripeMount.value)
})

// ── Méthode exposée : appelée par FormNavigation.vue avant la soumission ───────
// FormWidget.vue appelle cette méthode sur le champ de paiement actif avant
// d'appeler useSubmission.submit() — elle confirme le paiement et stocke
// l'identifiant du Payment Intent comme valeur du champ dans l'état partagé.
async function processPayment(): Promise<boolean> {
  try {
    const returnUrl = window.location.href
    const { paymentIntentId: intentId } = await confirmPayment(returnUrl)
    // Écrit l'identifiant du Payment Intent dans l'état partagé du formulaire
    // afin qu'il soit inclus dans le payload POST /api/submissions.
    setFieldValue?.(props.field.id, intentId)
    return true
  } catch {
    // Le ref error est déjà défini par le composable ; le template l'affiche.
    return false
  }
}

// Exposé pour que les composants parents (FormNavigation, FormWidget) puissent l'appeler.
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

### Enregistrer le champ dans `fieldRegistry.ts`

```typescript
// embed/src/utils/fieldRegistry.ts (extrait)
import FieldPayment from '../components/fields/FieldPayment.vue'
import { FieldTypeEnum } from '../types/fields'

// Ajouter à la Map du registre existant :
fieldRegistry.set(FieldTypeEnum.PAYMENT, FieldPayment)
```

### Ajouter `PAYMENT` à `FieldTypeEnum`

```typescript
// embed/src/types/fields.ts (extrait)
export enum FieldTypeEnum {
  // … valeurs existantes …
  PAYMENT = 'PAYMENT',
}
```

---

## 8. Variables d'environnement

Ajoutez les lignes suivantes dans `.env` (copiez depuis `.env.example`) :

```bash
# ─── Stripe ──────────────────────────────────────────────────────────────────
# Clé secrète backend — ne jamais l'exposer au navigateur.
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY

# Secret de signature du webhook — obtenu dans le Dashboard Stripe → Webhooks.
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET

# ─── Embed (Vite) ────────────────────────────────────────────────────────────
# Clé publiable — sûre à exposer ; injectée dans le bundle navigateur.
# Doit être préfixée par VITE_ pour être exposée par Vite via import.meta.env.
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
```

Mettez à jour `.env.example` avec les mêmes noms de variables et des descriptions indicatives :

```bash
# ─── Stripe ──────────────────────────────────────────────────────────────────
# À obtenir sur : https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_REMPLACEZ_PAR_VOTRE_CLE_SECRETE
STRIPE_WEBHOOK_SECRET=whsec_REMPLACEZ_PAR_VOTRE_SECRET_WEBHOOK
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_REMPLACEZ_PAR_VOTRE_CLE_PUBLIABLE
```

### Référence complète des variables

| Variable | Utilisée dans | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | `api/` uniquement | Clé secrète Stripe. Crée les Payment Intents. Ne doit jamais être envoyée au navigateur. |
| `STRIPE_WEBHOOK_SECRET` | `api/` uniquement | Secret de signature pour `constructEvent()`. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `embed/` uniquement | Clé publiable passée à `loadStripe()`. Peut être exposée en toute sécurité dans le bundle navigateur. |

---

## 9. Considérations de sécurité

### Ne jamais exposer la clé secrète

La clé secrète Stripe (`sk_…`) ne doit exister que dans le code côté serveur et les variables d'environnement. Elle est utilisée exclusivement dans `api/src/routes/payments.ts`. Elle ne doit jamais apparaître dans :

- N'importe quel fichier dans `embed/src/`
- N'importe quel fichier `.env` commité dans Git
- Des appels `fetch` côté client ou des en-têtes de requête

### HTTPS obligatoire

Stripe.js refuse de se charger sur des origines non-HTTPS en production. Assurez-vous que :

- Le moteur d'intégration est servi depuis une URL `https://`.
- L'API backend utilise TLS en production (reverse proxy : nginx / Caddy / Cloudflare).
- La variable `ALLOWED_ORIGINS` ne liste que des origines `https://` (déjà appliqué par le middleware `originCheck.ts` existant).

### Vérification de la signature des webhooks

Chaque événement webhook arrivant sur `POST /api/payments/webhook` doit être vérifié avec `stripe.webhooks.constructEvent()` avant toute action. Cela prévient les attaques par rejeu et les événements falsifiés. Le corps brut de la requête (Buffer) est requis — ne le parsez pas avec `express.json()` avant cette route.

### Validation du montant côté serveur

Validez toujours le `amount` côté backend. Ne faites jamais confiance au montant envoyé par le navigateur. Pour les formulaires à prix fixe, déduisez le montant attendu depuis le schéma du formulaire stocké dans PostgreSQL plutôt que de l'accepter depuis le corps de la requête :

```typescript
// Recommandé : récupérez le montant attendu depuis le schéma du formulaire
const formulaire = await formService.getById(formId)
const montantAttendu = formulaire.settings.paymentAmount
// Utilisez montantAttendu, pas req.body.amount
```

### En-têtes CSP

Ajoutez `https://js.stripe.com` aux directives `script-src` et `frame-src` de votre Content-Security-Policy. Stripe Elements s'affiche dans une iframe hébergée sur `js.stripe.com` :

```
Content-Security-Policy: script-src 'self' https://js.stripe.com; frame-src https://js.stripe.com;
```

### Limitation de débit

L'endpoint `/api/payments/create-intent` crée des objets Stripe facturables. Appliquez le rate limiter Redis existant (`rateLimit.ts`) à cette route avec une limite conservative (ex. 3 requêtes / IP / minute).

---

## 10. Tests

### Mode test

Toutes les clés commençant par `sk_test_` / `pk_test_` fonctionnent en mode test Stripe. Aucun débit réel n'est effectué. Les données du mode test sont isolées du mode live et n'apparaissent pas sur les tableaux de bord en direct.

### Numéros de cartes de test

Utilisez ces numéros de carte avec n'importe quelle date d'expiration future (ex. `12/26`) et n'importe quel CVC à 3 chiffres (ex. `123`) :

| Numéro de carte | Scénario |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi immédiatement |
| `4000 0025 0000 3155` | Authentification 3D Secure requise |
| `4000 0000 0000 9995` | Paiement toujours refusé (fonds insuffisants) |
| `4100 0000 0000 0019` | Carte bloquée (fraude détectée) |
| `4000 0000 0000 0002` | Refus générique |

Pour le code postal (cartes US), utilisez n'importe quelle valeur à 5 chiffres (ex. `75001`).

### Vérification d'un flux de paiement réussi

1. Démarrez la stack : `./scripts/start.sh`
2. Ouvrez une page de test avec un `<ajj-form>` qui inclut un champ `PAYMENT`.
3. Saisissez la carte `4242 4242 4242 4242`, une date d'expiration future, n'importe quel CVC.
4. Soumettez le formulaire.
5. Dans le Dashboard Stripe → **Paiements**, le Payment Intent doit apparaître avec le statut `Succeeded`.
6. Dans PostgreSQL, la ligne `submissions` doit avoir `payment_intent_id` et `payment_status = 'succeeded'`.

### Tests unitaires (Vitest)

```typescript
// embed/src/composables/__tests__/useStripe.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStripe } from '../useStripe'

// Mock de @stripe/stripe-js
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

// Mock du fetch backend
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

  it('s\'initialise avec un état inactif', () => {
    const { isLoading, error, paymentConfirmed } = useStripe({
      amount: 2500,
      currency: 'eur',
    })
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(paymentConfirmed.value).toBe(false)
  })

  it('définit paymentIntentId après initPayment', async () => {
    const { initPayment, paymentIntentId } = useStripe({
      amount: 2500,
      currency: 'eur',
    })
    const div = document.createElement('div')
    await initPayment(div)
    expect(paymentIntentId.value).toBe('pi_test_123')
  })
})
```

### Test des webhooks avec la CLI Stripe

Installez la CLI Stripe et redirigez les événements vers votre API locale :

```bash
# Installation (macOS)
brew install stripe/stripe-cli/stripe

# Connexion
stripe login

# Redirection des webhooks vers le serveur local
stripe listen --forward-to http://localhost:8090/api/payments/webhook

# Déclenchement d'un événement de test dans un terminal séparé
stripe trigger payment_intent.succeeded
```

La CLI affiche le secret de signature webhook pour les tests locaux (`whsec_…`). Définissez-le comme `STRIPE_WEBHOOK_SECRET` dans votre `.env`.

---

## 11. Résolution des problèmes courants

### `VITE_STRIPE_PUBLISHABLE_KEY n'est pas définie`

**Cause :** La variable d'environnement est absente ou le serveur de développement n'a pas été redémarré après son ajout.  
**Solution :** Ajoutez `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…` dans `.env` et relancez `npm run dev` dans le répertoire `embed/`.

### `Stripe.js n'a pas pu se charger`

**Cause :** `https://js.stripe.com` est bloqué par une CSP, une extension de navigateur ou un pare-feu d'entreprise.  
**Solution :** Ajoutez `https://js.stripe.com` à `script-src` et `frame-src` dans votre en-tête CSP. Si une extension de navigateur le bloque, testez en navigation privée avec les extensions désactivées.

### `No such payment_intent: pi_xxx` (404 de Stripe)

**Cause :** Le `clientSecret` a été créé en mode test mais la clé publiable utilisée est une clé de production (ou vice versa).  
**Solution :** Assurez-vous que `STRIPE_SECRET_KEY` et `VITE_STRIPE_PUBLISHABLE_KEY` proviennent du **même compte Stripe et du même mode** (tous deux `sk_test_`/`pk_test_` ou tous deux `sk_live_`/`pk_live_`).

### Le webhook retourne `400 Webhook Error: No signatures found`

**Cause :** Le corps brut de la requête n'est pas passé à `constructEvent()` — le middleware `express.json()` l'a consommé en premier.  
**Solution :** Assurez-vous que la route `/api/payments/webhook` est enregistrée dans `app.ts` **avant** le middleware global `express.json()`, en utilisant `express.raw({ type: 'application/json' })` uniquement sur cette route.

### `Integration Error: Invalid value for stripe.confirmPayment(): elements`

**Cause :** `confirmPayment()` a été appelé avant la fin de `initPayment()`, ou l'instance `elements` est `null`.  
**Solution :** Attendez que `initPayment()` se termine dans `onMounted` et désactivez le bouton de soumission (`isLoading.value === true`) jusqu'à ce que le composable soit prêt.

### Le paiement affiche `requires_action` et ne se finalise jamais

**Cause :** La carte nécessite l'authentification 3D Secure. Avec `redirect: 'if_required'`, Stripe tente de terminer le 3DS en ligne via une iframe. Si l'URL `returnUrl` n'est pas accessible publiquement (ex. `localhost`), le flux peut se bloquer.  
**Solution :** Utilisez `4242 4242 4242 4242` pour tester les flux sans 3DS. Pour tester le 3DS en développement, utilisez [ngrok](https://ngrok.com) pour exposer une URL publique et définissez-la comme `returnUrl`.

### Stripe Elements invisible dans le Shadow DOM

**Cause :** Un style CSS scopé ou l'isolation du Shadow DOM masque l'iframe Stripe.  
**Solution :** Stripe Elements s'affiche dans sa propre iframe et n'est pas affecté par les styles du Shadow DOM. Si le `<div>` de montage a `height: 0` ou `display: none`, définissez une `min-height` explicite (au moins `44px`). La classe `ajj-stripe-mount` dans `FieldPayment.vue` définit déjà `min-height: 200px`.
