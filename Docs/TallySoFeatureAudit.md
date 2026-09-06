# Tally.so Feature Audit — AJJ Custom Form Solution

This document records all Tally.so features observed from the platform's public documentation. It serves as the functional requirements baseline for the custom replacement.

---

## 1. Field Types (Input Blocks)

### Text and Number

| Field | Description | Config Options |
|---|---|---|
| Short answer | Single-line free text | Required, default value, placeholder |
| Long answer | Multi-line textarea | Required, default value, placeholder |
| Number | Numeric-only input | Required, number formatting, min/max |

### Contact Information

| Field | Description | Config Options |
|---|---|---|
| Email | Validated email address | Required, default value |
| Phone number | Formatted phone number | Required, country code |
| Link / URL | URL input with format validation | Required |
| Electronic signature | Canvas-based drawn signature | Required |

### Choice Fields

| Field | Description | Config Options |
|---|---|---|
| Multiple choice | Radio-button-style list | Single or multi-select, randomise options, add images to options |
| Dropdown | Single-select dropdown | Placeholder, default value, randomise options |
| Checkbox | Multi-selection checkbox list | Min/max selections, add images to options |
| Multi-select | Tag-style multi-select dropdown | Placeholder |
| Matrix / Likert | Grid of statements × response options | Row labels, column labels |
| Ranking | Drag-to-reorder preference list | Options list |

### Date and Time

| Field | Description | Config Options |
|---|---|---|
| Date picker | Calendar date selector | Disable specific dates, allow/disallow date ranges |
| Time picker | 24-hour clock time selector | Required |

### Rating and Scale

| Field | Description | Config Options |
|---|---|---|
| Star rating | Visual star selector | Number of stars (1–10) |
| Linear scale | Numeric scale | Min, max, step, start/end labels |
| NPS | 0–10 Net Promoter Score scale | Left/right labels; auto-calculates NPS score in Insights |
| CSAT | 1–5 Customer Satisfaction scale | Labels; auto-calculates CSAT score in Insights |

### Special Fields

| Field | Description | Config Options |
|---|---|---|
| File upload | Single or multiple file attachment | Allowed file types, max file size |
| Hidden field | Non-visible, pre-populated via URL params | Field key, default value |
| Calculated field | Variable computed from field expressions | Expression (supports arithmetic and conditional operations) |
| reCAPTCHA | Bot/spam protection block | Google reCAPTCHA v2 or v3 |
| Payment (Stripe) | Stripe-integrated payment collection | Amount, currency — **Not in Phase 1 scope** |

---

## 2. Content and Layout Blocks (Non-Input)

| Block | Description |
|---|---|
| Text / Heading | Rich-text content for instructions, section titles, labels |
| Divider | Horizontal visual separator between sections |
| Image | Upload, URL, or Unsplash-sourced image with caption and alt-text |
| Embed | Inline third-party content (YouTube, Calendly, Google Maps, PDF) |
| Columns | Two-column side-by-side layout for any block |
| Thank You page | Post-submission page with custom text, links, media, or redirect |

---

## 3. Conditional Logic

Tally's conditional logic is free and unlimited. Every logic block has an IF/THEN structure.

### Condition Matching

| Mode | Behaviour |
|---|---|
| `all` (AND) | Every condition must be true |
| `any` (OR) | At least one condition must be true |
| Nested groups | Groups of conditions with their own `all`/`any` setting, combinable |

### Supported Action Types

| Action | Description |
|---|---|
| Jump to page | Skip to a specific page; skip irrelevant questions or branch to a custom Thank You page |
| Calculate a value | Assign a computed value to a calculated field (score, price, message) |
| Make answer required | Dynamically enforce or release a field's required status |
| Show blocks | Reveal a hidden block when conditions are met |
| Hide blocks | Conceal a block when conditions are met |
| Hide button | Prevent form completion by hiding the Submit or Next button |
| Redirect to URL | Send the respondent to an external URL on completion |

---

## 4. Multi-Step Forms

