# 🔧 CORS Fix - Deployment Guide

## ❌ Problem

**Error:**
```
Access to XMLHttpRequest at 'https://campus-crew-three.vercel.app//api/login' 
from origin 'https://campuscrew.vercel.app' has been blocked by CORS policy
```

**Issues:**
1. Double slash in URL (`//api/login`)
2. Frontend domain not allowed in backend CORS
3. Preflight request failing

---

## ✅ Solutions Applied

### 1. Fixed Frontend API URL (Double Slash Issue)

**File:** `frontend/src/utils/apiService.js`

**Before:**
```javascript
const backend = import.meta.env.VITE_BACKEND_LINK
const API_BASE_URL = `${backend}/api` || 'http://localhost:8000/api';
```

**After:**
```javascript
const backend = import.meta.env.VITE_BACKEND_LINK || 'http://localhost:8000';
const cleanBackend = backend.endsWith('/') ? backend.slice(0, -1) : backend;
const API_BASE_URL = `${cleanBackend}/api`;
```

**Result:** ✅ No more double slashes in URLs

---

### 2. Enhanced Backend CORS Configuration

**File:** `backend/index.js`

**Changes:**
- ✅ Added `https://campuscrew.vercel.app` to allowed origins
- ✅ Added better origin handling
- ✅ Added PATCH method support
- ✅ Added exposedHeaders for refresh tokens
- ✅ Proper OPTIONS request handling

**New CORS Config:**
```javascript
const allowedOrigins = [
    frontend_url,
    'https://campuscrew.vercel.app',
    'https://talk-threads-seven.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ['Content-Type', 'Authorization', 'refreshtoken'],
    exposedHeaders: ['refreshtoken'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}))
```

---

### 3. Created Production Environment File

**File:** `frontend/.env.production`

```env
VITE_BACKEND_LINK=https://campus-crew-three.vercel.app
VITE_ADMIN_SECRET=240606
```

**Important:** No trailing slash!

---

## 🚀 Deployment Steps

### Backend Deployment (Vercel)

1. **Set Environment Variables in Vercel:**
   ```
   FRONTEND_URL=https://campuscrew.vercel.app
   MONGODB_URI=your_mongodb_uri
   COHERE_API_KEY=your_cohere_key
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_key
   CHATANYWHERE_API_KEY=your_chat_key
   CHATANYWHERE_BASE_URL=your_chat_url
   ... (all other env vars)
   ```

2. **Deploy backend:**
   ```bash
   cd backend
   vercel --prod
   ```

3. **Verify deployment:**
   - Visit: https://campus-crew-three.vercel.app
   - Should see: "Backend is running in port..."

---

### Frontend Deployment (Vercel)

1. **Set Environment Variables in Vercel:**
   ```
   VITE_BACKEND_LINK=https://campus-crew-three.vercel.app
   VITE_ADMIN_SECRET=240606
   ```

2. **Deploy frontend:**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Verify deployment:**
   - Visit: https://campuscrew.vercel.app
   - Test login/features

---

## 🧪 Testing CORS

### Test Backend CORS

```bash
curl -I -X OPTIONS https://campus-crew-three.vercel.app/api/login \
  -H "Origin: https://campuscrew.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

**Expected Response:**
```
HTTP/2 204
access-control-allow-origin: https://campuscrew.vercel.app
access-control-allow-credentials: true
access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
```

### Test API Call

Open browser console on https://campuscrew.vercel.app:
```javascript
fetch('https://campus-crew-three.vercel.app/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' })
})
.then(r => r.json())
.then(console.log)
```

---

## 🔍 Troubleshooting

### Issue: Still getting CORS error

**Check:**
1. ✅ Backend deployed with correct `frontend_url` env var
2. ✅ Frontend deployed with correct `VITE_BACKEND_LINK`
3. ✅ No trailing slashes in URLs
4. ✅ Backend logs show allowed origin

**Solution:**
- Redeploy backend after setting `frontend_url` env var
- Clear browser cache
- Check Vercel logs for errors

---

### Issue: Double slash still appearing

**Check:**
```javascript
// In browser console on frontend:
console.log(import.meta.env.VITE_BACKEND_LINK)
// Should NOT have trailing slash
```

**Solution:**
- Ensure `VITE_BACKEND_LINK` has no trailing slash
- Rebuild frontend: `npm run build`
- Redeploy

---

### Issue: Preflight request failing

**Check backend logs:**
```bash
vercel logs https://campus-crew-three.vercel.app
```

**Look for:**
- "Blocked by CORS: ..." messages
- OPTIONS request logs

**Solution:**
- Add frontend domain to `allowedOrigins` array
- Redeploy backend

---

## 📋 Checklist Before Deployment

### Backend ✅
- [ ] `frontend_url` env var set correctly
- [ ] All env vars configured in Vercel
- [ ] CORS allows your frontend domain
- [ ] Backend responds to OPTIONS requests
- [ ] `/` endpoint works (shows "Backend is running")

### Frontend ✅
- [ ] `VITE_BACKEND_LINK` has no trailing slash
- [ ] `.env.production` file exists
- [ ] API calls use correct base URL
- [ ] Build succeeds (`npm run build`)
- [ ] Preview works locally

---

## 🎯 Environment Variables Summary

### Backend Environment Variables
```env
# Required for CORS
frontend_url=https://campuscrew.vercel.app

# Database
MONGODB_URI=mongodb+srv://...

# Vector Database
QDRANT_URL=https://...
QDRANT_API_KEY=...

# AI Services
COHERE_API_KEY=...
CHATANYWHERE_API_KEY=...
CHATANYWHERE_BASE_URL=...

# Other
PORT=8000
```

### Frontend Environment Variables
```env
# Backend API (no trailing slash!)
VITE_BACKEND_LINK=https://campus-crew-three.vercel.app

# Admin
VITE_ADMIN_SECRET=240606
```

---

## ✅ Expected Results

After fixes:

1. ✅ No double slashes in API URLs
2. ✅ CORS preflight passes
3. ✅ Login works
4. ✅ All API calls succeed
5. ✅ Chatbot works across domains

---

## 🚀 Quick Deploy Commands

### Deploy Both (from root)

```bash
# Commit changes
git add .
git commit -m "Fix CORS and double slash issues"
git push origin deploy

# Deploy backend
cd backend
vercel --prod

# Deploy frontend
cd ../frontend
vercel --prod
```

---

**Status:** 🟢 Ready to Deploy  
**CORS Issue:** ✅ Fixed  
**Double Slash:** ✅ Fixed  
**Production Config:** ✅ Created
