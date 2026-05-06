# Sameer Barakoti Portfolio & Contact System

A professional portfolio website with a working SMTP-powered contact form using Node.js and Express.

---

## Features

✅ **Responsive Design** - Mobile, tablet, and desktop layouts  
✅ **Contact Form** - Real-time validation and SMTP email delivery  
✅ **Chat Widget** - Built-in chat for quick inquiries  
✅ **CORS Enabled** - Works across domains  
✅ **Production Ready** - Environment-based configuration  

---

## Project Structure

```
├── index.html                 # Main website
├── server.js                  # Node.js backend (handles form submissions)
├── package.json              # Dependencies
├── .env.example              # Environment variables template
│
├── js/
│   ├── custom.js             # Contact form & chat widget logic
│   ├── contact-form-config.js # API endpoint configuration
│   └── [other libraries]
│
├── css/
│   ├── style.css             # Main stylesheet
│   ├── chat.css              # Chat widget styling
│   └── [bootstrap, icons]
│
└── DEPLOYMENT.md             # Hosting & deployment guide
```

---

## Local Development

### Prerequisites

- Node.js 14+
- npm

### Setup

1. Clone the repo
   ```bash
   git clone https://github.com/YOUR_USERNAME/profile-bootstrap.git
   cd profile-bootstrap
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create `.env` file (copy from `.env.example`)
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your SMTP credentials
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   CONTACT_TO_EMAIL=your-email@gmail.com
   ...
   ```

5. Start the server
   ```bash
   npm start
   ```

6. Open in browser
   ```
   http://localhost:3000
   ```

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
APP_PORT=3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@example.com
SMTP_PASS=your-app-password
CONTACT_TO_EMAIL=contact@example.com
CONTACT_FROM_EMAIL=contact@example.com
CONTACT_FROM_NAME=Your Name
CONTACT_BCC_EMAIL=optional-backup@example.com
```

See `.env.example` for all available options.

---

## API Endpoints

### POST `/api/contact`

Submit a contact form message.

**Request:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "subject": "Website Inquiry",
  "message": "I'm interested in your services...",
  "source": "contact"
}
```

**Response (success):**
```json
{
  "message": "Thanks! Your message has been sent successfully."
}
```

**Response (error):**
```json
{
  "message": "Please enter a valid email address."
}
```

### GET `/health`

Check if the backend is running.

**Response:**
```json
{
  "status": "ok",
  "environment": "production",
  "smtpUser": "contact@example.com"
}
```

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for step-by-step instructions for:

- ✅ Render (Recommended)
- ✅ Railway.app
- ✅ Vercel
- ✅ Self-hosted VPS (DigitalOcean, Linode, AWS)

---

## How the Contact Form Works

### Frontend → Backend Flow

1. User fills contact form on `index.html`
2. Form data is sent to `/api/contact` via AJAX
3. Server validates the email and message
4. If valid, sends email via SMTP using Nodemailer
5. Returns success/error response to browser
6. User sees confirmation message

### Key Files

| File | Purpose |
|------|---------|
| `js/contact-form-config.js` | Configures API endpoint |
| `js/custom.js` | Handles form submission & chat |
| `server.js` | Backend: validates & sends email |

---

## Testing

### Local Testing

1. Start the server: `npm start`
2. Fill the contact form on http://localhost:3000
3. Check your email inbox
4. Check server logs in terminal

### Production Testing

Once deployed:

1. Check health endpoint
   ```bash
   curl https://www.sameerbarakoti.com/health
   ```

2. Fill the form on your live site
3. Verify email arrives

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not reach server" error | Backend not deployed or API endpoint wrong |
| Email not arriving | Check SMTP credentials in `.env` |
| CORS error in console | Make sure backend is running and accessible |
| "Missing SMTP configuration" error | Fill all required env vars in `.env` |

---

## Security Notes

- 🔒 Never commit `.env` to git (it contains passwords)
- 🔒 Use app-specific passwords for Gmail, not your regular password
- 🔒 Enable HTTPS on both frontend and backend
- 🔒 CORS is open to all origins (`Access-Control-Allow-Origin: *`) — adjust for production if needed

---

## Support & Questions

- See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment questions
- Check server logs: `npm start` will show errors
- Test the API with: `curl https://your-domain/health`

---

## License

This is a custom portfolio project.
