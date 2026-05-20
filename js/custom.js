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
      return (
        "Could not reach the contact server. " +
        "Make sure your backend is deployed and available at " +
        getApiEndpoint() + ". " +
        "If the website is HTTPS, the contact API must also be HTTPS."
      );
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
  var reviewForm = $("#reviewForm");
  if (!reviewForm.length) {
    return;
  }

  var reviewModal = $("#reviewModal");
  var reviewFormStatus = $("#reviewFormStatus");
  var reviewSubmitButton = $("#reviewSubmitButton");
  var maxImageSize = 2 * 1024 * 1024;
  var allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
  var reviewQueryName = "review_form";
  var reviewQueryValue = "true";

  function getApiEndpoint() {
    if (window.CONTACT_FORM_CONFIG && window.CONTACT_FORM_CONFIG.apiEndpoint) {
      return $.trim(window.CONTACT_FORM_CONFIG.apiEndpoint);
    }

    return "/api/contact";
  }

  function setReviewStatus(type, message) {
    reviewFormStatus
      .removeClass("d-none alert-success alert-danger alert-warning")
      .addClass("alert-" + type)
      .text(message);
  }

  function getAjaxErrorMessage(xhr) {
    if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
      return xhr.responseJSON.message;
    }

    return "We could not send your review right now.";
  }

  function readImageFile(file) {
    return new Promise(function(resolve, reject) {
      if (!file) {
        reject(new Error("Please choose an image."));
        return;
      }

      if (allowedImageTypes.indexOf(file.type) === -1) {
        reject(new Error("Please upload a JPG, PNG, or WebP image."));
        return;
      }

      if (file.size > maxImageSize) {
        reject(new Error("Please upload an image smaller than 2 MB."));
        return;
      }

      var reader = new FileReader();
      reader.onload = function() {
        resolve({
          fileName: file.name,
          mimeType: file.type,
          dataUrl: reader.result,
        });
      };
      reader.onerror = function() {
        reject(new Error("We could not read the selected image."));
      };
      reader.readAsDataURL(file);
    });
  }

  function hasReviewQuery() {
    return new URLSearchParams(window.location.search).get(reviewQueryName) === reviewQueryValue;
  }

  function setReviewQuery() {
    if (!window.history || !window.history.replaceState) {
      return;
    }

    var url = new URL(window.location.href);
    url.searchParams.set(reviewQueryName, reviewQueryValue);
    window.history.replaceState({}, "", url.toString());
  }

  function removeReviewQuery() {
    if (!window.history || !window.history.replaceState) {
      return;
    }

    var url = new URL(window.location.href);
    url.searchParams.delete(reviewQueryName);
    window.history.replaceState({}, "", url.toString());
  }

  if (hasReviewQuery()) {
    reviewModal.modal("show");
  }

  reviewModal.on("show.bs.modal", setReviewQuery);
  reviewModal.on("hidden.bs.modal", removeReviewQuery);

  reviewForm.on("submit", function(event) {
    event.preventDefault();

    var formElement = reviewForm.get(0);
    if (!formElement.checkValidity()) {
      formElement.reportValidity();
      return;
    }

    var imageInput = reviewForm.find('[name="image"]').get(0);
    var imageFile = imageInput && imageInput.files && imageInput.files[0];

    reviewSubmitButton.prop("disabled", true).text("Sending...");
    setReviewStatus("warning", "Sending your review...");

    readImageFile(imageFile)
      .then(function(image) {
        $.ajax({
          url: getApiEndpoint(),
          method: "POST",
          data: JSON.stringify({
            source: "review",
            fullName: $.trim(reviewForm.find('[name="fullName"]').val()),
            email: $.trim(reviewForm.find('[name="email"]').val()),
            rating: $.trim(reviewForm.find('[name="rating"]').val()),
            title: $.trim(reviewForm.find('[name="title"]').val()),
            message: $.trim(reviewForm.find('[name="message"]').val()),
            image: image,
          }),
          contentType: "application/json; charset=UTF-8",
          dataType: "json",
        })
          .done(function(response) {
            formElement.reset();
            setReviewStatus(
              "success",
              (response && response.message) || "Thanks! Your review has been sent."
            );
          })
          .fail(function(xhr) {
            setReviewStatus("danger", getAjaxErrorMessage(xhr));
          })
          .always(function() {
            reviewSubmitButton.prop("disabled", false).text("Send Review");
          });
      })
      .catch(function(error) {
        setReviewStatus("danger", error.message);
        reviewSubmitButton.prop("disabled", false).text("Send Review");
      });
  });
})(jQuery);

