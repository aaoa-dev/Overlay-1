# 🚀 Deployment Guide - Static Hosting

Deploy your Twitch overlay system to Cloudflare Pages, GitHub Pages, or any static hosting service!

## 🔐 Why simple authentication?

The dashboard uses a secure client-side authentication flow that is perfect for static hosting because:

- ✅ **No backend required** - Everything runs client-side
- ✅ **No environment variables** - No build-time configuration
- ✅ **Secure** - Tokens stored locally in browser only
- ✅ **Read-only access** - Token only has chat read permissions

---

## 🎯 Quick Start

### **Step 1: Build Your Project**

```bash
npm run build
```

This creates a `dist/` folder with all your files ready for deployment.

### **Step 2: Deploy to Hosting**

Choose your hosting platform:

---

## 🌐 Cloudflare Pages

### **Deploy via Dashboard:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Workers & Pages** → **Create application** → **Pages**
3. Connect your GitHub repository
4. **Build settings:**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Click **Save and Deploy**

---

## 📄 GitHub Pages

### **Method 1: GitHub Actions (Recommended)**

1. Create or ensure `.github/workflows/deploy.yml` exists with the correct Node version and build command.
2. **Enable GitHub Pages:**
   - Go to repository **Settings** → **Pages**
   - Source: **GitHub Actions**
3. **Push to GitHub:**
```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

---

## 🎯 Using Your Deployed Overlays

### **Step 1: Authenticate**

1. Visit your deployed site (e.g., `https://your-domain.com`).
2. Click **"Connect with Twitch"** and log in.
3. Your authentication details are now stored in your browser's `localStorage` for that domain.

### **Step 2: Add to OBS**

1. Use the **Dashboard** to customize your widgets.
2. Click **"Copy OBS URL"** for any widget.
3. In OBS: **Sources** → **Add** → **Browser**.
4. Paste the URL and set the dimensions.

### **Available Overlays:**

| Overlay | Path | Purpose |
|---------|------|---------|
| **Dashboard** | `/index.html` | Central hub |
| **Modern Chat** | `/chats/chat.html` | Pill-style chat |
| **Thermal Chat** | `/chats/vertical-chat.html` | Receipt-style chat |
| **Smart Alerts** | `/alerts/alerts.html` | Welcome messages |
| **Follower Count** | `/widgets/followers.html` | Goal tracker |
| **Subscriber Count** | `/widgets/subscribers.html` | Goal tracker |

---

## 🎨 Customizing Base Path

If your site is not at the root (e.g., GitHub Pages with repo name like `https://username.github.io/repo-name/`), update `vite.config.js`:

```javascript
export default defineConfig({
  base: '/repo-name/',  // Important for sub-directory hosting
  // ...
});
```

---

## 🐛 Troubleshooting

### **Overlays show "Not authenticated":**
- Ensure you have logged in via the Dashboard on the **same domain** you are using in OBS.
- If using in OBS, ensure you are using the URL provided by the "Copy OBS URL" button, as it includes necessary parameters.

### **Assets not loading (404 errors):**
- Check `vite.config.js` has correct `base` path for your hosting environment.
- Rebuild and redeploy.
