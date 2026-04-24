(function($) {
  "use strict"; // Start of use strict

  // Smooth scrolling using jQuery easing
  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: (target.offset().top)
        }, 1000, "easeInOutExpo");
        return false;
      }
    }
  });

  // Closes responsive menu when a scroll trigger link is clicked
  $('.js-scroll-trigger').click(function() {
    $('.navbar-collapse').collapse('hide');
  });

  // Activate scrollspy to add active class to navbar items on scroll
  $('body').scrollspy({
    target: '#sideNav'
  });

})(jQuery); // End of use strict

(function($) {
  var contactForm = $("#contactForm");
  if (!contactForm.length) {
    return;
  }

  var contactFormStatus = $("#contactFormStatus");
  var contactSubmitButton = $("#contactSubmitButton");
  var defaultConfig = {
    apiEndpoint: "/api/contact",
    successMessage: "Your message has been sent successfully.",
    errorMessage: "We could not send your message right now.",
  };
  var formConfig = $.extend({}, defaultConfig, window.CONTACT_FORM_CONFIG || {});

  function setContactFormStatus(type, message) {
    contactFormStatus
      .removeClass("d-none alert-success alert-danger alert-warning")
      .addClass("alert-" + type)
      .text(message);
  }

  function getApiEndpoint() {
    return $.trim(formConfig.apiEndpoint || "");
  }

  function getAjaxErrorMessage(xhr) {
    var responseMessage =
      xhr &&
      xhr.responseJSON &&
      xhr.responseJSON.message;

    if (responseMessage) {
      return responseMessage;
    }

    if (xhr && xhr.status === 0) {
      return "Could not reach the contact server. Start the Node server with `npm start`, then try again.";
    }

    return formConfig.errorMessage;
  }

  contactForm.on("submit", function(event) {
    event.preventDefault();

    var apiEndpoint = getApiEndpoint();
    if (!apiEndpoint) {
      setContactFormStatus(
        "warning",
        "Set the contact form API endpoint in js/contact-form-config.js before using this form."
      );
      return;
    }

    var formElement = contactForm.get(0);
    if (!formElement.checkValidity()) {
      formElement.reportValidity();
      return;
    }

    var payload = {
      fullName: $.trim(contactForm.find('[name="full-name"]').val()),
      email: $.trim(contactForm.find('[name="email"]').val()),
      subject: $.trim(contactForm.find('[name="subject"]').val()),
      message: $.trim(contactForm.find('[name="message"]').val()),
      // website: $.trim(contactForm.find('[name="_honey"]').val()),
    };

    contactSubmitButton.prop("disabled", true).text("Sending...");
    setContactFormStatus("warning", "Sending your message...");

    $.ajax({
      url: apiEndpoint,
      method: "POST",
      data: JSON.stringify(payload),
      contentType: "application/json; charset=UTF-8",
      dataType: "json",
    })
      .done(function(response) {
        formElement.reset();
        setContactFormStatus(
          "success",
          (response && response.message) || formConfig.successMessage
        );
      })
      .fail(function(xhr) {
        setContactFormStatus("danger", getAjaxErrorMessage(xhr));
      })
      .always(function() {
        contactSubmitButton.prop("disabled", false).text("Send");
      });
  });
})(jQuery);

(function($) {
  var chatWidget = $("#chatWidget");
  var chatToggle = $("#chatLauncher");
  var chatClose = $("#chatDismiss");
  var chatInput = $("#chatInput");
  var chatSendButton = $("#chatSendBtn");
  var chatBody = $(".chat-body");
  var chatStatus = $("#chatStatus");
  var chatStorageKey = "contactChatSubmitted";

  if (!chatWidget.length || !chatToggle.length || !chatInput.length || !chatSendButton.length) {
    return;
  }

  function getApiEndpoint() {
    if (window.CONTACT_FORM_CONFIG && window.CONTACT_FORM_CONFIG.apiEndpoint) {
      return $.trim(window.CONTACT_FORM_CONFIG.apiEndpoint);
    }

    return "/api/contact";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function appendChatMessage(type, message) {
    chatBody.append(
      '<div class="chat-message ' + type + '">' + escapeHtml(message) + "</div>"
    );
    chatBody.scrollTop(chatBody[0].scrollHeight);
  }

  function renderChatSuccessState() {
    chatBody.html(
      '<div class="chat-message bot">Thanks! I will help you with that 😊</div>'
    );
    chatBody.scrollTop(chatBody[0].scrollHeight);
  }

  function setChatLockedState(isLocked) {
    chatInput.prop("disabled", isLocked);
    chatSendButton.prop("disabled", isLocked);

    if (isLocked) {
      renderChatSuccessState();
      chatInput.attr("placeholder", "Message already sent");
      chatStatus.text("We have received your message. We will get back to you.");
    } else {
      chatInput.attr("placeholder", "Type a message...");
      chatStatus.text("");
    }
  }

  function hasChatBeenSubmitted() {
    return window.localStorage.getItem(chatStorageKey) === "true";
  }

  function markChatSubmitted() {
    window.localStorage.setItem(chatStorageKey, "true");
  }

  function getAjaxErrorMessage(xhr) {
    var responseMessage =
      xhr &&
      xhr.responseJSON &&
      xhr.responseJSON.message;

    if (responseMessage) {
      return responseMessage;
    }

    if (xhr && xhr.status === 0) {
      return "Could not reach the contact server. Start the Node server with `npm start`, then try again.";
    }

    return "Your chat message could not be sent right now.";
  }

  setChatLockedState(hasChatBeenSubmitted());

  chatToggle.on("click", function() {
    chatWidget.fadeToggle();
  });

  chatClose.on("click", function() {
    chatWidget.fadeOut();
  });

  function submitChatMessage() {
    var apiEndpoint = getApiEndpoint();
    var message = $.trim(chatInput.val());

    if (hasChatBeenSubmitted()) {
      setChatLockedState(true);
      return false;
    }

    if (!message) {
      chatStatus.text("Please type a message first.");
      return false;
    }

    appendChatMessage("user", message);
    chatInput.val("");
    chatInput.prop("disabled", true);
    chatSendButton.prop("disabled", true);
    chatStatus.text("Sending your message...");

    $.ajax({
      url: apiEndpoint,
      method: "POST",
      data: JSON.stringify({
        source: "chat",
        message: message
      }),
      contentType: "application/json; charset=UTF-8",
      dataType: "json"
    })
      .done(function(response) {
        markChatSubmitted();
        setChatLockedState(true);
        chatWidget.fadeOut();
      })
      .fail(function(xhr) {
        appendChatMessage("bot", getAjaxErrorMessage(xhr));
        chatInput.prop("disabled", false);
        chatSendButton.prop("disabled", false);
        chatStatus.text("Please try again.");
      });

    return false;
  }

  chatSendButton.on("click", submitChatMessage);

  chatInput.on("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitChatMessage();
    }
  });
})(jQuery);
