import assert from "node:assert/strict";
import hubspotIntake from "../netlify/functions/hubspot-intake.mjs";

const ENDPOINT = "http://localhost/.netlify/functions/hubspot-intake";

async function responseJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function testInvalidMethod() {
  const response = await hubspotIntake(new Request(ENDPOINT, { method: "GET" }), {
    requestId: "test-invalid-method"
  });
  const body = await responseJson(response);

  assert.equal(response.status, 405);
  assert.equal(body.error, "method_not_allowed");
}

async function testMissingEmail() {
  const response = await hubspotIntake(
    new Request(ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ route: "audit" })
    }),
    { requestId: "test-missing-email" }
  );
  const body = await responseJson(response);

  assert.equal(response.status, 400);
  assert.equal(body.error, "missing_email");
}

async function testUnknownRoute() {
  const response = await hubspotIntake(
    new Request(ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        route: "vendor",
        email: "test@example.com"
      })
    }),
    { requestId: "test-unknown-route" }
  );
  const body = await responseJson(response);

  assert.equal(response.status, 400);
  assert.equal(body.error, "unknown_route");
}

await testInvalidMethod();
await testMissingEmail();
await testUnknownRoute();

console.log("hubspot-intake validation tests passed");
