# HubSpot CRM Automation

This document describes the server-side Phase 2 HubSpot path for `vadimkoenen.com`.

## Current Boundary

- The website is hosted on Netlify.
- Cloudflare manages domain and DNS.
- GitHub is source control only.
- Browser JavaScript must not call private HubSpot CRM APIs.
- `HUBSPOT_PRIVATE_APP_TOKEN` must live in Netlify environment variables, not in committed files.
- The function reads the private token only from `process.env.HUBSPOT_PRIVATE_APP_TOKEN`.

## Netlify Function

Function path:

```text
/.netlify/functions/hubspot-intake
```

Source file:

```text
netlify/functions/hubspot-intake.mjs
```

Supported routes:

- `audit`
- `systems_review`
- `recruiter`

The function validates the payload, creates or updates a contact, optionally creates or associates a company, and optionally creates a deal for consulting-intent routes.

## Required Environment Variable

```bash
HUBSPOT_PRIVATE_APP_TOKEN=
```

## Optional Environment Variables

```bash
HUBSPOT_PORTAL_ID=244355981
HUBSPOT_DEFAULT_OWNER_ID=
HUBSPOT_KRS_PIPELINE_ID=
HUBSPOT_KRS_DISCOVERY_STAGE_ID=
HUBSPOT_KRS_QUALIFIED_STAGE_ID=
HUBSPOT_ENABLE_DEAL_CREATION=false
HUBSPOT_ENABLE_COMPANY_CREATION=true
HUBSPOT_ENABLE_TICKET_CREATION=false
```

## HubSpot Private App Scopes

Create a HubSpot Private App with the minimum scopes needed for the enabled features:

- Contacts read/write
- Companies read/write
- Deals read/write only if deal creation is enabled
- Tickets read/write only if ticket creation is enabled
- Schemas write only for a later property setup script

After creating the Private App, copy the token into Netlify as `HUBSPOT_PRIVATE_APP_TOKEN` and redeploy the site.

## Contact Properties

The function writes standard HubSpot contact fields first:

- `email`
- `firstname`
- `lastname`
- `company`
- `jobtitle`
- `phone`
- `lifecyclestage`

The function then attempts to write these optional KRS contact properties if they exist:

- `krs_inquiry_type`
- `krs_platform_focus`
- `krs_pain_area`
- `krs_lead_tier`
- `krs_source_page`
- `krs_source_detail`
- `krs_message`
- `krs_consent`

If an optional KRS property is missing, the function logs a safe warning and continues.

## Future Property Setup Script

Future script path:

```text
scripts/hubspot-setup-properties.mjs
```

Do not run a schema setup script without explicit approval.

Suggested contact properties:

| Property | Type | Options |
|---|---|---|
| `krs_inquiry_type` | select | Audit, Systems Review, Recruiter, Networking, Vendor, Other |
| `krs_platform_focus` | multi/select | HubSpot, Salesforce, Marketo, 6sense, Workato, AI Workflow, Other |
| `krs_pain_area` | multi/select | CRM Hygiene, Lifecycle, Attribution, Routing, Reporting, AI Workflow, Data Quality, Other |
| `krs_lead_tier` | select | A, B, C |
| `krs_source_page` | text | URL or page path |
| `krs_source_detail` | text | UTM summary |
| `krs_message` | textarea | Visitor message |
| `krs_consent` | boolean | Consent flag |

Suggested deal properties:

- `krs_inquiry_type`
- `krs_platform_focus`
- `krs_pain_area`
- `krs_source_page`

## Manual Test Payload

Use a non-sensitive test contact only.

```json
{
  "route": "audit",
  "email": "test@example.com",
  "firstname": "Test",
  "lastname": "Contact",
  "company": "Example Company",
  "website": "https://example.com",
  "jobtitle": "VP Marketing",
  "platform_focus": "HubSpot",
  "pain_area": "CRM Hygiene",
  "message": "Testing the KRS HubSpot intake function.",
  "source_page": "https://vadimkoenen.com/",
  "utm_source": "local-test",
  "consent": true
}
```

Before going live, add rate limiting and spam protection beyond the honeypot check.
