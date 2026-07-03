window.KRS_HUBSPOT_CONFIG = {
  portalId: "",
  tracking: {
    enabled: false
  },
  forms: {
    revenueSystemsAudit: {
      label: "HubSpot / Revenue Systems Audit",
      inquiryType: "hubspot_revenue_systems_audit",
      region: "na1",
      portalId: "",
      formId: "",
      target: "#hubspot-form-audit-target"
    },
    systemsReview: {
      label: "Book a Systems Review",
      inquiryType: "systems_review",
      region: "na1",
      portalId: "",
      formId: "",
      target: "#hubspot-form-systems-review-target"
    },
    hiringInquiry: {
      label: "Recruiter / Hiring Inquiry",
      inquiryType: "recruiter_hiring_inquiry",
      region: "na1",
      portalId: "",
      formId: "",
      target: "#hubspot-form-hiring-target"
    }
  },
  meetings: {
    url: "",
    embed: false,
    target: "#hubspot-meetings-target"
  },
  ctaTracking: {
    enabled: true,
    eventName: "krs_website_cta_click"
  }
};
