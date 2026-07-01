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

## Phase 2 Roadmap: Netlify Functions

A later, explicitly approved PR can add a server-side function:

- File: `netlify/functions/hubspot-lead.mjs`
- Accept website form payload.
- Validate required fields.
- Call HubSpot CRM APIs server-side using `process.env.HUBSPOT_PRIVATE_APP_TOKEN` or Netlify's server-side environment access.
- Create or update a contact.
- Create or associate a company when the inquiry includes enough company context.
- Create or update lifecycle stage based on the intake path and qualification status.
- Create a deal for a qualified consulting or systems-review inquiry.
- Optionally create a ticket only for support-style requests.
- Add custom KRS properties such as inquiry type, requested service, audit interest, recruiter/hiring flag, source path, and qualification notes.
- Return a JSON response to the frontend.
- Add rate limiting and spam protection before going live.

Do not implement live HubSpot CRM writes without explicit approval.

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
