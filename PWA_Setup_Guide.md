# PWA এবং ইনস্টলেশন পপআপ সেটআপ নির্দেশিকা (An-Nur Islamic Academy)

এই ফাইলটিতে কোন কোন ফাইলে কী কী পরিবর্তন বা নতুন ফাইল তৈরি করতে হবে, তা বিস্তারিতভাবে বাংলায় দেওয়া হলো।

---

## 🛠️ হোস্টিং ও ডেপ্লয়মেন্ট নির্দেশিকা (MANDATORY WORKFLOW)

যেহেতু আপনার হোস্টিং সার্ভারে **`public_html`** ফোল্ডারের ভেতর ফ্রন্টএন্ড (Frontend) বিল্ড ফাইলগুলো রাখা আছে এবং ব্যাকএন্ড বাইরের ফোল্ডারে আছে, তাই সরাসরি হোস্টিং প্যানেলে কোড পরিবর্তন করার চেয়ে নিচের নিয়মে কাজ করা সহজ ও নিরাপদ:

### ধাপ-১: লোকাল কম্পিউটারে পরিবর্তন (React কোড)
নিচে দেওয়া নির্দেশনা অনুযায়ী আপনার কম্পিউটারে প্রজেক্টের সোর্স ফাইলে পরিবর্তনগুলো করুন (ফাইল তৈরি ও কোড এডিট)।

### ধাপ-২: লোকাল কম্পিউটারে বিল্ড (Build) তৈরি করা
সব ফাইল সেভ করার পর আপনার কম্পিউটারের টার্মিনালে `client` ফোল্ডারে গিয়ে নিচের কমান্ডটি রান করুন:
```bash
npm run build
```
এটি রান করলে আপনার প্রজেক্টে **`dist`** নামে একটি নতুন ফোল্ডার তৈরি হবে। এই `dist` ফোল্ডারের ভেতরেই নতুন করে তৈরি হওয়া `index.html`, `manifest.json`, `sw.js` এবং সমস্ত CSS/JS ফাইলগুলো তৈরি হবে।

### 📂 ধাপ-৩: হোস্টিংয়ের `public_html`-এ আপলোড করা
আপনার কম্পিউটারের **`dist`** ফোল্ডারের ভেতরের সমস্ত ফাইল ও ফোল্ডারগুলো কপি করে বা জিপ (zip) করে আপনার হোস্টিং সার্ভারের **`public_html`** ফোল্ডারের ভেতরে আপলোড করে দিন (আগের ফাইলগুলো রিপ্লেস/ওভাররাইট করে দেবেন)।

**ফাইল আপলোডের পর আপনার `public_html` ফোল্ডারের গঠন দেখতে এমন হবে:**
* `public_html/index.html`
* `public_html/manifest.json`
* `public_html/sw.js`
* `public_html/favicon.svg`
* `public_html/assets/` (এখানে সব CSS/JS চ্যাঙ্ক থাকবে)

*(ব্যাকএন্ড ফাইলগুলো হোস্টিংয়ের বাইরে যেভাবে আছে সেভাবেই থাকবে, সেখানে কোনো হাত দিতে হবে না।)*

---


## ১. [নতুন ফাইল তৈরি করুন] `client/public/manifest.json`

আপনার হোস্টিং সার্ভারে `public` ফোল্ডারের ভেতরে `manifest.json` নামে একটি নতুন ফাইল তৈরি করুন এবং নিচের কোডটি পেস্ট করুন:

```json
{
  "short_name": "An-Nur Academy",
  "name": "An-Nur Islamic Academy",
  "icons": [
    {
      "src": "favicon.svg",
      "type": "image/svg+xml",
      "sizes": "any"
    }
  ],
  "start_url": "/",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "display": "standalone",
  "orientation": "portrait"
}
```

---

## ২. [নতুন ফাইল তৈরি করুন] `client/public/sw.js`

আপনার হোস্টিং সার্ভারে `public` ফোল্ডারের ভেতরে `sw.js` নামে একটি নতুন ফাইল তৈরি করুন এবং নিচের কোডটি পেস্ট করুন:

```javascript
const CACHE_NAME = 'annur-academy-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

## ৩. [পরিবর্তন করুন] `client/index.html`

আপনার হোস্টিং সার্ভারের মূল `index.html` ফাইলটি এডিট করুন। 

**ক) `<head>` ট্যাগের ভেতরে (যেমন `</head>` শেষ হওয়ার ঠিক আগে) নিচের লাইনটি যুক্ত করুন:**
```html
    <link rel="manifest" href="/manifest.json" />
```

**খ) `<body>` ট্যাগের শেষে (অর্থাৎ `</body>` শেষ হওয়ার ঠিক আগে) নিচের কোডটি যুক্ত করুন:**
```html
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registered!'))
            .catch(err => console.log('Service Worker registration failed: ', err));
        });
      }
    </script>
```

---

## ৪. [নতুন ফাইল তৈরি করুন] `client/src/components/InstallPrompt.jsx`

আপনার প্রোজেক্টের `src/components/` ফোল্ডারের ভেতরে `InstallPrompt.jsx` নামে নতুন ফাইল তৈরি করুন এবং নিচের কোডটি পেস্ট করুন:

```jsx
import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: '#1e293b',
      color: '#ffffff',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '320px',
      fontFamily: 'sans-serif',
      border: '1px solid #334155'
    }}>
      <div style={{ fontSize: '15px', fontWeight: '500', lineHeight: '1.4' }}>
        সহজে ব্যবহার করতে এই ওয়েবসাইটটি অ্যাপ হিসেবে ইনস্টল করুন।
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setShowPrompt(false)}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#94a3b8', 
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          পরে
        </button>
        <button 
          onClick={handleInstallClick}
          style={{ 
            backgroundColor: '#3b82f6', 
            border: 'none', 
            color: '#ffffff', 
            padding: '8px 16px', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          ইনস্টল করুন
        </button>
      </div>
    </div>
  );
}
```

---

## ৫. [পরিবর্তন করুন] `client/src/App.jsx`

আপনার প্রোজেক্টের `src/App.jsx` ফাইলটি ওপেন করুন:

**ক) ফাইলের একদম উপরে অন্যান্য import এর সাথে এটি যুক্ত করুন:**
```javascript
import InstallPrompt from './components/InstallPrompt';
```

**খ) `App` কম্পোনেন্টের ভেতরে `<BrowserRouter>` এর ঠিক নিচে এটি রেন্ডার করুন:**
```jsx
export default function App() {
  return (
    <BrowserRouter>
      <InstallPrompt /> {/* <--- এটি এখানে বসান */}
      <Routes>
         ...
```

---

> [!WARNING]
> **বিশেষ দ্রষ্টব্য:** সমস্ত কোড পরিবর্তন বা ফাইল আপলোড করার পর আপনার হোস্টিং সার্ভারে অবশ্যই **HTTPS / SSL** সচল থাকতে হবে। HTTPS ছাড়া ব্রাউজার কখনো ইনস্টল নোটিফিকেশন প্রদর্শন করবে না।
