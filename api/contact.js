require("dotenv").config();

const nodemailer = require("nodemailer");

function getEnv(name) {
  const value = process.env[name];
  return value ? value.trim() : "";
}

function getFirstEnv(names) {
  for (const name of names) {
    const value = getEnv(name);
    if (value) {
      return value;
    }
  }

  return "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMailbox(name, email) {
  return "\"" + String(name).replace(/"/g, "") + "\" <" + email + ">";
}

function parseImageAttachment(image) {
  if (!image || typeof image !== "object") {
    return null;
  }

  const dataUrl = String(image.dataUrl || "");
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    throw new Error("Invalid review image.");
  }

  const content = Buffer.from(match[2], "base64");
  const maxBytes = 2 * 1024 * 1024;

  if (!content.length || content.length > maxBytes) {
    throw new Error("Review image must be smaller than 2 MB.");
  }

  const extensionByType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const mimeType = match[1];
  const fallbackName = "review-image." + extensionByType[mimeType];
  const fileName = String(image.fileName || fallbackName).replace(/[^\w.\- ]/g, "") || fallbackName;

  return {
    filename: fileName,
    content: content,
    contentType: mimeType,
  };
}

function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  if (req.body && typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (error) {
      return Promise.reject(new Error("Invalid JSON body."));
    }
  }

  return new Promise(function(resolve, reject) {
    let rawBody = "";

    req.on("data", function(chunk) {
      rawBody += chunk;
    });

    req.on("end", function() {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

function createTransporter() {
  const host = getFirstEnv(["SMTP_HOST", "MAIL_HOST"]);
  const port = Number(getFirstEnv(["SMTP_PORT", "MAIL_PORT"]) || 587);
  const encryption = getFirstEnv(["SMTP_SECURE", "MAIL_ENCRYPTION"]).toLowerCase();
  const secure = encryption === "true" || encryption === "ssl";
  const user = getFirstEnv(["SMTP_USER", "MAIL_USERNAME"]);
  const pass = getFirstEnv(["SMTP_PASS", "MAIL_PASSWORD"]);

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP configuration: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.");
  }

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: user,
      pass: pass,
    },
  });
}

function getConfigStatus() {
  return {
    SMTP_HOST: Boolean(getFirstEnv(["SMTP_HOST", "MAIL_HOST"])),
    SMTP_PORT: Boolean(getFirstEnv(["SMTP_PORT", "MAIL_PORT"])),
    SMTP_SECURE: Boolean(getFirstEnv(["SMTP_SECURE", "MAIL_ENCRYPTION"])),
    SMTP_USER: Boolean(getFirstEnv(["SMTP_USER", "MAIL_USERNAME"])),
    SMTP_PASS: Boolean(getFirstEnv(["SMTP_PASS", "MAIL_PASSWORD"])),
    CONTACT_TO_EMAIL: Boolean(getFirstEnv(["CONTACT_TO_EMAIL", "MAIL_TO_ADDRESS"])),
    CONTACT_FROM_EMAIL: Boolean(getFirstEnv(["CONTACT_FROM_EMAIL", "MAIL_FROM_ADDRESS"])),
    CONTACT_FROM_NAME: Boolean(getFirstEnv(["CONTACT_FROM_NAME", "MAIL_FROM_NAME"])),
  };
}

