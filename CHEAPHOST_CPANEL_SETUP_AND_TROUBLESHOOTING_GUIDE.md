# CheapHost cPanel Setup & Troubleshooting Guide (2nd Hosting Workflow)

> **ডকুমেন্টের উদ্দেশ্য:** দ্বিতীয় হোস্টিং (CheapHost / cPanel) সেটআপের সময় যে সকল সমস্যা ফেস করা হয়েছিল এবং যেভাবে সমাধান করা হয়েছে, তার সম্পূর্ণ রেকর্ড। ভবিষ্যতে কোনো বাগ, কনফ্লিক্ট বা পুনঃসেটআপের ক্ষেত্রে এই ফাইলটি রেফারেন্স হিসেবে কাজ করবে।

---

## ১. হোস্টিং এবং ডোমেইন ওভারভিউ
- **ডোমেইন:** `annurislamicacademy.edu.bd`
- **হোস্টিং কন্ট্রোল প্যানেল:** cPanel (CloudLinux + LiteSpeed Web Server + Passenger)
- **ব্যাকএন্ড লোকেশন:** `/home/annurisl/backend`
- **ফ্রন্টএন্ড লোকেশন:** `/home/annurisl/public_html`
- **অ্যাক্টিভ Node.js ভার্সন:** `Node.js 20.x` (LTS)

---

## ২. cPanel "Setup Node.js App" কনফিগারেশন

| ফিল্ড | মান (Value) | বিবরণ |
|---|---|---|
| **Node.js version** | `20.x` | লেটেস্ট LTS ভার্সন |
| **Application mode** | `Production` | প্রোডাকশন মোড |
| **Application root** | `backend` | হোম ডিরেক্টরিতে ব্যাকএন্ড কোড ফোল্ডার |
| **Application URL** | `annurislamicacademy.edu.bd` / `api` | API এন্ডপয়েন্ট হিসেবে `/api` ব্যবহৃত হয় |
| **Application startup file** | `server.js` | ব্যাকএন্ডের প্রধান এন্ট্রি ফাইল |

---

## ৩. সমস্যা ও সমাধানসমূহ (Troubleshooting Log)

### সমস্যা ১: `Specified directory already used` / `Specified alias is already used`
- **এরর মেসেজ:**
  - `Specified directory already used by '/home/annurisl/backend'`
  - `Specified alias is already used by the other application: '/home/annurisl/backend'. Please, specify another application url.`
  - `The application cannot be located inside of already existing one: backend.`
- **কারণ:** cPanel-এ আগে থেকেই একই নামের ফোল্ডার বা `/api` URL অ্যালিয়াস ক্লাউডলিনাক্স সিলেক্টরে রেজিস্টার করা ছিল অথবা `public_html/api` ফোল্ডারে পুরনো Passenger কোড ছিল।
- **সমাধান:**
  1. `WEB APPLICATIONS` ট্যাব থেকে পুরনো বা ব্রোকেন অ্যাপটি ডিলিট করা।
  2. `public_html/api` ফোল্ডারে যদি পুরনো `.htaccess` বা সিমলিঙ্ক থাকে তা ডিলিট করা।
  3. টার্মিনালে ক্যাশ ও পুরনো প্রসেস ক্লিয়ার করা:
     ```bash
     rm -rf ~/.cl.selector
     kill -9 $(pgrep -f lsnode)
     ```

---

### সমস্যা ২: `npm install` এ Fatal Out of Memory (V8 Pointer Compression Cage)
- **এরর মেসেজ:**
  ```text
  Fatal error in , line 0
  Fatal process out of memory: Failed to reserve memory for Isolate V8 pointer compression cage
  ```
