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
  // Chat Widget Configuration
  var chatWidget = $("#chatWidget");
  var chatToggle = $("#chatLauncher");
  var chatClose = $("#chatDismiss");
  var chatInput = $("#chatInput");
  var chatSendButton = $("#chatSendBtn");
  var chatMessagesContainer = $("#chatMessages");
  var chatStatus = $("#chatStatus");

  if (!chatWidget.length || !chatToggle.length || !chatInput.length || !chatSendButton.length) {
    return;
  }

  // Chat State
  var conversationHistory = [];
  var isLoading = false;

  // Bot responses for quick replies
  var botResponses = {
    "house-hunt": "Great! I can help you find the perfect home. Are you looking for a residential property, investment property, or something specific?",
    "selling": "Selling? I'd be happy to help! What type of property are you looking to sell, and what's your timeline?",
    "mortgage": "Excellent question! As a Mortgage Loan Officer, I offer competitive rates and flexible financing options. Would you like to discuss your financing needs?"
  };

  function getApiEndpoint() {
    if (window.CONTACT_FORM_CONFIG && window.CONTACT_FORM_CONFIG.apiEndpoint) {
      return $.trim(window.CONTACT_FORM_CONFIG.apiEndpoint);
    }
    return "/api/contact";
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
    
    messageHtml += '</div>';
    messageHtml += '<span class="message-time">' + messageTime + '</span>';
    messageHtml += '</div>';
    
    chatMessagesContainer.append(messageHtml);
    scrollToBottom();
    
    conversationHistory.push({ type: type, message: text, time: messageTime });
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

  function sendMessage() {
    var message = $.trim(chatInput.val());

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

    // Show typing indicator
    showTypingIndicator();

    // Simulate bot response (can be replaced with API call)
    setTimeout(function() {
      removeTypingIndicator();
      
      // Send to backend
      $.ajax({
        url: getApiEndpoint(),
        method: "POST",
        data: JSON.stringify({
          source: "chat",
          message: message,
          conversationHistory: conversationHistory
        }),
        contentType: "application/json; charset=UTF-8",
        dataType: "json"
      })
        .done(function(response) {
          var botMessage = (response && response.message) || "Thanks for reaching out! We'll get back to you soon.";
          addMessageToChat(botMessage, 'bot');
          showChatStatus("Message received!", 2500);
        })
        .fail(function(xhr) {
          var errorMsg = "I'm having trouble connecting right now. Please try again or contact us at +1 817-932-2649.";
          if (xhr && xhr.status === 0) {
            errorMsg = "Could not reach the server. Please ensure the server is running.";
          }
          addMessageToChat(errorMsg, 'bot');
          showChatStatus("Error sending message. Please try again.", 3000);
        })
        .always(function() {
          isLoading = false;
          chatSendButton.prop('disabled', false);
          chatInput.prop('disabled', false);
          chatInput.focus();
        });
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
    
    // Set input and send
    chatInput.val(replyText);
    
    // Add user message
    addMessageToChat(replyText, 'user');
    chatInput.val('').focus();
    isLoading = true;
    chatSendButton.prop('disabled', true);
    chatInput.prop('disabled', true);

    // Show typing indicator
    showTypingIndicator();

    // Get bot response
    setTimeout(function() {
      removeTypingIndicator();
      
      var botResponse = botResponses[replyValue] || "Thanks for your interest! How can I help you further?";
      addMessageToChat(botResponse, 'bot');
      
      isLoading = false;
      chatSendButton.prop('disabled', false);
      chatInput.prop('disabled', false);
    }, 600);
  });
})(jQuery);