function hasRequiredConfig(configStatus) {
  return (
    configStatus.SMTP_HOST &&
    configStatus.SMTP_USER &&
    configStatus.SMTP_PASS &&
    configStatus.CONTACT_TO_EMAIL
  );
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");

  const method = String(req.method || "").toUpperCase();

  if (method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (method === "GET") {
    const configStatus = getConfigStatus();

    res.status(200).json({
      status: "ok",
      method: method,
      configured: hasRequiredConfig(configStatus),
      config: configStatus,
    });
    return;
  }

  if (method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.status(405).json({
      message: "Method " + (method || "UNKNOWN") + " not allowed.",
    });
    return;
  }

  try {
    const configStatus = getConfigStatus();
    if (!hasRequiredConfig(configStatus)) {
      res.status(500).json({
        message: "Your message could not be sent right now. Please try again later.",
        config: configStatus,
      });
      return;
    }

    const body = await readBody(req);
    const source = String(body.source || "contact").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const title = String(body.title || "").trim();
    const rating = String(body.rating || "").trim();
    const message = String(body.message || "").trim();
    const isChatSubmission = source === "chat";
    const isReviewSubmission = source === "review";

    if (!message || (!isChatSubmission && !isReviewSubmission && (!fullName || !email || !subject))) {
      res.status(400).json({
        message: "Please fill in all required fields.",
      });
      return;
    }

    if (isReviewSubmission && (!fullName || !email || !title || !rating || !body.image)) {
      res.status(400).json({
        message: "Please fill in all review fields and upload an image.",
      });
      return;
    }

    if (!isChatSubmission && !isValidEmail(email)) {
      res.status(400).json({
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (isReviewSubmission && !/^[1-5]$/.test(rating)) {
      res.status(400).json({
        message: "Please select a valid review rating.",
      });
      return;
    }

    const smtpUser = getFirstEnv(["SMTP_USER", "MAIL_USERNAME"]);
    const contactToEmail = getFirstEnv(["CONTACT_TO_EMAIL", "MAIL_TO_ADDRESS"]);
    const contactBccEmail = getFirstEnv(["CONTACT_BCC_EMAIL", "MAIL_BCC_ADDRESS"]);
    const contactFromEmail = getFirstEnv(["CONTACT_FROM_EMAIL", "MAIL_FROM_ADDRESS"]) || smtpUser;
    const contactFromName = getFirstEnv(["CONTACT_FROM_NAME", "MAIL_FROM_NAME"]) || "Website Contact";

    if (!contactToEmail || !contactFromEmail) {
      throw new Error("Missing contact email configuration: CONTACT_TO_EMAIL is required.");
    }

    const reviewAttachment = isReviewSubmission ? parseImageAttachment(body.image) : null;
    const mailSubject = isChatSubmission
      ? "Website Chat Lead"
      : isReviewSubmission
        ? "Website Review Submission: " + title
        : "Portfolio Contact: " + subject;
    const textBody = isChatSubmission
      ? [
          "You received a new chat widget message.",
          "",
          "Source: Chat Widget",
          "",
          "Message:",
          message,
        ].join("\n")
      : isReviewSubmission
        ? [
            "You received a new website review.",
            "",
            "Name: " + fullName,
            "Email: " + email,
            "Rating: " + rating + " Stars",
            "Title: " + title,
            "",
            "Review:",
            message,
            "",
            "The submitted image is attached.",
          ].join("\n")
      : [
          "You received a new contact form message.",
          "",
          "Name: " + fullName,
          "Email: " + email,
          "Subject: " + subject,
          "",
          "Message:",
          message,
        ].join("\n");
    const htmlBody = isChatSubmission
      ? [
          "<h2>New Chat Widget Message</h2>",
          "<p><strong>Source:</strong> Chat Widget</p>",
          "<p><strong>Message:</strong></p>",
          "<p>" + escapeHtml(message).replace(/\n/g, "<br>") + "</p>",
        ].join("")
      : isReviewSubmission
        ? [
            "<h2>New Website Review</h2>",
            "<p><strong>Name:</strong> " + escapeHtml(fullName) + "</p>",
            "<p><strong>Email:</strong> " + escapeHtml(email) + "</p>",
            "<p><strong>Rating:</strong> " + escapeHtml(rating) + " Stars</p>",
            "<p><strong>Title:</strong> " + escapeHtml(title) + "</p>",
            "<p><strong>Review:</strong></p>",
            "<p>" + escapeHtml(message).replace(/\n/g, "<br>") + "</p>",
            "<p>The submitted image is attached.</p>",
          ].join("")
      : [
          "<h2>New Contact Form Message</h2>",
          "<p><strong>Name:</strong> " + escapeHtml(fullName) + "</p>",
          "<p><strong>Email:</strong> " + escapeHtml(email) + "</p>",
          "<p><strong>Subject:</strong> " + escapeHtml(subject) + "</p>",
          "<p><strong>Message:</strong></p>",
          "<p>" + escapeHtml(message).replace(/\n/g, "<br>") + "</p>",
        ].join("");

    const transporter = createTransporter();

    await transporter.sendMail({
      from: formatMailbox(contactFromName, contactFromEmail),
      sender: smtpUser,
      to: contactToEmail,
      bcc: contactBccEmail || undefined,
      replyTo: isChatSubmission ? undefined : email,
      envelope: {
        from: smtpUser,
        to: contactBccEmail ? [contactToEmail, contactBccEmail] : [contactToEmail],
      },
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
      attachments: reviewAttachment ? [reviewAttachment] : undefined,
    });

    res.status(200).json({
      message: isReviewSubmission
        ? "Thanks! Your review has been sent successfully."
        : "Thanks! Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("Contact API error:", error.message);
    res.status(500).json({
      message: "Your message could not be sent right now. Please try again later.",
    });
  }
};
