# WhatsApp AI Bot 24/7 with Memory & Scheduler

Automated WhatsApp AI Assistant featuring Long-Term Memory (RAG) and 3-Tier Scheduled Reminders running 24/7 on 100% Free Cloud Infrastructure.

## 🚀 Quick Start

### 1. Setup Environment Variables

Edit the `.env` file and fill in your credentials:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
PORT=3000
```

**Getting your API Keys:**
- **Gemini API Key**: Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free API key
- **Supabase Credentials**: Sign up at [Supabase.com](https://supabase.com), create a new project, then go to Project Settings > API to get your URL and Anon Key

### 2. Setup Supabase Database

Go to your Supabase project's **SQL Editor** and execute this query:

```sql
-- Long-Term Memory Table
CREATE TABLE user_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  fact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Reminders Queue Table
CREATE TABLE reminders_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  title TEXT NOT NULL,
  trigger_time TIMESTAMP WITH TIME ZONE NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Run Locally (Test QR Code)

```bash
npm start
```

- A QR code will appear in your terminal
- Scan it with WhatsApp on your phone (Linked Devices > Link a Device)
- The bot will connect and show: `✅ Bot WhatsApp Terhubung & Siap 24/7 (Anti-Ban Active)!`

### 4. Test the Bot

Send a message to your own WhatsApp number:
- "Halo, saya punya meeting besok jam 10 pagi tentang project review"
- The bot will extract the agenda and schedule 3 reminders (H-1 day, H-30 min, H-time)

---

## 🌐 Deploy to Render.com (Free Tier)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-ai-bot.git
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [Render.com](https://render.com) and sign up/login
2. Click **New +** > **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `whatsapp-ai-bot`
   - **Region**: Singapore (closest to Indonesia)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. **Important**: Add Environment Variables:
   - `GEMINI_API_KEY` = your Gemini API key
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Create Web Service**

### Step 3: Re-scan QR Code on Render

After deployment:
1. Go to your Render service > **Logs**
2. Look for the QR code in the logs
3. Copy the QR code URL and open it in browser
4. Scan with WhatsApp to link the bot

---

## ⏰ Keep-Alive Service (Cron-Job.org)

Render's free tier spins down after 15 minutes of inactivity. Use Cron-Job.org to ping your bot every 5 minutes.

### Setup:

1. Go to [Cron-Job.org](https://cron-job.org) and sign up
2. Click **Create cronjob**
3. Configure:
   - **Title**: `WhatsApp Bot Keep-Alive`
   - **URL**: `https://your-app-name.onrender.com/` (replace with your Render URL)
   - **Execution**: Every 5 minutes
4. Click **Create**

Your bot will now stay awake 24/7!

---

## 🔒 Security Features

- **Anti-Ban**: Human-like typing delays (1.5s-3s) with "composing" status
- **Session Privacy**: `auth_info_baileys/` folder excluded from Git
- **Env Variables**: `.env` file excluded from Git
- **Rate Limiting**: 2-second delay between queued reminder messages

---

## 📊 Tech Stack (100% Free)

- **WhatsApp Gateway**: `@whiskeysockets/baileys`
- **AI Brain**: `@google/genai` (Gemini 2.5 Flash)
- **Database**: Supabase PostgreSQL
- **Runtime**: Node.js + Express
- **Scheduler**: `node-cron`
- **Hosting**: Render.com (750 free hours/month)
- **Keep-Alive**: Cron-Job.org (free)

---

## 💡 Usage Examples

**Schedule a meeting:**
```
User: "Besok jam 2 siang ada meeting dengan client tentang proposal"
Bot: ✅ Jadwal "meeting dengan client tentang proposal" berhasil dicatat! 
     Saya akan ingatkan di H-1 hari, 30 menit sebelum, dan tepat waktu H.
```

**Remember facts:**
```
User: "Saya suka kopi, tinggal di Jakarta, kerja di startup"
Bot: "Oke, saya catat ya! Ada info lain yang ingin kamu simpan?"
```

**Ask questions:**
```
User: "Apa yang saya suka?"
Bot: "Berdasarkan memori, kamu suka kopi, tinggal di Jakarta, dan kerja di startup."
```

---

## 🛠 Troubleshooting

**QR Code not appearing:**
- Check that `auth_info_baileys/` folder exists and is writable
- Ensure `.env` file is properly configured

**Bot disconnects:**
- The auto-reconnect feature will handle this
- Check Render logs for connection status

**Reminders not sending:**
- Verify Supabase tables are created correctly
- Check that `reminders_queue` has pending records with correct timestamps

---

## 📝 License

MIT
