#!/usr/bin/env node
// =============================================================================
//  AJJ-Tally — Stripe sample page test suite
//  File: samples/test.js
//
//  Usage:  node samples/test.js
//  Tests:  35 static assertions covering HTML structure, CSS correctness,
//          JS syntax, Stripe API contract, and UX requirements.
// =============================================================================

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html  = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
// Strip HTML comments before any regex matching to avoid false positives
const clean = html.replace(/<!--[\s\S]*?-->/g, '');

let pass = 0, fail = 0;
const ok  = label => { console.log('PASS  ' + label); pass++; };
const bad = label => { console.error('FAIL  ' + label); fail++; };
const chk = (cond, label) => cond ? ok(label) : bad(label);

// ── T01  HTML tag balance ─────────────────────────────────────────────────────
// SVG <path d="…"> attributes contain literal > characters that fool a naive
// tag regex. Strip SVG blocks entirely (they balance internally) before checking.
const noSvg = clean.replace(/<svg[\s\S]*?<\/svg>/g, '');
const voidEls = new Set([
  'area','base','br','col','embed','hr','img','input',
  'link','meta','param','source','track','wbr',
]);
const stack = [];
let tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\/?>/g;
let tm, htmlOk = true;
while ((tm = tagRe.exec(noSvg)) !== null) {
  const full = tm[0], name = tm[1].toLowerCase();
  if (full.endsWith('/>')) continue;  // self-closing — no stack change
  if (full.startsWith('</')) {
    if (!voidEls.has(name)) {
      if (stack.length && stack[stack.length - 1] === name) stack.pop();
      else { console.error('  T01 unexpected close </' + name + '>'); htmlOk = false; }
    }
  } else if (!voidEls.has(name)) {
    stack.push(name);
  }
}
chk(htmlOk && stack.length === 0, 'T01: HTML tag balance (' + stack.length + ' unclosed)');

// ── T02  Required element IDs ─────────────────────────────────────────────────
[
  'payment-form', 'cardholder-name', 'card-element',
  'pay-button', 'result', 'protocol-warning',
].forEach(id => chk(html.includes('id="' + id + '"'), 'T02: #' + id + ' present'));

// ── T03  Stripe CDN script tag — present, no defer ────────────────────────────
// defer would delay Stripe past the inline script's synchronous execution.
const cdnTag = clean.match(/<script\s[^>]*js\.stripe\.com[^>]*>/)?.[0] || '';
chk(!!cdnTag,                        'T03a: Stripe CDN <script> tag present');
chk(!cdnTag.includes('defer'),       'T03b: Stripe CDN tag has no defer attribute');

// ── T04  file:// protocol guard ───────────────────────────────────────────────
// Stripe.js refuses to mount iframes on file:// origins (browser security).
chk(html.includes("location.protocol === 'file:'"), 'T04a: file:// protocol detected');
chk(html.includes("style.display = 'block'"),       'T04b: #protocol-warning shown on file://');

// ── T05  Publishable key placeholder + throw guard ────────────────────────────
chk(html.includes('pk_test_YOUR_PUBLISHABLE_KEY'), 'T05a: placeholder key in source');
chk(html.includes('throw new Error'),              'T05b: throw stops execution on placeholder key');

// ── T06  Inline JS syntax (via vm.Script — no comment stripping) ──────────────
// vm.Script parses without executing, so no mocking of DOM/Stripe is needed.
// Wrapping in an async IIFE makes top-level await syntactically valid.
const jsRaw = clean.match(/<script>\s*([\s\S]+?)\s*<\/script>\s*<\/body>/)?.[1] || '';
chk(jsRaw.length > 500, 'T06a: Inline JS block extracted (len=' + jsRaw.length + ')');
try {
  new vm.Script('(async function(){\n' + jsRaw + '\n})');
  ok('T06b: Inline JS syntax valid');
} catch (e) {
  bad('T06b: JS syntax error — ' + e.message);
}

