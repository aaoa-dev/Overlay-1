# 🚀 Deployment Guide - Static Hosting

Deploy your Twitch overlay system to Cloudflare Pages, GitHub Pages, or any static hosting service!

## ✨ Why Simple Auth?

The new **Simple Auth** system (`/auth/simple-auth.html`) is perfect for static hosting because:

- ✅ **No backend required** - Everything runs client-side
- ✅ **No OAuth callbacks** - No redirect URL configuration needed
- ✅ **Works on any domain** - Deploy anywhere instantly
- ✅ **No environment variables** - No build-time configuration
- ✅ **User-friendly** - Simple copy/paste authentication
- ✅ **Secure** - Tokens stored locally in browser only

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

### **Deploy via Wrangler CLI:**

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy dist --project-name=twitch-overlay
```

### **Custom Domain:**

1. In Pages dashboard, go to **Custom domains**
2. Click **Set up a custom domain**
3. Follow DNS configuration instructions

**Your overlays will be at:**
- `https://your-site.pages.dev/auth/simple-auth.html`
- `https://your-site.pages.dev/Chat/vertical-chat.html`
- etc.

---

## 📄 GitHub Pages

### **Method 1: GitHub Actions (Recommended)**

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

2. **Enable GitHub Pages:**
   - Go to repository **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** → **/ (root)**
   - Click **Save**

3. **Push to GitHub:**
```bash
git add .
git commit -m "Add deployment workflow"
git push origin main
```

### **Method 2: Manual Deploy**

```bash
# Build the project
npm run build

# Install gh-pages
npm install -g gh-pages

# Deploy
gh-pages -d dist
```

**Your overlays will be at:**
- `https://username.github.io/repo-name/auth/simple-auth.html`
- `https://username.github.io/repo-name/Chat/vertical-chat.html`
- etc.

---

## 🎨 Netlify

### **Deploy via CLI:**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### **Deploy via Git:**

1. Go to [netlify.com](https://netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository
4. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy site**

---

## 🔧 Vercel

### **Deploy via CLI:**

```bash
# Install Vercel CLI
npm install -g vercel

# Build
npm run build

# Deploy
vercel --prod
```

### **Deploy via Git:**

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. **Framework Preset:** Vite
5. **Build command:** `npm run build`
6. **Output directory:** `dist`
7. Click **Deploy**

---

## 🎯 Using Your Deployed Overlays

### **Step 1: Authenticate**

1. Visit: `https://your-domain.com/auth/simple-auth.html`
2. Click **"Get Token from Twitch"**
3. Authorize on Twitch and copy your token
4. Paste token and click **"Save & Connect"**

### **Step 2: Add to OBS**

1. In OBS: **Sources** → **Add** → **Browser**
2. **URL:** Your deployed overlay URL
   - Example: `https://your-site.pages.dev/Chat/vertical-chat.html`
3. **Width:** 450 (for thermal chat)
4. **Height:** 1080
5. Click **OK**

### **Available Overlays:**

| Overlay | Path | Purpose |
|---------|------|---------|
| **Simple Auth** | `/auth/simple-auth.html` | Authenticate once |
| **Thermal Chat** | `/Chat/vertical-chat.html` | Receipt-style chat |
| **Horizontal Chat** | `/Chat/chat.html` | Traditional chat |
| **Alerts** | `/alerts-refactored.html` | Welcome alerts |
| **Follower Count** | `/followers.html` | Follower counter |
| **Subscriber Count** | `/subscribers.html` | Sub counter |

---

## 🔐 Security Notes

### **Is this secure?**

✅ **YES!** Here's why:

1. **No server storage** - Tokens never leave your browser
2. **localStorage only** - Stored locally on your machine
3. **No API endpoints** - No backend to compromise
4. **Public Client ID** - Uses Twitch's public CLI client ID
5. **Read-only access** - Token only has chat read permissions

### **What if someone gets my token?**

- They can only read your chat (same as anyone viewing your stream)
- They cannot modify your channel settings
- They cannot access your account
- You can revoke tokens anytime at: https://www.twitch.tv/settings/connections

---

## 🎨 Customizing Base Path

If your site is not at the root (e.g., GitHub Pages with repo name), update `vite.config.js`:

```javascript
export default defineConfig({
  base: '/your-repo-name/',  // Add this line
  plugins: [],
  // ...
});
```

Then rebuild:
```bash
npm run build
```

---

## 🧪 Testing Locally Before Deploy

```bash
# Build
npm run build

# Preview production build
npm run preview
```

Visit the preview URL to test as if it were deployed!

---

## 📊 Analytics (Optional)

### **Add Cloudflare Web Analytics:**

1. In Cloudflare dashboard: **Web Analytics**
2. Add your site
3. Copy the beacon script
4. Add to `index.html` before `</head>`

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

---

## 🔄 Updating Your Deployment

### **Cloudflare Pages / Vercel / Netlify:**
Just push to your Git repository - automatic deployment! 🎉

### **Manual Deployments:**
```bash
npm run build
# Then re-run your deployment command
```

---

## 🐛 Troubleshooting

### **Overlays show "Not authenticated":**
- Open `/auth/simple-auth.html` on the deployed site
- Authenticate with your Twitch account
- Token is stored in browser for that domain

### **Assets not loading (404 errors):**
- Check `vite.config.js` has correct `base` path
- Rebuild: `npm run build`
- Clear browser cache

### **Chat not connecting:**
- Check browser console for errors
- Verify token is saved (check localStorage in DevTools)
- Test connection on simple-auth page

### **Cross-origin errors:**
- Make sure you're accessing via `https://` not `file://`
- Check that Twitch API calls are working

---

## 📱 Mobile Responsive

All overlays work on mobile browsers for testing:
- Visit simple-auth page on phone
- Authenticate
- View overlays on mobile

---

## 🎯 Recommended Setup

1. **Deploy to Cloudflare Pages** (free, fast, easy)
2. **Add custom domain** (optional but professional)
3. **Authenticate once** via simple-auth page
4. **Add browser sources** in OBS with deployed URLs
5. **Stream!** 🎉

---

## 💡 Pro Tips

1. **Bookmark simple-auth** - Quick access to authentication
2. **Test locally first** - Run `npm run preview` before deploying
3. **Use custom domain** - Cleaner URLs for OBS
4. **Version your deployments** - Tag releases in Git
5. **Monitor analytics** - See which overlays are used most

---

## 🎉 Example URLs

After deployment to Cloudflare Pages as `twitch-overlay`:

- Auth: `https://twitch-overlay.pages.dev/auth/simple-auth.html`
- Thermal Chat: `https://twitch-overlay.pages.dev/Chat/vertical-chat.html`
- Followers: `https://twitch-overlay.pages.dev/followers.html`

Just replace `twitch-overlay.pages.dev` with your actual domain!

---

## 📞 Need Help?

Common deployment docs:
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Netlify Docs](https://docs.netlify.com/)
- [Vercel Docs](https://vercel.com/docs)

---

**Ready to deploy?** Run `npm run build` and choose your platform! 🚀

