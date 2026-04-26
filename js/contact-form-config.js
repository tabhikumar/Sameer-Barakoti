(function() {
  var isLocalFile = window.location.protocol === "file:";
  var origin = isLocalFile ? "http://localhost:3000" : window.location.origin;

  window.CONTACT_FORM_CONFIG = {
    apiEndpoint: origin + "/api/contact",
    successMessage: "Thanks! Your message has been sent successfully.",
    errorMessage:
      "Your message could not be sent right now. Please try again in a moment.",
  };
})();
