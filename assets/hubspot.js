(function () {
  const config = window.KRS_HUBSPOT_CONFIG || {};
  const portalId = config.portalId || "";
  const tracking = config.tracking || {};
  const forms = config.forms || {};
  const meetings = config.meetings || {};
  const ctaTracking = config.ctaTracking || {};

  function hasValue(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function loadScript(id, src, onload) {
    if (document.getElementById(id)) {
      if (typeof onload === "function") onload();
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    if (typeof onload === "function") script.onload = onload;
    document.head.appendChild(script);
  }

  function trackCtaClick(element) {
    if (ctaTracking.enabled === false || !hasValue(ctaTracking.eventName)) return;

    window._hsq = window._hsq || [];
    window._hsq.push([
      "trackCustomBehavioralEvent",
      {
        name: ctaTracking.eventName,
        properties: {
          cta_id: element.dataset.hubspotCta || "",
          cta_label: element.dataset.hubspotCtaLabel || element.textContent.trim(),
          cta_href: element.getAttribute("href") || "",
          page_path: window.location.pathname
        }
      }
    ]);
  }

  document.querySelectorAll("[data-hubspot-cta]").forEach((element) => {
    element.addEventListener("click", () => trackCtaClick(element));
  });

  if (tracking.enabled && hasValue(portalId)) {
    loadScript("hs-script-loader", "https://js.hs-scripts.com/" + portalId + ".js");
  }

  const contactForm = forms.contact || {};
  const formPortalId = contactForm.portalId || portalId;
  const formTarget = document.querySelector(contactForm.target || "#hubspot-form-target");

  if (formTarget && hasValue(formPortalId) && hasValue(contactForm.formId)) {
    loadScript("hs-forms-v2", "https://js.hsforms.net/forms/embed/v2.js", function () {
      if (!window.hbspt || !window.hbspt.forms) return;

      window.hbspt.forms.create({
        region: contactForm.region || "na1",
        portalId: formPortalId,
        formId: contactForm.formId,
        target: contactForm.target || "#hubspot-form-target"
      });
    });
  }

  const meetingsTarget = document.querySelector(meetings.target || "#hubspot-meetings-target");

  if (meetingsTarget && hasValue(meetings.url)) {
    const meetingLink = meetingsTarget.querySelector("[data-hubspot-meetings-link]");
    if (meetingLink) meetingLink.href = meetings.url;

    if (meetings.embed) {
      const iframe = document.createElement("iframe");
      iframe.src = meetings.url;
      iframe.title = "Schedule a meeting";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.setAttribute("data-hubspot-meetings-iframe", "true");
      meetingsTarget.appendChild(iframe);
    }
  }
})();