(function($) {
  // Chat Widget Configuration
  var chatWidget = $("#chatWidget");
  var chatToggle = $("#chatLauncher");
  var chatClose = $("#chatDismiss");
  var chatInput = $("#chatInput");
  var chatSendButton = $("#chatSendBtn");
  var chatMessagesContainer = $("#chatMessages");
  var chatStatus = $("#chatStatus");
  var chatBadge = $("#chatBadge");

  if (!chatWidget.length || !chatToggle.length || !chatInput.length || !chatSendButton.length) {
    return;
  }

  // Chat State
  var conversationHistory = [];
  var isLoading = false;
  var unreadCount = 1;

  // Bot responses for quick replies
  var botResponses = {
    "house-hunt": "Great! I can help you find the perfect home. Are you looking for a residential property, investment property, or something specific?",
    "selling": "Selling? I'd be happy to help. What type of property are you looking to sell, and what's your timeline?",
    "mortgage": "Excellent question. As a Mortgage Loan Officer, I can help with loan options, rates, and pre-approval guidance. What would you like to know first?"
  };

  function getWhatsAppNumber() {
    if (window.CONTACT_FORM_CONFIG && window.CONTACT_FORM_CONFIG.whatsappNumber) {
      return String(window.CONTACT_FORM_CONFIG.whatsappNumber).replace(/\D/g, "");
    }
    return "+18179322649";
  }

  function buildWhatsAppMessage(message) {
    var intro = "Hi Sameer, I am contacting you from your website.";
    return intro + "\n\nMessage: " + message;
  }

  function getWhatsAppUrl(message) {
    return "https://wa.me/" + getWhatsAppNumber() + "?text=" + encodeURIComponent(buildWhatsAppMessage(message));
  }

  function updateUnreadBadge(count) {
    unreadCount = count;
    if (!chatBadge.length) {
      return;
    }

    if (unreadCount > 0 && !chatWidget.is(":visible")) {
      chatBadge.text(unreadCount > 9 ? "9+" : String(unreadCount)).show();
    } else {
      chatBadge.hide();
    }
  }

  function notifyVisitor(title, body) {
    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission === "granted") {
      new Notification(title, { body: body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function(permission) {
        if (permission === "granted") {
          new Notification(title, { body: body });
        }
      });
    }
  }

  function getSmartReply(message, quickReplyValue) {
    var normalized = message.toLowerCase();

    if (quickReplyValue && botResponses[quickReplyValue]) {
      return botResponses[quickReplyValue];
    }

    if (normalized.indexOf("mortgage") !== -1 || normalized.indexOf("loan") !== -1 || normalized.indexOf("rate") !== -1) {
      return botResponses.mortgage;
    }

    if (normalized.indexOf("sell") !== -1 || normalized.indexOf("selling") !== -1) {
      return botResponses.selling;
    }

    if (normalized.indexOf("buy") !== -1 || normalized.indexOf("home") !== -1 || normalized.indexOf("house") !== -1 || normalized.indexOf("property") !== -1) {
      return botResponses["house-hunt"];
    }

    return "Thanks for your message. Please share your name, preferred location, budget, and the best time to contact you, and I'll follow up as soon as possible.";
  }

  function escapeHtml(value) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(value).replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  function getCurrentTime() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
  }

  function addMessageToChat(text, type, options) {
    options = options || {};
    var messageClass = type === 'user' ? 'user-message' : 'bot-message';
    var messageTime = getCurrentTime();
    
    var messageHtml = '<div class="chat-message ' + messageClass + '">';
    messageHtml += '<div class="message-content">';
    messageHtml += '<p>' + escapeHtml(text) + '</p>';
    
    if (options.quickReplies) {
      messageHtml += '<div class="quick-replies">';
      options.quickReplies.forEach(function(reply) {
        messageHtml += '<button class="quick-reply-btn" data-reply="' + reply.value + '">' + escapeHtml(reply.label) + '</button>';
      });
      messageHtml += '</div>';
    }

    if (options.actionUrl && options.actionLabel) {
      messageHtml += '<div class="quick-replies">';
      messageHtml += '<a class="quick-reply-btn chat-action-link" href="' + escapeHtml(options.actionUrl) + '" target="_blank" rel="noopener">' + escapeHtml(options.actionLabel) + '</a>';
      messageHtml += '</div>';
    }
    
    messageHtml += '</div>';
    messageHtml += '<span class="message-time">' + messageTime + '</span>';
    messageHtml += '</div>';
    
    chatMessagesContainer.append(messageHtml);
    scrollToBottom();
    
    conversationHistory.push({ type: type, message: text, time: messageTime });

    if (type !== "user" && !chatWidget.is(":visible")) {
      updateUnreadBadge(unreadCount + 1);
      notifyVisitor("New website chat message", text);
    }
  }

  function scrollToBottom() {
    chatMessagesContainer.scrollTop(chatMessagesContainer[0].scrollHeight);
  }

  function showTypingIndicator() {
    var typingHtml = '<div class="chat-message bot-message typing-indicator">';
    typingHtml += '<div class="message-content">';
    typingHtml += '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    typingHtml += '</div></div>';
    chatMessagesContainer.append(typingHtml);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    chatMessagesContainer.find('.typing-indicator').remove();
  }

  function sendMessage(messageOverride, quickReplyValue) {
    var message = $.trim(messageOverride || chatInput.val());

    if (!message) {
      showChatStatus("Please enter a message.", 2000);
      return false;
    }

    if (isLoading) {
      return false;
    }

    // Add user message to chat
    addMessageToChat(message, 'user');
    chatInput.val('').focus();
    isLoading = true;
    chatSendButton.prop('disabled', true);
    chatInput.prop('disabled', true);
    showChatStatus("Message added to chat.", 2500);

    // Show typing indicator
    showTypingIndicator();

    setTimeout(function() {
      removeTypingIndicator();
      var botMessage = getSmartReply(message, quickReplyValue) + " To receive this on WhatsApp, please tap the button below and press Send in WhatsApp.";
      addMessageToChat(botMessage, 'bot', {
        actionUrl: getWhatsAppUrl(message),
        actionLabel: "Send to WhatsApp"
      });
      showChatStatus("Tap Send to WhatsApp to deliver it.", 3000);
      isLoading = false;
      chatSendButton.prop('disabled', false);
      chatInput.prop('disabled', false);
      chatInput.focus();
    }, 800);

    return false;
  }

  function showChatStatus(message, duration) {
    chatStatus.text(message).stop(true, true).show().delay(duration || 2000).fadeOut(300);
  }

  // Event Handlers
  chatToggle.on('click', function() {
    chatWidget.fadeToggle();
    if (chatWidget.is(':visible')) {
      updateUnreadBadge(0);
      chatInput.focus();
    }
  });

  chatClose.on('click', function() {
    chatWidget.fadeOut();
  });

  chatSendButton.on('click', sendMessage);

  chatInput.on('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  // Quick reply buttons
  $(document).on('click', '.quick-reply-btn', function() {
    var replyValue = $(this).data('reply');
    var replyText = $(this).text();
    sendMessage(replyText, replyValue);
  });

  updateUnreadBadge(unreadCount);
})(jQuery);
