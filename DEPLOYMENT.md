# Deployment Guide

Your contact form requires a Node.js backend running. This guide covers the easiest options.

---

## Quick Setup Checklist

- [ ] Choose a Node.js hosting platform (Render, Railway, or Vercel)
- [ ] Push this code to GitHub
- [ ] Deploy the backend
- [ ] Set environment variables
- [ ] Update your domain DNS or routing
- [ ] Test `/health` endpoint
- [ ] Test contact form submission

---

## Option 1: Render (Recommended - Free Tier Available)

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tabhikumar/Sameer-Barakoti.git
git push -u origin main
```

### 2. Create Render account

Go to https://render.com and sign up with GitHub.

### 3. Create a new Web Service

1. Click **New → Web Service**
2. Select your GitHub repository
3. Configure:
   - **Name**: `sameerbarakoti-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (starts at $7/month if you need more)

### 4. Add Environment Variables

In the Render dashboard, go to **Environment** and add:

```
APP_PORT=3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CONTACT_TO_EMAIL=your-email@gmail.com
CONTACT_FROM_EMAIL=your-email@gmail.com
CONTACT_FROM_NAME=Sameer Barakoti
```

**For Gmail:**
- Use [App Passwords](https://myaccount.google.com/apppasswords) instead of your regular password
- Enable 2FA first

### 5. Deploy

Click **Create Web Service** and wait for deployment (2-5 minutes).

Your backend will be available at: `https://sameerbarakoti-api.onrender.com`

### 6. Update Frontend

In `js/contact-form-config.js`, add before it loads:

```html
<script>
  window.CONTACT_FORM_API_ENDPOINT = "https://sameerbarakoti-api.onrender.com/api/contact";
</script>
```

Or in your HTML `<head>`:

```html
<script>
  window.CONTACT_FORM_API_ENDPOINT = "https://sameerbarakoti.com/api/contact";
</script>
<script src="js/contact-form-config.js"></script>
```

---

## Option 2: Railway.app (Free $5/month Credit)

### 1. Push to GitHub (same as Render)

### 2. Create Railway account

Go to https://railway.app and sign up with GitHub.

### 3. Create new project

1. Click **New Project → GitHub Repo**
2. Select your repository

### 4. Add Node.js service

1. Click **Add Service → GitHub Repo**
2. Configure build/start commands automatically

### 5. Set Environment Variables

Click **Variables** and add the same SMTP vars as above.

### 6. Deploy

Railway auto-deploys on push. Your URL is auto-generated.

---

## Option 3: Vercel (Serverless)

> **Note**: Vercel is for static sites by default. For Node.js, use an API route.

This project includes the Vercel API route at `/api/contact.js`, so the deployed endpoint will be:

```text
https://www.sameerbarakoti.com/api/contact
```

In Vercel, add these Environment Variables before redeploying:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CONTACT_TO_EMAIL=your-email@gmail.com
CONTACT_FROM_EMAIL=your-email@gmail.com
CONTACT_FROM_NAME=Sameer Barakoti
```

After pushing this repository to GitHub, redeploy the project in Vercel. If the route still shows `404: NOT_FOUND`, confirm the `api/contact.js` file exists in the deployed GitHub branch selected by Vercel.

You can also open this URL in your browser after redeploying:

```text
https://www.sameerbarakoti.com/api/contact
```

It should return JSON with `"status": "ok"` and `"configured": true`. If `"configured"` is false, one or more required Environment Variables are missing in Vercel.

---

## Option 4: Self-Hosted VPS (DigitalOcean, Linode, AWS)

### 1. Rent a server ($5-20/month)

### 2. SSH into server

```bash
ssh root@YOUR_SERVER_IP
```

### 3. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 4. Clone your repo

```bash
cd /home && git clone https://github.com/tabhikumar/Sameer-Barakoti.git
cd profile-bootstrap
npm install
```

### 5. Create .env file

```bash
cat > .env << EOF
APP_PORT=3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CONTACT_TO_EMAIL=your-email@gmail.com
CONTACT_FROM_EMAIL=your-email@gmail.com
CONTACT_FROM_NAME=Sameer Barakoti
EOF
```

### 6. Run with PM2 (process manager)

```bash
sudo npm install -g pm2
pm2 start server.js --name contact-api
pm2 startup
pm2 save
```

### 7. Set up reverse proxy with Nginx

```bash
sudo apt-get install nginx
```

Edit `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80;
    server_name www.sameerbarakoti.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 8. Enable HTTPS with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d www.sameerbarakoti.com
```

---

## Testing Your Deployment

Once deployed, test the backend:

### 1. Check health endpoint

```bash
curl https://YOUR_BACKEND_URL/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "smtpUser": "your-email@gmail.com"
}
```

### 2. Test contact form

Go to your site and submit the contact form. Check:
- Browser console for errors
- Server logs for "Contact mail to: ..."
- Your inbox for the email

### 3. Debugging

If form submission fails, check:

| Issue | Solution |
|-------|----------|
| 404 error on `/api/contact` | Backend not deployed or URL wrong in frontend |
| CORS error in console | Make sure server sets `Access-Control-Allow-Origin: *` |
| "Could not reach server" error | Backend URL is unreachable or using HTTP instead of HTTPS |
| Email not arriving | Check SMTP credentials in `.env` and server logs |

---

## Connecting Your Domain

### If using Render/Railway:

Update your domain's DNS settings:

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add a CNAME record:
   - **Name**: `@` or `www`
   - **Points to**: Your Render/Railway domain (e.g., `sameerbarakoti-api.onrender.com`)
3. Wait 5-30 minutes for DNS to propagate

### If using a VPS:

Point your domain's A record to your server's IP address.

---

## Environment Variables Reference

| Variable | Example | Required |
|----------|---------|----------|
| `APP_PORT` | `3000` | No (defaults to 3000) |
| `SMTP_HOST` | `smtp.gmail.com` | Yes |
| `SMTP_PORT` | `587` | Yes |
| `SMTP_SECURE` | `false` | Yes |
| `SMTP_USER` | `contact@example.com` | Yes |
| `SMTP_PASS` | `app-password` | Yes |
| `CONTACT_TO_EMAIL` | `contact@example.com` | Yes |
| `CONTACT_FROM_EMAIL` | `contact@example.com` | Yes |
| `CONTACT_FROM_NAME` | `Sameer Barakoti` | No |
| `CONTACT_BCC_EMAIL` | `backup@example.com` | No |

---

## Gmail App Password Setup

1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Create App Password: https://myaccount.google.com/apppasswords
3. Select **Mail** and **Windows PC** (or your device)
4. Copy the 16-character password and use it as `SMTP_PASS`

---

## Troubleshooting

### Backend deployed but frontend can't reach it

Check the browser's Network tab (DevTools → Network):
- Is the request being made to the correct URL?
- Is the response HTTPS? (If site is HTTPS, API must be too)
- Are there CORS errors?

### Email not sending

Check server logs for the actual error. Common issues:
- **Gmail**: App password wrong or 2FA not enabled
- **SMTP credentials**: Host/user/pass mismatch
- **Firewall**: Server can't reach SMTP host on port 587

### "SMTP verification failed" on startup

The server couldn't connect to your SMTP host. Check:
- `SMTP_HOST` and `SMTP_PORT` are correct
- `SMTP_USER` and `SMTP_PASS` are correct
- Network allows outbound SMTP connections

---

## Support

For platform-specific issues:
- **Render**: https://render.com/docs
- **Railway**: https://docs.railway.app
- **Vercel**: https://vercel.com/docs
- **Gmail**: https://support.google.com/mail/answer/185833

---

## Next Steps

1. Choose a hosting option above
2. Push this repo to GitHub
3. Follow the setup steps
4. Test with the checklist at the top
5. Let me know if you hit any issues!
