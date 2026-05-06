require("dotenv").config();

const nodemailer = require("nodemailer");

function getEnv(name) {
  const value = process.env[name];
  return value ? value.trim() : "";
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
  const host = getEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");

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
    SMTP_HOST: Boolean(getEnv("SMTP_HOST")),
    SMTP_PORT: Boolean(process.env.SMTP_PORT),
    SMTP_SECURE: Boolean(process.env.SMTP_SECURE),
    SMTP_USER: Boolean(getEnv("SMTP_USER")),
    SMTP_PASS: Boolean(getEnv("SMTP_PASS")),
    CONTACT_TO_EMAIL: Boolean(getEnv("CONTACT_TO_EMAIL")),
    CONTACT_FROM_EMAIL: Boolean(getEnv("CONTACT_FROM_EMAIL")),
    CONTACT_FROM_NAME: Boolean(getEnv("CONTACT_FROM_NAME")),
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
        message: "Contact email server is not configured in Vercel.",
        config: configStatus,
      });
      return;
    }

    const body = await readBody(req);
    const source = String(body.source || "contact").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const isChatSubmission = source === "chat";

    if (!message || (!isChatSubmission && (!fullName || !email || !subject))) {
      res.status(400).json({
        message: "Please fill in all required fields.",
      });
      return;
    }

    if (!isChatSubmission && !isValidEmail(email)) {
      res.status(400).json({
        message: "Please enter a valid email address.",
      });
      return;
    }

    const smtpUser = getEnv("SMTP_USER");
    const contactToEmail = getEnv("CONTACT_TO_EMAIL");
    const contactBccEmail = getEnv("CONTACT_BCC_EMAIL");
    const contactFromEmail = getEnv("CONTACT_FROM_EMAIL") || smtpUser;
    const contactFromName = getEnv("CONTACT_FROM_NAME") || "Website Contact";

    if (!contactToEmail || !contactFromEmail) {
      throw new Error("Missing contact email configuration: CONTACT_TO_EMAIL is required.");
    }

    const mailSubject = isChatSubmission
      ? "Website Chat Lead"
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
    });

    res.status(200).json({
      message: "Thanks! Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("Contact API error:", error.message);
    res.status(500).json({
      message: "Your message could not be sent right now. Please try again later.",
    });
  }
};
