const HUBSPOT_API_BASE = "https://api.hubapi.com";
const MAX_PAYLOAD_BYTES = 24 * 1024;

const ROUTES = {
  audit: {
    label: "HubSpot / Revenue Systems Audit",
    inquiryType: "Audit",
    lifecycleStage: "lead",
    consultingIntent: true,
    leadTier: "A"
  },
  systems_review: {
    label: "Book a Systems Review",
    inquiryType: "Systems Review",
    lifecycleStage: "lead",
    consultingIntent: true,
    leadTier: "A"
  },
  recruiter: {
    label: "Recruiter / Hiring Inquiry",
    inquiryType: "Recruiter",
    lifecycleStage: "lead",
    consultingIntent: false,
    leadTier: "C"
  }
};

const HONEYPOT_FIELDS = ["hp", "_gotcha", "company_website_confirm", "extra_notes_url"];
const GENERIC_EMAIL_DOMAINS = new Set([
  "aol.com",
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
  "yandex.com"
]);

class IntakeError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class HubSpotApiError extends Error {
  constructor(status, code, responseBody = "") {
    super(code);
    this.status = status;
    this.code = code;
    this.responseBody = responseBody;
  }
}

export const config = {};

export default async function hubspotIntake(request, context = {}) {
  const requestId = context.requestId || createRequestId();

  try {
    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true }, 204);
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { ok: false, error: "method_not_allowed", message: "Use POST for HubSpot intake submissions." },
        405,
        { Allow: "POST" }
      );
    }

    const rawPayload = await readJsonPayload(request);
    const payload = normalizePayload(rawPayload);
    const route = validatePayload(payload);
    const token = requireEnv("HUBSPOT_PRIVATE_APP_TOKEN");
    const skipped = [];

    const contact = await upsertContact(token, payload, route, skipped);

    let company = null;
    if (getBooleanEnv("HUBSPOT_ENABLE_COMPANY_CREATION", true)) {
      company = await upsertAndAssociateCompany(token, payload, contact.id, skipped);
    }

    let deal = null;
    if (getBooleanEnv("HUBSPOT_ENABLE_DEAL_CREATION", false) && route.consultingIntent) {
      deal = await createAndAssociateDeal(token, payload, route, contact.id, company?.id, skipped);
    }

    if (getBooleanEnv("HUBSPOT_ENABLE_TICKET_CREATION", false)) {
      skipped.push("ticket_creation_skipped_no_support_route");
      safeWarn("ticket_creation_skipped", { requestId, route: payload.route });
    }

    return jsonResponse({
      ok: true,
      requestId,
      route: payload.route,
      contactId: contact.id,
      companyId: company?.id || null,
      dealId: deal?.id || null,
      skipped
    });
  } catch (error) {
    if (error instanceof IntakeError) {
      return jsonResponse(
        { ok: false, requestId, error: error.code, message: error.message },
        error.status
      );
    }

    if (error instanceof HubSpotApiError) {
      safeWarn("hubspot_api_error", { requestId, status: error.status, code: error.code });
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "hubspot_api_error",
          message: "HubSpot rejected the CRM request. Check function logs and HubSpot configuration."
        },
        502
      );
    }

    safeWarn("hubspot_intake_unhandled_error", { requestId, code: error?.code || "unknown" });
    return jsonResponse(
      {
        ok: false,
        requestId,
        error: "server_error",
        message: "The intake request could not be processed."
      },
      500
    );
  }
}

async function readJsonPayload(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
    throw new IntakeError(413, "payload_too_large", "Payload is too large.");
  }

  const body = await request.text();
  if (body.length > MAX_PAYLOAD_BYTES) {
    throw new IntakeError(413, "payload_too_large", "Payload is too large.");
  }

  if (!body.trim()) {
    throw new IntakeError(400, "empty_payload", "Request body must be JSON.");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new IntakeError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

function normalizePayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new IntakeError(400, "invalid_payload", "Request body must be a JSON object.");
  }

  const route = normalizeRoute(input.route);

  return {
    route,
    email: normalizeEmail(input.email),
    firstname: sanitizeString(input.firstname, 80),
    lastname: sanitizeString(input.lastname, 80),
    company: sanitizeString(input.company, 120),
    website: normalizeWebsite(input.website),
    jobtitle: sanitizeString(input.jobtitle, 120),
    phone: sanitizeString(input.phone, 60),
    platform_focus: sanitizeString(input.platform_focus, 200),
    pain_area: sanitizeString(input.pain_area, 200),
    message: sanitizeString(input.message, 4000),
    source_page: normalizeWebsite(input.source_page),
    utm_source: sanitizeString(input.utm_source, 120),
    utm_medium: sanitizeString(input.utm_medium, 120),
    utm_campaign: sanitizeString(input.utm_campaign, 180),
    utm_content: sanitizeString(input.utm_content, 180),
    utm_term: sanitizeString(input.utm_term, 180),
    consent: input.consent === true,
    honeypotFilled: HONEYPOT_FIELDS.some((field) => hasValue(input[field]))
  };
}

