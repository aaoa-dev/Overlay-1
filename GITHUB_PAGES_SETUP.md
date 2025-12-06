# 🚀 GitHub Pages Setup Guide

## ✅ What We Just Did

1. ✅ Created GitHub Actions workflow (`.github/workflows/deploy.yml`)
2. ✅ Updated `vite.config.js` with correct base path (`/Overlay-1/`)

## 📋 Next Steps

### **Step 1: Update GitHub Pages Source**

You need to change the deployment source from "branch" to "GitHub Actions":

1. Go to your repo: **Settings** → **Pages**
2. Under **"Source"**, change from **"Deploy from a branch"** to **"GitHub Actions"**
3. Click **Save** (if there's a save button)

**Your current setting shows: "Deploy from a branch"**  
**Change it to: "GitHub Actions"** ⚙️

---

### **Step 2: Commit and Push**

Now commit the new files:

```bash
# Add all files
git add .

# Commit
git commit -m "Add GitHub Pages deployment workflow"

# Push to GitHub
git push origin main
```

---

### **Step 3: Watch the Magic! ✨**

1. Go to your repository on GitHub
2. Click the **"Actions"** tab
3. You'll see your workflow running!
4. Wait for it to complete (usually 1-2 minutes)
5. Once done, your site will be live! 🎉

---

## 🌐 Your Live URLs

After deployment completes, your overlays will be at:

- **Auth Page:** `https://aaoa-dev.github.io/Overlay-1/auth/simple-auth.html`
- **Thermal Chat:** `https://aaoa-dev.github.io/Overlay-1/Chat/vertical-chat.html`
- **Horizontal Chat:** `https://aaoa-dev.github.io/Overlay-1/Chat/chat.html`
- **Alerts:** `https://aaoa-dev.github.io/Overlay-1/alerts-refactored.html`
- **Follower Counter:** `https://aaoa-dev.github.io/Overlay-1/followers.html`
- **Subscriber Counter:** `https://aaoa-dev.github.io/Overlay-1/subscribers.html`

---

## 🎯 How to Use After Deployment

### **1. Authenticate**
Visit: `https://aaoa-dev.github.io/Overlay-1/auth/simple-auth.html`

1. Click **"Get Token from Twitch"**
2. Copy your token
3. Paste and click **"Save & Connect"**

### **2. Add to OBS**
Add browser sources with the URLs above!

Example for thermal chat:
- **URL:** `https://aaoa-dev.github.io/Overlay-1/Chat/vertical-chat.html`
- **Width:** 450
- **Height:** 1080

---

## 🔄 Future Updates

After this initial setup, every time you push to the `main` branch:
1. GitHub Actions automatically builds your project
2. Deploys to GitHub Pages
3. Your overlays update! 🎉

Just:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

And wait 1-2 minutes for deployment!

---

## 🐛 Troubleshooting

### **Build fails?**
- Check the Actions tab for error details
- Make sure `package.json` and `package-lock.json` are committed
- Verify Node version compatibility

### **404 errors on overlay pages?**
- Make sure you updated the Source to "GitHub Actions"
- Check that `base: '/Overlay-1/'` is in `vite.config.js`
- Wait a few minutes after deployment

### **Can't authenticate?**
- Make sure you're using HTTPS not HTTP
- Clear browser cache
- Try incognito/private mode

---

## 📊 Monitoring

**Check deployment status:**
1. Go to **Actions** tab
2. See all deployments and their status
3. Click any run to see detailed logs

**View your live site:**
- Go to **Settings** → **Pages**
- See the live URL at the top
- Usually: `https://aaoa-dev.github.io/Overlay-1/`

---

## 🎉 That's It!

Once you complete Steps 1-3 above, you'll have:
- ✅ Automatic deployments on every push
- ✅ Live overlays accessible from anywhere
- ✅ HTTPS security
- ✅ Free hosting forever
- ✅ Custom domain support (optional)

---

## 💡 Pro Tips

1. **Bookmark your auth page** for easy access
2. **Test locally first** with `npm run dev`
3. **Use meaningful commit messages** to track changes
4. **Check Actions tab** if something doesn't work
5. **Wait 1-2 minutes** after pushing for changes to go live

---

**Ready to deploy?** 🚀

1. Change Source to "GitHub Actions" in Settings → Pages
2. Run the git commands above
3. Watch it deploy in the Actions tab!