- **কারণ:** শেয়ার্ড হোস্টিংয়ে অ্যাকাউন্টের মেমোরি লিমিট (১–২ জিবি) থাকে, কিন্তু Node 16/18 V8 ইঞ্জিন `npm install` চালানোর সময় ৪ জিবি অ্যাড্রেস স্পেস রিজার্ভ করতে চায়।
- **সমাধান:**
  - লোকাল পিসির `server/node_modules` ফোল্ডারটিকে জিপ করে (`node_modules.zip`) cPanel ফাইল ম্যানেজারে `backend` ফোল্ডারে আপলোড করে **Extract** করা।
  - যেহেতু ব্যাকএন্ডে কোনো বাইনারি C++ ডিপেন্ডেন্সি নেই (`bcryptjs`, `mysql2` ইত্যাদি পিওর জাভাস্ক্রিপ্ট), তাই লোকাল `node_modules` হুবহু কাজ করে।
  - বিকল্প সমাধান (টার্মিনাল থেকে কম মেমোরি দিয়ে):
    ```bash
    node --max-old-space-size=512 $(which npm) install --production --no-audit --no-fund
    ```

---

### সমস্যা ৩: `/api/v1/health` এ `503 Service Unavailable`
- **এরর মেসেজ:**
  `503 Service Unavailable: The server is temporarily busy, try again later!`
- **কারণ:** ব্যাকএন্ড চালু হওয়ার সময় MySQL ডাটাবেসে কানেক্ট করতে না পেরে `process.exit(1)` দিয়ে বন্ধ হয়ে যাচ্ছিল (যেহেতু cPanel-এ ডাটাবেস তখনো তৈরি করা হয়নি)।
- **সমাধান:**
  1. cPanel **MySQL® Databases**-এ গিয়ে ডাটাবেস `annurisl_madrasah` তৈরি।
  2. ডাটাবেস ইউজার `annurisl_dbuser` তৈরি ও স্ট্রং পাসওয়ার্ড সেট।
  3. ডাটাবেসে ইউজার যুক্ত করে **ALL PRIVILEGES** প্রদান।
  4. ব্যাকএন্ডের `.env` ফাইলে ডাটাবেস ক্রেডেনশিয়ালস সেভ ও অ্যাপ রিস্টার্ট।

---

### সমস্যা ৪: ফ্রন্টএন্ডে শুধু টাইটেল আসে কিন্তু স্ক্রিন সাদা (White Screen)
- **কারণ:** SPA (Single Page Application) রাউটিং এবং এসেট ফোল্ডারের পাথ মিসম্যাচ।
- **সমাধান:** `public_html` এর রুটে সরাসরি ফ্রন্টএন্ড বিল্ডের ফাইলগুলো (`index.html`, `assets/`, `favicon.svg` ইত্যাদি) রাখা এবং `public_html/.htaccess` ফাইলে নিচের সঠিক রুল বজায় রাখা:
  ```apache
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # 1. Let Passenger handle /api requests without any interference
    RewriteRule ^api/ - [L]

    # 2. Route all other requests to index.html (React Router)
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-l
    RewriteRule . /index.html [L]
  </IfModule>

  <IfModule mod_mime.c>
    AddType application/javascript .js .mjs
    AddType text/css .css
    AddType image/svg+xml .svg
  </IfModule>

  <IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE application/javascript text/css text/html
  </IfModule>
  ```

---

### সমস্যা ৫: টার্মিনালে `node: command not found` ও `Access denied for user 'root'@'localhost'`
- **কারণ ১:** cPanel Jailshell-এ Node.js গ্লোবালি থাকে না, ভার্চুয়াল এনভায়রনমেন্টে থাকে।
- **কারণ ২:** টার্মিনাল এক লাইনারে `require('dotenv').config()` না দিলে কোড `.env` না পড়ে লোকাল পিসির ডিফল্ট `root` ইউজার দিয়ে কানেক্ট করতে গিয়ে অ্যাক্সেস ডিনাইড হয়।
- **সমাধান:**
  ভার্চুয়াল এনভায়রনমেন্ট সক্রিয় করে এবং `dotenv` লোড করে এক লাইনের টার্মিনাল কমান্ড দিয়ে সরাসরি ডাটাবেসে অ্যাডমিন ইউজার তৈরি:
  ```bash
  source /home/annurisl/nodevenv/backend/20/bin/activate && cd ~/backend
  node -e "require('dotenv').config();const db=require('./config/db'),User=require('./models/User');(async()=>{await db.connectDB();let u=await User.findOne({where:{username:'admin'}});if(u){u.password='123';u.isActive=true;await u.save();console.log('SUCCESS: Admin updated to 123');}else{await User.create({username:'admin',email:'admin@madrasah.com',password:'123',firstName:'Super',lastName:'Admin',userType:'super_admin',institution:'আন-নুর-ইসলামিক একাডেমি',isActive:true});console.log('SUCCESS: Admin created with password 123');}process.exit();})()"
  ```

