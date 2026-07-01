# Deployment Notes

These notes replace the older manual upload package instructions.

## Current Stack

1. `vadim-koenen/vadim-koenen.github.io` is the GitHub source repository.
2. Netlify builds and hosts the production site and deploy previews.
3. Cloudflare manages the production domain and DNS.
4. Production domain: https://vadimkoenen.com

## Current Workflow

1. Commit changes to a branch in the GitHub source repository.
2. Open a pull request against `main`.
3. Review the Netlify deploy preview for that pull request.
4. Merge when the preview is approved.
5. Netlify deploys production from `main`.

Do not manually upload files as a deployment step.

## HubSpot Safety Boundary

The current HubSpot integration is frontend-only. Public values such as portal ID, public form ID, and public meetings URL may be configured in `assets/hubspot-config.js`.

Private HubSpot app tokens belong in Netlify environment variables for a future Netlify Functions integration. Do not commit private tokens or call private HubSpot CRM APIs from frontend JavaScript.
