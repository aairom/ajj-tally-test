# Embedding Guide — AJJ Custom Form Solution

This document specifies exactly how a developer on a host website loads, configures, and interacts with an embedded AJJ form.

---

## 1. One-Time Script Inclusion

Add the following `<script>` tag **once** to the host page — ideally in the `<head>` or just before the closing `</body>` tag:

```html
<script src="https://forms.ajj.com/embed.js" defer></script>
```

This script registers the `<ajj-form>` custom element globally in the browser. It only needs to be included once per page, regardless of how many forms appear on that page.

---

## 2. Inline Embed (Standard)

The form renders in-place in the document flow wherever `<ajj-form>` is placed.

```html
<ajj-form
  form-id="abc123"
  mode="inline"
  dynamic-height="true"
  hide-title="false"
  align="center"
  transparent-bg="false"
></ajj-form>
```

### Attribute Reference — All Modes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `form-id` | `string` | — | **Required.** Unique identifier of the form to render. |
| `mode` | `"inline"` \| `"popup"` \| `"fullpage"` | `"inline"` | Rendering mode. |
| `height` | `number` (px) | `500` | Fixed height in pixels. Used when `dynamic-height` is `false`. |
| `dynamic-height` | `boolean` | `true` | Auto-adjusts height to fit form content. Eliminates scrollbars. |
| `hide-title` | `boolean` | `false` | Suppresses the form title at the top of the embed. |
| `align` | `"center"` \| `"left"` | `"center"` | Horizontal alignment of form content. |
| `transparent-bg` | `boolean` | `false` | Removes the white background; form inherits host-page background. |
| `prefill` | `JSON string` | — | Key-value pairs to pre-populate fields. See Section 5. |
| `language` | `string` | `"en"` | ISO 639-1 language code for UI strings (e.g. `"fr"`, `"de"`). |

---

## 3. Popup Embed

The form opens as a floating overlay modal. Two ways to trigger it:

### Option A — Declarative Trigger (No JavaScript Required)

Any element with a `data-ajj-form` attribute automatically becomes a click trigger:

```html
<button data-ajj-form="abc123" data-ajj-mode="popup">
  Open Contact Form
</button>
```

### Option B — Programmatic JavaScript API

```html
<script>
  // Open the popup
  window.AJJForms.open('abc123');

  // Close the popup
  window.AJJForms.close('abc123');
</script>
```

### Popup-Specific Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `overlay-color` | `string` | `"rgba(0,0,0,0.5)"` | CSS colour value for the overlay background. |
| `auto-open` | `number` | — | Delay in milliseconds before the popup opens automatically (e.g. `3000` = 3 seconds). |
| `close-on-submit` | `boolean` | `true` | Automatically closes the popup on successful submission. |

---

## 4. Full-Page Embed

The form fills the entire viewport. Place `<ajj-form>` as the primary content inside `<body>`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Contact Us</title>
  <script src="https://forms.ajj.com/embed.js" defer></script>
</head>
<body>
  <ajj-form
    form-id="abc123"
    mode="fullpage"
    transparent-bg="true"
  ></ajj-form>
</body>
</html>
```

---

## 5. Pre-filling Fields

### Via URL Query Parameters (Automatic)

Any URL query parameter whose key matches a field name or hidden field key is automatically forwarded to the form — no configuration required.

**Example:**

```
https://example.com/contact?email=alice@example.com&ref=newsletter
```

If the form has a field named `email` and a hidden field with key `ref`, both will be pre-filled automatically.

### Via the `prefill` Attribute

```html
<ajj-form
  form-id="abc123"
  prefill='{"email": "alice@example.com", "source": "homepage-cta"}'