function validatePayload(payload) {
  if (payload.honeypotFilled) {
    throw new IntakeError(400, "honeypot_filled", "Spam check failed.");
  }

  if (!payload.route) {
    throw new IntakeError(400, "missing_route", "Route is required.");
  }

  const route = ROUTES[payload.route];
  if (!route) {
    throw new IntakeError(400, "unknown_route", "Route must be audit, systems_review, or recruiter.");
  }

  if (!payload.email) {
    throw new IntakeError(400, "missing_email", "A valid email address is required.");
  }

  return route;
}

async function upsertContact(token, payload, route, skipped) {
  const standardProperties = compactProperties({
    email: payload.email,
    firstname: payload.firstname,
    lastname: payload.lastname,
    company: payload.company,
    jobtitle: payload.jobtitle,
    phone: payload.phone,
    lifecyclestage: route.lifecycleStage,
    hubspot_owner_id: getEnv("HUBSPOT_DEFAULT_OWNER_ID")
  });

  const existingContact = await findObjectByProperty(token, "contacts", "email", payload.email, ["email"]);
  const contact = await writeContactStandardProperties(token, existingContact, standardProperties);

  await updateOptionalContactProperties(token, contact.id, buildCustomContactProperties(payload, route), skipped);

  return contact;
}

function writeContactStandardProperties(token, existingContact, standardProperties) {
  return existingContact
    ? updateObject(token, "contacts", existingContact.id, standardProperties)
    : createObject(token, "contacts", standardProperties);
}

function buildCustomContactProperties(payload, route) {
  return compactProperties({
    krs_inquiry_type: route.inquiryType,
    krs_platform_focus: payload.platform_focus,
    krs_pain_area: payload.pain_area,
    krs_lead_tier: route.leadTier,
    krs_source_page: payload.source_page,
    krs_source_detail: buildSourceDetail(payload),
    krs_message: payload.message,
    krs_consent: String(payload.consent)
  });
}

async function updateOptionalContactProperties(token, contactId, properties, skipped) {
  for (const [name, value] of Object.entries(properties)) {
    try {
      await updateObject(token, "contacts", contactId, { [name]: value });
    } catch (error) {
      if (error instanceof HubSpotApiError && isMissingPropertyError(error)) {
        skipped.push(`missing_contact_property:${name}`);
        safeWarn("hubspot_custom_property_missing", { objectType: "contact", property: name });
        continue;
      }

      skipped.push(`custom_contact_property_skipped:${name}`);
      safeWarn("hubspot_custom_property_skipped", {
        objectType: "contact",
        property: name,
        code: error?.code || "unknown"
      });
    }
  }
}

async function upsertAndAssociateCompany(token, payload, contactId, skipped) {
  const domain = deriveCompanyDomain(payload);
  if (!domain) {
    skipped.push("company_creation_skipped_generic_or_missing_domain");
    return null;
  }

  const companyProperties = compactProperties({
    name: payload.company || domain,
    domain,
    website: payload.website
  });

  const existingCompany = await findObjectByProperty(token, "companies", "domain", domain, ["name", "domain", "website"]);
  const company = existingCompany
    ? await updateObject(token, "companies", existingCompany.id, companyProperties)
    : await createObject(token, "companies", companyProperties);

  await associateObjects(token, "contacts", contactId, "companies", company.id, "contact_to_company", skipped);
  return company;
}

async function createAndAssociateDeal(token, payload, route, contactId, companyId, skipped) {
  const dealStage = getEnv("HUBSPOT_KRS_DISCOVERY_STAGE_ID") || getEnv("HUBSPOT_KRS_QUALIFIED_STAGE_ID");

  if (!dealStage) {
    skipped.push("deal_creation_skipped_missing_stage_env");
    safeWarn("deal_creation_skipped_missing_stage_env", { route: payload.route });
    return null;
  }

  const dealProperties = compactProperties({
    dealname: `KRS ${route.label} - ${payload.company || payload.email}`,
    pipeline: getEnv("HUBSPOT_KRS_PIPELINE_ID"),
    dealstage: dealStage,
    description: buildDealDescription(payload, route),
    hubspot_owner_id: getEnv("HUBSPOT_DEFAULT_OWNER_ID")
  });

  const deal = await createObject(token, "deals", dealProperties);
  await associateObjects(token, "deals", deal.id, "contacts", contactId, "deal_to_contact", skipped);

  if (companyId) {
    await associateObjects(token, "deals", deal.id, "companies", companyId, "deal_to_company", skipped);
  }

  return deal;
}

