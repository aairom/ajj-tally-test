# Form JSON Schema Reference — AJJ Custom Form Solution

This document specifies the JSON structure served by `GET /api/forms/:formId` and used by the embed runtime to render a form.

---

## Top-Level Schema

```json
{
  "id": "abc123",
  "title": "Contact Us",
  "description": "We'd love to hear from you.",
  "status": "published",
  "settings": { ... },
  "theme": { ... },
  "pages": [ ... ],
  "logic": [ ... ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique form identifier |
| `title` | `string` | Form title displayed at the top of the embed |
| `description` | `string` \| `null` | Optional subtitle below the title |
| `status` | `"published"` \| `"draft"` | Only published forms are served to the embed |
| `settings` | `FormSettings` | Submission, security, and behaviour configuration |
| `theme` | `FormTheme` | Visual styling configuration |
| `pages` | `Page[]` | Ordered array of form pages |
| `logic` | `LogicRule[]` | Conditional logic rules applied globally |

---

## FormSettings Object

```json
{
  "allowPartialSubmissions": false,
  "preventDuplicates": false,
  "passwordProtected": false,
  "password": null,
  "captchaEnabled": false,
  "captchaProvider": "hcaptcha",
  "dataRetentionDays": null,
  "allowedOrigins": ["https://example.com"],
  "redirectOnCompletion": null,
  "selfEmailNotification": {
    "enabled": true,
    "to": "owner@example.com",
    "subject": "New submission: Contact Us",
    "body": "You have a new response.\n\n@AllAnswers"
  },
  "respondentEmailNotification": {
    "enabled": false,
    "toField": "email_field_id",
    "subject": "Thanks for contacting us!",
    "body": "Hi @first_name, we received your message and will be in touch."
  }
}
```

---

## FormTheme Object

```json
{
  "primaryColor": "#0066FF",
  "backgroundColor": "#FFFFFF",
  "buttonColor": "#0066FF",
  "buttonTextColor": "#FFFFFF",
  "fontFamily": "Inter",
  "logoUrl": null,
  "coverImageUrl": null,
  "customCss": null
}
```

---

## Page Object

```json
{
  "id": "page_1",
  "title": "Your Information",
  "fields": [ ... ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique page identifier |
| `title` | `string` \| `null` | Optional page heading |
| `fields` | `FieldDefinition[]` | Ordered array of fields on this page |

---

## FieldDefinition Object

All field definitions share a common base structure, extended with type-specific `config`.

### Common Base Fields

```json
{
  "id": "field_name",
  "type": "SHORT_ANSWER",
  "label": "Your name",
  "description": null,
  "required": true,
  "hidden": false,
  "defaultValue": null,
  "validationRules": ["required"],
  "config": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique field identifier (used for logic rules and piping) |
| `type` | `FieldTypeEnum` | Field type (see enum below) |
| `label` | `string` | Question text (supports `@fieldId` piping tokens) |
| `description` | `string` \| `null` | Optional hint text below the label |
| `required` | `boolean` | Initial required state (can be overridden by logic) |
| `hidden` | `boolean` | Initial visibility (can be toggled by logic) |
| `defaultValue` | `any` \| `null` | Pre-populated value |
| `validationRules` | `string[]` | Array of validation rule strings |
| `config` | `object` | Type-specific configuration (see per-type docs below) |

---

## FieldTypeEnum Values

| Enum Value | Description |
|---|---|
| `SHORT_ANSWER` | Single-line text |
| `LONG_ANSWER` | Multi-line textarea |
| `NUMBER` | Numeric input |
| `EMAIL` | Email address |
| `PHONE` | Phone number |
| `LINK` | URL |
| `SIGNATURE` | Electronic signature (canvas) |
| `MULTIPLE_CHOICE` | Radio / multi-select list |
| `DROPDOWN` | Single-select dropdown |
| `CHECKBOX` | Multi-selection checkboxes |
| `MULTI_SELECT` | Tag-style multi-select dropdown |
| `MATRIX` | Grid / Likert scale |
| `RANKING` | Drag-to-reorder list |
| `DATE` | Calendar date picker |
| `TIME` | 24-hour time picker |
| `RATING` | Star rating |
| `LINEAR_SCALE` | Numeric scale slider |
| `NPS` | 0–10 Net Promoter Score |
| `CSAT` | 1–5 Customer Satisfaction |
| `FILE_UPLOAD` | File attachment |
| `HIDDEN` | Non-visible field pre-filled via URL params |
| `CALCULATED` | Computed value from expression |
| `CAPTCHA` | reCAPTCHA / hCaptcha block |
| `HEADING` | Non-input heading block |
| `PARAGRAPH` | Non-input paragraph text block |
| `DIVIDER` | Non-input horizontal divider |
| `IMAGE` | Non-input image block |

---

## Type-Specific Config Examples

### `SHORT_ANSWER` / `LONG_ANSWER`

```json
{ "placeholder": "Enter your name" }
```

### `NUMBER`

```json
{
  "placeholder": "0",
  "min": 0,
  "max": 1000,
  "decimalPlaces": 2,
  "prefix": "$",
  "suffix": " USD"
}
```

### `MULTIPLE_CHOICE` / `CHECKBOX`

```json
{
  "options": [
    { "id": "opt_1", "label": "Option A", "imageUrl": null },
    { "id": "opt_2", "label": "Option B", "imageUrl": null }
  ],
  "allowMultiple": false,
  "randomise": false,
  "minSelections": null,
  "maxSelections": null
}
```

### `DROPDOWN` / `MULTI_SELECT`

```json
{
  "options": [
    { "id": "opt_1", "label": "Option A" },
    { "id": "opt_2", "label": "Option B" }
  ],
  "placeholder": "Select an option",
  "randomise": false
}
```

### `MATRIX`

```json
{
  "rows": [
    { "id": "row_1", "label": "Statement 1" },
    { "id": "row_2", "label": "Statement 2" }
  ],
  "columns": [
    { "id": "col_1", "label": "Strongly agree" },
    { "id": "col_2", "label": "Agree" },
    { "id": "col_3", "label": "Disagree" }
  ]
}
```

### `DATE`

```json
{
  "allowRange": false,
  "disabledDates": [],
  "minDate": null,
  "maxDate": null
}
```

### `RATING`

```json
{ "maxStars": 5 }
```

### `LINEAR_SCALE`

```json
{
  "min": 1,
  "max": 10,
  "step": 1,
  "minLabel": "Not at all",
  "maxLabel": "Extremely"
}
```

### `NPS`

```json
{
  "leftLabel": "Not likely",
  "rightLabel": "Extremely likely"
}
```

### `FILE_UPLOAD`

```json
{
  "allowedTypes": ["image/jpeg", "image/png", "application/pdf"],
  "maxFileSizeMb": 10,
  "allowMultiple": false
}
```

### `HIDDEN`

```json
{ "paramKey": "ref" }
```

The embed runtime reads `window.location.search` and populates this field with the value of the `ref` query parameter.

### `CALCULATED`

```json
{
  "expression": "{field_score_a} + {field_score_b}",
  "displayInForm": false
}
```

Expression syntax: `{fieldId}` token is replaced with the field's current value. Supports `+`, `-`, `*`, `/`, `(`, `)`, and numeric literals.

---

## LogicRule Object

```json
{
  "id": "rule_1",
  "when": "all",
  "conditions": [
    {
      "fieldId": "field_country",
      "operator": "equals",
      "value": "Germany"
    },
    {
      "fieldId": "field_age",
      "operator": "lessThan",
      "value": 18
    }
  ],
  "action": {
    "type": "JUMP_TO_PAGE",
    "target": "page_3"
  }
}
```

### Condition Operators

| Operator | Applicable Types |
|---|---|
| `equals` | All |
| `notEquals` | All |
| `contains` | String fields |
| `notContains` | String fields |
| `startsWith` | String fields |
| `endsWith` | String fields |
| `greaterThan` | Number, rating, scale |
| `lessThan` | Number, rating, scale |
| `greaterThanOrEqual` | Number, rating, scale |
| `lessThanOrEqual` | Number, rating, scale |
| `isEmpty` | All |
| `isNotEmpty` | All |
| `isOneOf` | Multiple choice, dropdown, checkbox |
| `isNoneOf` | Multiple choice, dropdown, checkbox |

### Action Types

| `action.type` | `action.target` |
|---|---|
| `JUMP_TO_PAGE` | Page `id` string |
| `SHOW_BLOCKS` | Array of field `id` strings |
| `HIDE_BLOCKS` | Array of field `id` strings |
| `MAKE_REQUIRED` | Array of field `id` strings |
| `MAKE_OPTIONAL` | Array of field `id` strings |
| `CALCULATE` | `{ fieldId: string, expression: string }` |
| `HIDE_SUBMIT_BUTTON` | `null` |
| `REDIRECT_TO_URL` | URL string |
