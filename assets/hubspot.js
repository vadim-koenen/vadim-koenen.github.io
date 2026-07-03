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
    const existingScript = document.getElementById(id);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true" && typeof onload === "function") onload();
      if (existingScript.dataset.loaded !== "true" && typeof onload === "function") {
        existingScript.addEventListener("load", onload, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    if (typeof onload === "function") {
      script.addEventListener("load", function () {
        script.dataset.loaded = "true";
        onload();
      });
    }
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

  function renderConfiguredForms() {
    Object.keys(forms).forEach((key) => {
      const formConfig = forms[key] || {};
      const formPortalId = formConfig.portalId || portalId;
      const targetSelector = formConfig.target || "";
      const formTarget = hasValue(targetSelector) ? document.querySelector(targetSelector) : null;

      if (!formTarget || !hasValue(formPortalId) || !hasValue(formConfig.formId)) return;
      if (!window.hbspt || !window.hbspt.forms) return;

      window.hbspt.forms.create({
        region: formConfig.region || "na1",
        portalId: formPortalId,
        formId: formConfig.formId,
        target: targetSelector
      });
    });
  }

  const hasConfiguredForm = Object.keys(forms).some((key) => {
    const formConfig = forms[key] || {};
    return hasValue(formConfig.formId) && hasValue(formConfig.portalId || portalId);
  });

  if (hasConfiguredForm) {
    loadScript("hs-forms-v2", "https://js.hsforms.net/forms/embed/v2.js", renderConfiguredForms);
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