---

## ৪. ডাটাবেস রিপ্লেস / মাইগ্রেশন প্রসেস (.sql ইমপোর্ট)
1. cPanel -> **phpMyAdmin** -> ডাটাবেস `annurisl_madrasah` নির্বাচন।
2. যদি আগে কোনো টেবিল থাকে: **Check all** -> **Drop** (ফ্রেশ রিপ্লেস নিশ্চিত করতে)।
3. **Import** ট্যাব -> `annurisl_madrasah (1).sql` ফাইল সিলেক্ট -> **Import** / **Go**।

---

## ৫. স্বয়ংক্রিয় ডেইলি টেলিগ্রাম ব্যাকআপ কনফিগারেশন

ডাটাবেস প্রতিদিন রাত ১২:০০ টায় জিপ (`.sql.gz`) হয়ে সরাসরি টেলিগ্রাম গ্রুপে পাঠানো হয়।

- **Telegram Group:** `Madrasah DB Backups`
- **Chat ID:** `-1003783036154`
- **Bot Token:** `8823407707:AAF653JRO8tUfWMRjBietlDDtAjY3W6lE3Y`
- **স্ক্রিপ্ট লোকেশন:** `/home/annurisl/scripts/backup_to_telegram.sh`

### স্ক্রিপ্ট কোড:
```bash
#!/bin/bash

DB_USER="annurisl_dbuser"
DB_PASS="AnnurAcademy#2026!Db"
DB_NAME="annurisl_madrasah"
BOT_TOKEN="8823407707:AAF653JRO8tUfWMRjBietlDDtAjY3W6lE3Y"
CHAT_ID="-1003783036154"
BACKUP_DIR="$HOME/db_backups"

mkdir -p "$BACKUP_DIR"

DATE_STR=$(date +'%Y-%m-%d_%H-%M-%S')
DISPLAY_DATE=$(date +'%d-%m-%Y %I:%M %p')
BACKUP_FILE="$BACKUP_DIR/madrasah_db_${DATE_STR}.sql.gz"

# Dump database & gzip
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Send to Telegram Group
curl -s -F chat_id="$CHAT_ID" \
     -F document=@"$BACKUP_FILE" \
     -F caption="📦 আন-নুর মাদ্রাসা ডাটাবেস ব্যাকআপ
📅 তারিখ: ${DISPLAY_DATE}
💾 ফাইল: $(basename "$BACKUP_FILE")
✅ স্ট্যাটাস: সফলভাবে ব্যাকআপ সম্পন্ন" \
     "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument" > /dev/null

# Delete local copies older than 7 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
```

### cPanel Cron Job শিডিউল:
- **সময়:** `0 0 * * *` (প্রতিদিন রাত ১২:০০ টায়)
- **কমান্ড:**
  ```bash
  /bin/bash /home/annurisl/scripts/backup_to_telegram.sh
  ```

---

## ৬. টার্মিনাল এনভায়রনমেন্ট ও Node ভার্সন টিপস

1. **টার্মিনালে প্রম্পটে `[backend (20)]` আনা:**
   ```bash
   source /home/annurisl/nodevenv/backend/20/bin/activate
   ```
2. **প্রতিবার টার্মিনাল খুললে স্বয়ংক্রিয়ভাবে Node 20 লোড হওয়া:**
   ```bash
   echo "source /home/annurisl/nodevenv/backend/20/bin/activate && cd ~/backend" >> ~/.bashrc
   ```
3. **পুরনো অব্যবহৃত Node 16 মুছে ফেলা (কনফিউশন এড়াতে):**
   ```bash
   rm -rf ~/nodevenv/backend/16
   ```
4. **সার্ভার রিস্টার্টের ট্রাবলশুটিং রুল:**
   সার্ভার রিস্টার্ট কার্যকর না হলে ব্যাকগ্রাউন্ডের হাং হওয়া নোড প্রসেস বন্ধ করার কমান্ড:
   ```bash
   kill -9 $(pgrep -f lsnode)
   ```
