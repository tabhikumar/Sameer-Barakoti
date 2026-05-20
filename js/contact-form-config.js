(function() {
  var isLocalFile = window.location.protocol === "file:";
  var origin = isLocalFile ? "https://www.sameerbarakoti.com" : window.location.origin;
  var defaultApiEndpoint = origin + "/api/contact";

  window.CONTACT_FORM_CONFIG = {
    apiEndpoint: window.CONTACT_FORM_API_ENDPOINT || defaultApiEndpoint,
    whatsappNumber: window.CONTACT_FORM_WHATSAPP_NUMBER || "+18179322649",
    successMessage: "Thanks! Your message has been sent successfully.",
    errorMessage:
      "Your message could not be sent right now. Please try again in a moment.",
  };
})();
