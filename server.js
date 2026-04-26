require("dotenv").config();

const path = require("path");
const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
const port = Number(process.env.APP_PORT || process.env.WEB_PORT || 3000);
const smtpUser = getRequiredEnv("SMTP_USER");
const transporter = createTransporter();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use(express.static(__dirname));

function getRequiredEnv(name) {
  const value = process.env[name];
  return value ? value.trim() : "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createTransporter() {
  const host = getRequiredEnv("SMTP_HOST");
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = smtpUser;
  const pass = getRequiredEnv("SMTP_PASS");

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP configuration.");
  }

  return nodemailer.createTransport({
    host: host,
    port: smtpPort,
    secure: secure,
    auth: {
      user: user,
      pass: pass,
    },
  });
}

app.post("/api/contact", async function(req, res) {
  try {
    const source = String(req.body.source || "contact").trim().toLowerCase();
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim();
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();
    // const website = String(req.body.website || "").trim();

    // if (website) {
    //   return res.status(400).json({
    //     message: "Spam submission rejected.",
    //   });
    // }

    const isChatSubmission = source === "chat";

    if (!message || (!isChatSubmission && (!fullName || !email || !subject))) {
      return res.status(400).json({
        message: "Please fill in all required fields.",
      });
    }

    if (!isChatSubmission && !isValidEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    const contactToEmail = getRequiredEnv("CONTACT_TO_EMAIL");
    const contactBccEmail = getRequiredEnv("CONTACT_BCC_EMAIL");
    const contactFromEmail = getRequiredEnv("CONTACT_FROM_EMAIL") || smtpUser;
    const contactFromName = getRequiredEnv("CONTACT_FROM_NAME") || "Website Contact";

    if (!contactToEmail || !contactFromEmail) {
      throw new Error("Missing contact email configuration.");
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

    const info = await transporter.sendMail({
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

    console.log("Contact mail to:", contactToEmail);
    console.log("Contact mail accepted:", info.accepted);
    console.log("Contact mail rejected:", info.rejected);
    console.log("Contact mail messageId:", info.messageId);
    console.log("Contact mail response:", info.response);

    return res.json({
      message: "Thanks! Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("Contact form error:", error.message);
    return res.status(500).json({
      message: "Your message could not be sent right now. Please try again later.",
    });
  }
});

app.get("*", function(req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, function() {
  console.log("Server running at http://localhost:3000:" + port);
  transporter
    .verify()
    .then(function() {
      console.log("SMTP connection verified for:", smtpUser);
    })
    .catch(function(error) {
      console.error("SMTP verification failed:", error.message);
    });
});

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMailbox(name, email) {
  return "\"" + String(name).replace(/"/g, "") + "\" <" + email + ">";
}
