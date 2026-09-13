# Discipline — Private Habit & Progression PWA

Discipline is a mobile-first, privacy-focused Progressive Web Application (PWA) designed for Apple iPhone (and responsive on desktop) that transforms self-control, daily habits, and consistency into an RPG-style character progression experience.

---

## ⚡ Core Philosophy & Design

- **Discipline + Consistency + Gamification**: Level up your character through daily check-ins, streaks, and weekly checkpoints.
- **Non-Shaming Framing**: Missed a day? The app responds with: *"Streak ended. Progress didn’t. You showed up today — that is what counts."* Total accumulated days and lifetime XP are **never erased**.
- **Not a Medical Application**: Clear non-medical boundary. The built-in Urge / Emergency tool creates a 5-minute pause and distraction between impulse and action.
- **iPhone-First Native Feel**: Standalone PWA mode, iOS safe area support (`safe-area-inset-top`, `safe-area-inset-bottom`), thumb-friendly controls, tactile haptic/audio feedback, and dark RPG obsidian aesthetic.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Obsidian/Amber Dark RPG palette, iOS safe areas, glow animations)
- **Database**: Supabase PostgreSQL / Any PostgreSQL provider via [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: Master PIN & Admin PIN with **bcryptjs** (cost 10) + Brute-force lockout + HTTP-only signed Jose JWT sessions
- **PWA**: Web App Manifest (`manifest.webmanifest`), Apple touch icons, Service Worker (`sw.js`) with offline caching
- **Validation**: Zod schema validation on all server-side inputs
- **Deployment**: Zero-configuration Vercel deployment compatibility

---

## 🚀 Quick Start (Local Development)

### 1. Requirements
- Node.js 18.x or higher (tested on Node.js v24)
- npm or pnpm

### 2. Installation
```bash
cd discipline
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your secrets:
```env
# Database connection string (Supabase transaction pooler port 6543 recommended)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true

# Server-only session key for HTTP-only cookies
SESSION_SECRET=your_super_secret_32_char_encryption_key

# Admin Panel PIN (Optional in local dev; defaults to PIN: 9999)
ADMIN_PIN=9999
# Or secure bcrypt hash for production:
# ADMIN_PIN_HASH=$2a$10$...
```

> **Note**: If `DATABASE_URL` is unset, the app seamlessly falls back to a persistent local file-backed development store (`.data/discipline_dev.json`), allowing immediate local development without an external database!

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (or iPhone Safari via local network).

---

## 🗄️ Database Setup (Supabase PostgreSQL)

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a project.
2. In Project Settings > Database, find your connection string.
3. Use the **Connection Pooling** URI (port 6543, transaction mode):
   ```
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### 2. Run Database Migrations
Execute the automated migration script to create tables, foreign keys, unique constraints, and indexes:
```bash
npm run db:migrate
```

### 3. Seed Achievements & Ranks
Populate the default achievements into your database:
```bash
npm run db:seed
```

---

## 🧪 Testing & Verification

Run the automated gamification test suite (verifies streak rollover, setback recovery, milestone XP bonuses, rank ladder, weekly reset, and achievement unlock logic):
```bash
npx tsx scripts/test-gamification.ts
```

Run TypeScript compilation check:
```bash
npx tsc --noEmit
```

Run Production Build:
```bash
npm run build
```

---

## 📱 Installing as a PWA on Apple iPhone

1. Open the deployed application URL in **Safari** on your iPhone.
2. Tap the **Share** button (the square with an arrow pointing up at the bottom of Safari).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the upper-right corner.
5. Launch **Discipline** directly from your Home Screen — it runs in full standalone mode with custom icons, zero browser chrome, and native safe area insets!

---

## 🛡️ Admin Security Portal (`/admin`)

- Access path: `/admin` (insulated from bottom navigation)
- Protected by independent Admin PIN authentication (separate from user PINs)
- **Zero-Knowledge Privacy**: Displays aggregate health metrics only (total users, active users, check-in counts, weekly goal completion rate, rank distribution, and audit logs).
- **Strictly No User Journal Snooping**: Private user reflection notes are never exposed in admin telemetry.

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Add the following Environment Variables in the Vercel Dashboard:
   - `DATABASE_URL`: Your Supabase transaction pooler connection string.
   - `SESSION_SECRET`: A secure 32+ character random string.
   - `ADMIN_PIN_HASH`: Bcrypt hash of your production admin PIN.
4. Click **Deploy**. Vercel will build and deploy the Next.js App Router application with zero configuration required.

---

## 🔒 Security Architecture Highlights

- **PIN Hashing**: Uses `bcryptjs` with salt cost 10. Raw PINs are never stored, logged, or sent to the browser.
- **Brute-Force Rate Limiting**: Max 5 failed PIN attempts triggers a 15-minute lock.
- **HTTP-Only Cookies**: Signed Jose JWT tokens stored in `SameSite=Lax`, `HttpOnly`, and `Secure` (production) cookies.
- **Server-Side Validation**: All XP, streak calculations, dates, and achievements are computed authoritatively on the server to prevent client spoofing.
- **No Service Role Keys in Client**: Client bundles contain zero database credentials.