// ── T07  Single CardElement (not three split Elements) ────────────────────────
// The three-split-Element approach causes per-iframe height/sizing issues in
// local HTTP serving. A single `card` Element is simpler and self-sizing.
chk(html.includes("elements.create('card',"),        'T07a: Single CardElement created');
chk(!html.includes("create('cardNumber'"),           'T07b: No split cardNumber Element');
chk(html.includes("cardElement.mount('#card-element')"),'T07c: cardElement.mount() called');

// ── T08  #card-element CSS wrapper — correct isolation rules ──────────────────
// The wrapper must NOT have its own border/padding — Stripe's iframe draws those
// internally. The wrapper only needs min-height (iframe won't render at zero height)
// and overflow:hidden (to clip iframe border-radius).
const ceCSS = html.match(/#card-element\s*\{([^}]+)\}/)?.[1] || '';
chk(!ceCSS.includes('border:') && !ceCSS.includes('padding:'),
    'T08a: #card-element has no outer border/padding (no double-border)');
chk(ceCSS.includes('min-height'), 'T08b: #card-element has min-height (iframe cannot collapse)');
chk(ceCSS.includes('overflow'),   'T08c: #card-element has overflow:hidden');

// ── T09  Tokenization API ─────────────────────────────────────────────────────
chk(html.includes('createPaymentMethod'), 'T09: stripe.createPaymentMethod() called');

// ── T10  Error handling ───────────────────────────────────────────────────────
chk(html.includes('error.message'), 'T10: error.message shown on Stripe error');

// ── T11  Real-time change validation ─────────────────────────────────────────
// cardElement.on('change') surfaces field-level errors before submit.
chk(html.includes("cardElement.on('change'"), 'T11: real-time change event validation');

// ── T12  Loading state ────────────────────────────────────────────────────────
chk(
  html.includes('setLoading(true)') && html.includes('setLoading(false)'),
  'T12: setLoading toggled on submit'
);

// ── T13  Backend integration stub ────────────────────────────────────────────
chk(html.includes('/api/payments/create-intent'), 'T13: Backend POST stub comment present');

// ── T14  Form locked after success (no double-submit) ────────────────────────
chk(html.includes('cardElement.update({ disabled: true })'), 'T14: CardElement disabled after success');
chk(html.includes('payButton.disabled = true'),              'T15: Pay button disabled after success');

// ── T16  Cardholder name client-side validation ───────────────────────────────
chk(html.includes('nameEl.value') && html.includes('if (!name)'), 'T16: Cardholder name validated');

// ── T17  Form submit listener ────────────────────────────────────────────────
chk(html.includes("addEventListener('submit'"), 'T17: Submit event listener attached');

// ── T18  Helper functions defined ────────────────────────────────────────────
chk(
  html.includes('function showSuccess') && html.includes('function showError'),
  'T18: showSuccess and showError helpers defined'
);

// ── T19  Test card numbers documented in page ────────────────────────────────
chk(html.includes('4242 4242 4242 4242'), 'T19: Test card numbers shown on page');

// ── T20  ZIP/postal code field hidden ────────────────────────────────────────
chk(html.includes('hidePostalCode: true'), 'T20: Postal code field hidden (hidePostalCode)');

// ── T21  Success message preserves newlines ───────────────────────────────────
chk(html.includes('white-space: pre-wrap'), 'T21: pre-wrap on #result (newlines render)');

// ── T22  HTTP serving instructions present ───────────────────────────────────
// Stripe refuses to work on file:// — developers must be told how to serve.
chk(
  html.includes('npx serve') && html.includes('http.server'),
  'T22: HTTP serving instructions (npx serve / python http.server)'
);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('');
console.log('══════════════════════════════════════════════════════');
console.log('  ' + pass + ' passed  |  ' + fail + ' failed  |  ' + (pass + fail) + ' total');
console.log('══════════════════════════════════════════════════════');
process.exit(fail > 0 ? 1 : 0);