- Forms are divided into named pages.
- Each page is a discrete step in the form flow.
- Navigation: "Next" and "Back" buttons between pages.
- Progress indicator: visual bar showing completion percentage.
- Conditional page skipping via "Jump to page" logic.
- Partial submissions can be saved on page advance.

---

## 5. Answer Piping

`@fieldName` tokens in question text, hint text, calculated field expressions, and the Thank You page are replaced at runtime with the respondent's current answer for that field.

**Examples:**
- "Thanks, @FirstName! We'll be in touch." — personalised greeting
- "Your total is @OrderTotal." — dynamic value display
- "You scored @QuizScore / 10." — quiz result summary

---

## 6. Validation Rules

| Rule | Applied To |
|---|---|
| Required | All field types |
| Email format | Email field |
| Phone format | Phone field |
| URL format | Link field |
| Numeric only | Number field |
| Allowed file types | File upload field |
| Date format | Date picker |
| Time format | Time picker |
| Min/max selections | Checkbox, multi-select |
| Number range | Number, linear scale |

---

## 7. Submission Handling

| Feature | Description |
|---|---|
| Response storage | All submissions stored server-side in Tally's database |
| Partial submissions | Configurable; captures data even if the form is not completed |
| Duplicate prevention | Configurable; prevents the same respondent from submitting more than once (cookie + IP) |
| Password protection | Access gate rendered before the form; requires a password to proceed |
| Data retention | Configurable period for how long submission data is stored |

---

## 8. Notifications

### Email Notifications

| Type | Description |
|---|---|
| Self notification | Notifies the form owner on every submission; body and subject support `@mention` field inserts |
| Respondent notification | Sends a confirmation email to the respondent's email address |
| Dynamic routing | Calculated field computes the `To:` address; routes to sales, support, or billing based on form answers |
| Dynamic body | Conditional logic and calculated fields produce personalised email bodies per respondent |

### Webhook Delivery

| Feature | Detail |
|---|---|
| Trigger | New form submission |
| Method | HTTP POST |
| Payload | JSON containing all field values, types, and labels |
| Signing | Optional SHA256 HMAC signature in `Tally-Signature` header |
| Custom headers | Optional key-value HTTP headers per webhook |
| Retry schedule | 5 min → 30 min → 1 hr → 6 hr → 1 day (5 attempts total) |
| Event log | Full delivery history viewable per webhook |

---

## 9. Integrations

### Native Direct Integrations
- Notion
- Google Sheets
- Airtable
- Slack
- Coda

### Automation Platform Integrations
- Zapier
- Make (formerly Integromat)
- Integrately
- Pipedream
- ApiX-Drive

### Developer Integrations
- REST API
- Webhooks
- MCP (Model Context Protocol) server

---

## 10. Theming and Customisation

| Feature | Description | Tier |
|---|---|---|
| Brand colour | Primary accent colour for buttons and highlights | Free |
| Background colour | Form background colour | Free |
| Font selection | Choose from a curated font library | Free |
| Logo | Upload a logo displayed at the top of the form | Free |
| Cover image | Full-width image at the top of the form | Free |
| Column layout | Arrange blocks side-by-side | Free |
| Text formatting | Headings, bold, italic, links, highlights | Free |
| Custom CSS | Full stylesheet injection for complete design control | Pro |
| Remove branding | Remove "Powered by Tally" attribution | Pro |
| Custom domain | Host the form on your own domain | Pro |

---

## 11. Embedding Methods

### Standard Embed

An `<iframe>` is injected into the host page at the location of the embed snippet.

**Configurable options:**
- Height (fixed pixels or dynamic)
- Hide form title
- Align content left or centre
- Transparent background
- Custom domain (Pro)
- Remove branding (Pro)

### Popup Embed

A floating modal overlay triggered by a button click or JavaScript API call.

**Configurable options:**
- Overlay background colour
- Trigger button text
- Auto-open timing (delay in milliseconds)

### Full-Page Embed

The form fills the entire viewport. Used for dedicated landing pages.

### JavaScript API

All three embed types support programmatic control:
- `TallyConfig.open(formId)` — open a popup
- `TallyConfig.close(formId)` — close a popup
- Host page URL query parameters are automatically forwarded to the form as hidden field values.