></ajj-form>
```

The `prefill` value must be a valid JSON string with field names or hidden field keys as keys.

---

## 6. JavaScript Events API

Subscribe to form lifecycle events from the host page.

### Syntax

```javascript
window.AJJForms.on(eventName, formId, callbackFn);
```

### Available Events

| Event | Callback Payload | When It Fires |
|---|---|---|
| `ready` | `{ formId: string }` | Form schema is loaded and the form is rendered in the DOM. |
| `page-change` | `{ formId: string, pageIndex: number, totalPages: number }` | Respondent navigates to a new page (multi-step forms). |
| `submit` | `{ formId: string, submissionId: string, data: object }` | Form has been submitted successfully to the backend. |
| `error` | `{ formId: string, message: string }` | A submission error occurred (network failure, server error). |
| `close` | `{ formId: string }` | Popup was dismissed without submitting the form. |

### Example — Analytics Integration

```javascript
window.AJJForms.on('submit', 'abc123', function(payload) {
  // Google Analytics 4
  gtag('event', 'form_submit', {
    form_id: payload.formId,
    submission_id: payload.submissionId
  });
});

window.AJJForms.on('ready', 'abc123', function() {
  console.log('Form is ready');
});
```

### Example — Redirect After Submission

```javascript
window.AJJForms.on('submit', 'abc123', function() {
  window.location.href = '/thank-you';
});
```

---

## 7. Multiple Forms on the Same Page

Multiple `<ajj-form>` elements can appear on the same page. Each is a completely isolated Web Component instance with its own Shadow DOM:

```html
<!-- Inline contact form -->
<ajj-form form-id="contact-form" mode="inline"></ajj-form>

<!-- Hidden popup newsletter form -->
<ajj-form form-id="newsletter-form" mode="popup"></ajj-form>

<!-- Trigger button for the newsletter popup -->
<button data-ajj-form="newsletter-form" data-ajj-mode="popup">
  Subscribe to Newsletter
</button>
```

---

## 8. Configuration Summary

| Feature | How to Configure | Notes |
|---|---|---|
| Form identity | `form-id` attribute | Required on every `<ajj-form>` |
| Render mode | `mode` attribute | `inline` (default), `popup`, `fullpage` |
| Dynamic height | `dynamic-height="true"` | Recommended for inline embeds |
| Hide title | `hide-title="true"` | |
| Transparent background | `transparent-bg="true"` | Use on coloured host pages |
| Field pre-fill | `prefill` attribute or URL params | URL params are automatically forwarded |
| Auto-open popup | `auto-open="3000"` | Value in milliseconds |
| Open popup via JS | `AJJForms.open('formId')` | |
| Close popup via JS | `AJJForms.close('formId')` | |
| Declarative trigger | `data-ajj-form="formId"` on any element | Requires no JavaScript |
| Event subscription | `AJJForms.on(event, formId, fn)` | See Section 6 |
| Language | `language="fr"` | ISO 639-1 code |

---

## 9. Content Security Policy (CSP) Compatibility

The embed script is designed to work within standard CSP headers. It does **not** use:
- `eval()` or `new Function()`
- Inline `onclick` or other inline event handlers
- `document.write()`
- Unsafe `innerHTML` assignment with untrusted content

Minimum CSP directives required on the host page:

```
script-src 'self' https://forms.ajj.com;
frame-src https://forms.ajj.com;
connect-src https://forms.ajj.com;
```

---

## 10. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Form does not render | `form-id` is incorrect or the form is not published | Verify the form ID in the admin panel and confirm the form is published |
| Styles look broken | Host page CSS overriding embed | Use `transparent-bg="false"` or check Shadow DOM isolation in browser DevTools |
| Form height is clipped | `dynamic-height` is not set | Add `dynamic-height="true"` to the `<ajj-form>` element |
| Popup does not open | JavaScript API called before embed script loaded | Ensure `<script defer>` has finished loading before calling `AJJForms.open()` |
| Submission fails with 403 | Host domain not in the form's allowed origins | Add the host domain to the form's allowed origins in the admin panel |
| URL params not pre-filling | Param key does not match field name | Ensure hidden field key or field name exactly matches the query parameter name |