async function findObjectByProperty(token, objectType, propertyName, value, properties = []) {
  if (!hasValue(value)) return null;

  const result = await hubspotFetch(token, `/crm/v3/objects/${objectType}/search`, {
    method: "POST",
    body: {
      filterGroups: [
        {
          filters: [
            {
              propertyName,
              operator: "EQ",
              value
            }
          ]
        }
      ],
      properties,
      limit: 1
    }
  });

  return result.results?.[0] || null;
}

async function createObject(token, objectType, properties) {
  return hubspotFetch(token, `/crm/v3/objects/${objectType}`, {
    method: "POST",
    body: { properties }
  });
}

async function updateObject(token, objectType, objectId, properties) {
  return hubspotFetch(token, `/crm/v3/objects/${objectType}/${objectId}`, {
    method: "PATCH",
    body: { properties }
  });
}

async function associateObjects(token, fromType, fromId, toType, toId, associationType, skipped) {
  try {
    await hubspotFetch(
      token,
      `/crm/v3/objects/${fromType}/${fromId}/associations/${toType}/${toId}/${associationType}`,
      { method: "PUT" }
    );
  } catch (error) {
    skipped.push(`association_skipped:${fromType}_to_${toType}`);
    safeWarn("hubspot_association_skipped", {
      fromType,
      toType,
      associationType,
      code: error?.code || "unknown"
    });
  }
}

async function hubspotFetch(token, path, options = {}) {
  const response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: ["Bearer", token].join(" "),
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const responseText = await response.text();
  const responseJson = responseText ? safeJsonParse(responseText) : null;

  if (!response.ok) {
    throw new HubSpotApiError(
      response.status,
      responseJson?.category || responseJson?.error || `hubspot_${response.status}`,
      responseText
    );
  }

  return responseJson || {};
}

function buildDealDescription(payload, route) {
  const lines = [
    `Route: ${route.label}`,
    `Platform focus: ${payload.platform_focus || "Not provided"}`,
    `Pain area: ${payload.pain_area || "Not provided"}`,
    `Source page: ${payload.source_page || "Not provided"}`,
    `UTM source: ${payload.utm_source || "Not provided"}`,
    `UTM medium: ${payload.utm_medium || "Not provided"}`,
    `UTM campaign: ${payload.utm_campaign || "Not provided"}`,
    `UTM content: ${payload.utm_content || "Not provided"}`,
    `UTM term: ${payload.utm_term || "Not provided"}`,
    "",
    "Message:",
    payload.message || "Not provided"
  ];

  return lines.join("\n").slice(0, 5000);
}

function buildSourceDetail(payload) {
  const parts = [
    ["utm_source", payload.utm_source],
    ["utm_medium", payload.utm_medium],
    ["utm_campaign", payload.utm_campaign],
    ["utm_content", payload.utm_content],
    ["utm_term", payload.utm_term]
  ]
    .filter(([, value]) => hasValue(value))
    .map(([key, value]) => `${key}=${value}`);

  return parts.join("&").slice(0, 500);
}

function deriveCompanyDomain(payload) {
  const websiteDomain = domainFromUrl(payload.website);
  if (websiteDomain && !GENERIC_EMAIL_DOMAINS.has(websiteDomain)) return websiteDomain;

  const emailDomain = payload.email.split("@")[1]?.toLowerCase();
  if (emailDomain && !GENERIC_EMAIL_DOMAINS.has(emailDomain)) return emailDomain;

  return "";
}

function domainFromUrl(value) {
  if (!hasValue(value)) return "";

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function normalizeRoute(value) {
  const route = sanitizeString(value, 40).toLowerCase().replace(/-/g, "_");
  if (route === "systems" || route === "systemsreview") return "systems_review";
  if (route === "hiring" || route === "recruiter_hiring_inquiry") return "recruiter";
  return route;
}

function normalizeEmail(value) {
  const email = sanitizeString(value, 254).toLowerCase();
  if (!email) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeWebsite(value) {
  const website = sanitizeString(value, 500);
  if (!website) return "";

  try {
    const url = new URL(website.includes("://") ? website : `https://${website}`);
    return url.toString().slice(0, 500);
  } catch {
    return website.slice(0, 500);
  }
}

function sanitizeString(value, maxLength) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function compactProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

function getBooleanEnv(name, defaultValue = false) {
  const value = getEnv(name);
  if (!hasValue(value)) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function requireEnv(name) {
  const value = getEnv(name);
  if (!hasValue(value)) {
    throw new IntakeError(500, "missing_hubspot_token", `${name} is not configured.`);
  }
  return value;
}

function getEnv(name) {
  return process.env[name] || "";
}

function isMissingPropertyError(error) {
  const body = error.responseBody || "";
  return body.includes("PROPERTY_DOESNT_EXIST") || body.includes("property does not exist");
}

function hasValue(value) {
  return typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined && value !== false;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(status === 204 ? null : JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

function safeWarn(message, details = {}) {
  console.warn(message, details);
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `req_${Date.now()}`;
}
