import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import express from 'express';
import dotenv from 'dotenv';
import qrcode from 'qrcode-terminal';

dotenv.config();

const app = express();
app.use(express.json());

// Helper delay acak untuk simulasi ketikan manusia (Anti-Ban Guard)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Inisialisasi Gemini AI & Supabase Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let waSock;

// 2. Koneksi WhatsApp via Baileys
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  waSock = makeWASocket({
    auth: state,
    browser: ['Asisten AI Personal', 'Chrome', '1.0.0']
  });

  waSock.ev.on('creds.update', saveCreds);

  waSock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // Handle QR Code
    if (qr) {
      console.log('📱 QR Code muncul! Scan dengan WhatsApp:');
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('🔄 Reconnecting to WhatsApp...');
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot WhatsApp Terhubung & Siap 24/7 (Anti-Ban Active)!');
    }
  });

  // 3. Listener Pesan Masuk
  waSock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (!textMessage || sender.includes('status@broadcast')) return;

    console.log(`[Pesan Masuk dari ${sender}]: ${textMessage}`);

    // Anti-Ban: Simulasi "Sedang Mengetik..." dengan jeda acak 1.5s - 3s
    await waSock.sendPresenceUpdate('composing', sender);
    await delay(1500 + Math.random() * 1500);

    // A. Cari memori masa lalu pengguna dari Supabase
    const { data: userMemories } = await supabase
      .from('user_memories')
      .select('fact')
      .eq('phone_number', sender);

    const memoryContext = userMemories?.map((m) => `- ${m.fact}`).join('\n') || 'Belum ada memori terdaftar.';

    // B. Olah prompt Gemini AI
    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const prompt = `
Kamu adalah Asisten Pribadi Bot WhatsApp pintar & ramah.
Waktu Saat Ini: ${nowStr}

Memori Ingatan Pengguna yang sudah kamu tahu:
${memoryContext}

Instruksi:
1. Jawab pesan pengguna dengan sopan, alami, dan ringkas.
2. Jika pengguna menyebutkan jadwal/agenda/meeting dengan tanggal dan jam, ekstrak menjadi JSON format:
   {"hasAgenda": true, "title": "...", "eventDateTime": "YYYY-MM-DDTHH:mm:ss"}
   Jika tidak ada agenda, set "hasAgenda": false.
3. Jawab dalam format JSON valid: {"reply": "teks balasan WA", "agenda": {...}, "newFactToRemember": "opsional fakta baru jika ada"}

Pesan Pengguna: "${textMessage}"
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const result = JSON.parse(response.text);

      await waSock.sendPresenceUpdate('paused', sender);
      await waSock.sendMessage(sender, { text: result.reply });

      // Simpan fakta baru jika ada
      if (result.newFactToRemember) {
        await supabase.from('user_memories').insert({
          phone_number: sender,
          fact: result.newFactToRemember
        });
      }

      // C. Jadwalkan Pengingat Otomatis (H-1 Hari, H-30 Mns, Waktu H)
      if (result.agenda?.hasAgenda && result.agenda?.eventDateTime) {
        const eventDate = new Date(result.agenda.eventDateTime);
        const title = result.agenda.title;

        const timeH = eventDate;
        const time30Min = new Date(eventDate.getTime() - 30 * 60 * 1000);
        const time1Day = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);

        const reminders = [
          { type: 'H-1 Hari', time: time1Day, msg: `🔔 [PENGINGAT H-1 HARI]\nBesok ada jadwal: "${title}" pada jam ${eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.` },
          { type: 'H-30 Menit', time: time30Min, msg: `⏳ [PENGINGAT 30 MENIT]\nSiap-siap! Dalam 30 menit ada agenda: "${title}" pada ${eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.` },
          { type: 'Waktu H', time: timeH, msg: `⏰ [SAATNYA AGENDA]\nSekarang jam ${eventDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB. Waktunya: "${title}"!` }
        ];

        for (const r of reminders) {
          if (r.time > new Date()) {
            await supabase.from('reminders_queue').insert({
              phone_number: sender,
              title: title,
              trigger_time: r.time.toISOString(),
              message: r.msg,
              status: 'pending'
            });
          }
        }

        await delay(1000);
        await waSock.sendMessage(sender, {
          text: `✅ Jadwal "${title}" berhasil dicatat! Saya akan ingatkan di H-1 hari, 30 menit sebelum, dan tepat waktu H.` 
        });
      }
    } catch (err) {
      console.error('Error processing AI response:', err);
    }
  });
}

// 4. Cron Checker: Jalankan setiap menit untuk mengeksekusi pengingat
cron.schedule('* * * * *', async () => {
  const nowIso = new Date().toISOString();
  const { data: dueReminders } = await supabase
    .from('reminders_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('trigger_time', nowIso);

  if (dueReminders && dueReminders.length > 0) {
    for (const rem of dueReminders) {
      if (waSock) {
        await waSock.sendMessage(rem.phone_number, { text: rem.message });
        await supabase.from('reminders_queue').update({ status: 'sent' }).eq('id', rem.id);
        console.log(`⏰ Pengingat terkirim ke ${rem.phone_number}: ${rem.title}`);
        await delay(2000); // Jeda 2 detik antar pesan antrean agar aman dari spam
      }
    }
  }
});

app.get('/', (req, res) => res.send('Bot WA AI Active 24/7'));
app.listen(process.env.PORT || 3000, () => console.log('Server berjalan di port 3000'));

connectToWhatsApp();
