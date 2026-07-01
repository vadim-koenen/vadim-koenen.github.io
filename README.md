# Vadim Koenen Portfolio Source Repo

Professional portfolio for Vadim Koenen, MBA, focused on marketing automation, RevOps, Marketo, HubSpot, Salesforce, 6sense ABM, demand generation operations, lifecycle marketing, campaign operations, and GTM systems.

## Deployment Stack

- Source repo: `vadim-koenen/vadim-koenen.github.io`
- Hosting and deploy previews: Netlify
- Production domain: https://vadimkoenen.com
- Domain and DNS: Cloudflare
- GitHub role: source control only

## Netlify Configuration

This is a plain static HTML site. `netlify.toml` sets the publish directory to the repository root:

```toml
[build]
  publish = "."
```

There is no build command and no generated publish directory. Deploy previews should work without real HubSpot portal IDs, form IDs, or meetings URLs because the frontend HubSpot config is disabled by default.

## HubSpot Phase 1: Public-Safe Frontend Integration

The connected HubSpot account is currently treated as a clean/default CRM rather than a data source to publish from. Phase 1 uses the website to start creating clean HubSpot contact data instead of pulling CRM data onto the site.

The Phase 1 integration is frontend-only and public-safe:

- HubSpot tracking loader support in `assets/hubspot.js`
- Public HubSpot form embed support for three intake paths
- Public HubSpot meetings link/embed support
- Homepage HubSpot highlights section
- CTA click tracking hooks via `data-hubspot-cta`
- Disabled-by-default public config in `assets/hubspot-config.js`

Public values such as HubSpot portal ID, public form IDs, region, and public meetings URL may be configured in `assets/hubspot-config.js`. Deploy previews are expected to render normally while those values are blank.

Do not put private app tokens, OAuth secrets, API keys, or CRM write credentials in frontend JavaScript.

### Phase 1 Intake Paths

Create public HubSpot forms for:

- HubSpot / Revenue Systems Audit
- Book a Systems Review
- Recruiter / Hiring Inquiry

Those HubSpot-hosted forms should create/update HubSpot contacts directly through HubSpot's normal form processing. Recommended hidden or explicit fields:

- `krs_inquiry_type`
- `krs_lead_source`
- `krs_requested_service`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`

Keep consulting, systems-review, and hiring/recruiter intent separate from the beginning so future reporting and automation do not have to untangle mixed inquiry types.

## HubSpot Setup

Edit `assets/hubspot-config.js` when the public IDs are ready:

```js
window.KRS_HUBSPOT_CONFIG = {
  portalId: "12345678",
  tracking: {
    enabled: true
  },
  forms: {
    revenueSystemsAudit: {
      label: "HubSpot / Revenue Systems Audit",
      inquiryType: "hubspot_revenue_systems_audit",
      region: "na1",
      portalId: "12345678",
      formId: "audit-public-form-guid",
      target: "#hubspot-form-audit-target"
    },
    systemsReview: {
      label: "Book a Systems Review",
      inquiryType: "systems_review",
      region: "na1",
      portalId: "12345678",
      formId: "systems-review-public-form-guid",
      target: "#hubspot-form-systems-review-target"
    },
    hiringInquiry: {
      label: "Recruiter / Hiring Inquiry",
      inquiryType: "recruiter_hiring_inquiry",
      region: "na1",
      portalId: "12345678",
      formId: "hiring-public-form-guid",
      target: "#hubspot-form-hiring-target"
    }
  },
  meetings: {
    url: "https://meetings.hubspot.com/example",
    embed: false,
    target: "#hubspot-meetings-target"
  },
  ctaTracking: {
    enabled: true,
    eventName: "krs_website_cta_click"
  }
};
```

## Private HubSpot Values

Future private HubSpot CRM automation must use Netlify environment variables with Functions scope.

- `HUBSPOT_PRIVATE_APP_TOKEN` belongs in Netlify environment variables.
- Never commit `HUBSPOT_PRIVATE_APP_TOKEN`.
- Never expose private tokens in frontend JavaScript.
- Frontend code must not call private HubSpot CRM APIs directly.

## HubSpot CRM Automation Setup

Phase 2 adds the server-side Netlify Function at:

```text
/.netlify/functions/hubspot-intake
```

Source file:

```text
netlify/functions/hubspot-intake.mjs
```

Setup steps:

1. Create a HubSpot Private App.
2. Add only the scopes needed for enabled features:
   - Contacts read/write
   - Companies read/write
   - Deals read/write only when deal creation is enabled
   - Tickets read/write only when ticket creation is enabled
   - Schemas write only for a future property setup script
3. Copy the Private App token into Netlify as `HUBSPOT_PRIVATE_APP_TOKEN`.
4. Scope the token to Netlify Functions only if the Netlify UI supports that for the site.
5. Set optional env vars as needed:

```bash
HUBSPOT_DEFAULT_OWNER_ID=
HUBSPOT_KRS_PIPELINE_ID=
HUBSPOT_KRS_DISCOVERY_STAGE_ID=
HUBSPOT_KRS_QUALIFIED_STAGE_ID=
HUBSPOT_ENABLE_DEAL_CREATION=false
HUBSPOT_ENABLE_COMPANY_CREATION=true
HUBSPOT_ENABLE_TICKET_CREATION=false
```

6. Redeploy Netlify after adding or changing environment variables.
7. Test with a non-sensitive test contact.
8. Confirm the expected contact, company, and optional deal records appear in HubSpot.

The function accepts JSON submissions for `audit`, `systems_review`, and `recruiter` routes. It validates required fields, rejects huge payloads, supports honeypot fields, avoids logging full PII, and never exposes the private token to browser code.

See `docs/hubspot-crm-automation.md` for payload shape, optional KRS properties, and the future property setup script notes.

## Phase 2 Roadmap: Netlify Functions

The current server-side function establishes the intake path. Future explicitly approved work can extend it with:

- Add rate limiting and spam protection before going live.
- Add a reviewed `scripts/hubspot-setup-properties.mjs` property setup script.
- Add custom website forms that submit to the Netlify Function if replacing HubSpot-hosted forms becomes desirable.

Do not enable or live-test HubSpot CRM writes until the Netlify environment variables are configured and the test contact plan is explicitly approved.

## Cloudflare Notes

Cloudflare manages the production domain and DNS. This repo does not change Cloudflare DNS, proxy, cache, or Zaraz settings.

Cloudflare Zaraz can optionally run HubSpot later, but the first implementation prefers version-controlled Netlify code so deploy previews and code review show exactly what will run. If Cloudflare proxy or caching interferes with HubSpot form or meeting scripts, test with cache disabled or bypass cache for those script paths in Cloudflare, but do not change Cloudflare settings from this repo.

## Site Sections

- Home: https://vadimkoenen.com/
- Resume: https://vadimkoenen.com/resume/
- AI GTM Asset Engine: https://vadimkoenen.com/ai-gtm-asset-engine/
- Marketo: https://vadimkoenen.com/marketo/
- RevOps: https://vadimkoenen.com/revops/
- HubSpot highlights: https://vadimkoenen.com/#hubspot
- ABM: https://vadimkoenen.com/abm/
- Marketing Automation Case Study: https://vadimkoenen.com/case-study-marketing-automation/
- ABM Lifecycle Case Study: https://vadimkoenen.com/case-study-abm-lifecycle/
- AngleScope Case Study: https://vadimkoenen.com/case-study-anglescope/
- Writing: https://vadimkoenen.com/writing/
