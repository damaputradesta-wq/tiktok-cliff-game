const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const tiktokLib = require('tiktok-live-connector');
const LiveConnection = tiktokLib.TikTokLiveConnection || tiktokLib.WebcastPushConnection;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
  allowEIO3: true
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/mp3', express.static(path.join(__dirname, 'mp3')));

app.get('/playlist', (req, res) => {
  const dir = path.join(__dirname, 'mp3');
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.mp3'))
    .map(f => ({
      title: f.replace(/\.mp3$/i, ''),
      artist: 'Lagu Lokal (@ptrgenz)',
      url: 'http://localhost:3000/mp3/' + encodeURIComponent(f)
    }));
  res.json(files);
});

app.get('/yt-search', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ videoIds: [] });
  const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' lirik audio');
  https.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8'
    }
  }, (ytRes) => {
    let html = '';
    ytRes.on('data', c => html += c);
    ytRes.on('end', () => {
      const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const ids = [];
      let m;
      while ((m = regex.exec(html)) !== null) {
        if (!ids.includes(m[1])) ids.push(m[1]);
        if (ids.length >= 10) break;
      }
      res.json({ videoIds: ids });
    });
  }).on('error', () => res.json({ videoIds: [] }));
});

app.get('/tts', (req, res) => {
  const rawText = (req.query.text || '').toString().trim();
  if (!rawText) return res.status(400).end();
  const trUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=' + encodeURIComponent(rawText);
  https.get(trUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (trRes) => {
    let body = '';
    trRes.on('data', c => body += c);
    trRes.on('end', () => {
      let idText = rawText;
      try {
        const parsed = JSON.parse(body);
        if (parsed && parsed[0]) idText = parsed[0].map(item => item[0]).join('');
      } catch (e) {}
      const cleanText = idText.slice(0, 200);
      const ttsUrl = 'https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=id&q=' + encodeURIComponent(cleanText);
      https.get(ttsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (audioRes) => {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        audioRes.pipe(res);
      }).on('error', () => res.status(500).end());
    });
  }).on('error', () => res.status(500).end());
});

const TARGET_USER = 'ptrgenz';
let activeConnection = null;
let isConnecting = false;
let retryTimer = null;

// Mapping Lengkap Item Gift TikTok (Dari 1 Koin Mawar s/d Paus & Singa)
function mapGiftToAction(giftName, coins) {
  const name = (giftName || '').toLowerCase();

  // --- KATEGORI BANTU NAIK / MAJU ---
  if (name.includes('roket') || name.includes('rocket') || name.includes('pesawat') || name.includes('plane') || name.includes('jet') || name.includes('ferrari') || name.includes('lamborghini')) {
    return { dir: 'up', type: 'jet', label: 'Turbo Jet MBG', meters: 1800, power: 550 };
  }
  if (name.includes('kalung') || name.includes('persahabatan') || name.includes('friendship') || name.includes('nasi') || name.includes('ketupat') || name.includes('susu')) {
    return { dir: 'up', type: 'kopdes', label: 'Truk Kopdes MBG', meters: 220, power: 180 };
  }

  // --- KATEGORI GANGGUAN / TURUN (MURAH -> SULTAN) ---
  // 1. Singa / Universe (Sultan Tertinggi)
  if (name.includes('singa') || name.includes('lion') || name.includes('universe') || name.includes('phoenix') || name.includes('naga') || name.includes('dragon')) {
    return { dir: 'down', type: 'singa', label: 'Raja Singa & Meteor Kiamat', meters: 15000, power: 1800 };
  }
  // 2. Paus / Galaksi / Kapal Pesiar
  if (name.includes('paus') || name.includes('whale') || name.includes('galaksi') || name.includes('galaxy') || name.includes('kapal') || name.includes('yacht')) {
    return { dir: 'down', type: 'paus', label: 'Tsunami Paus Raksasa', meters: 4500, power: 1100 };
  }
  // 3. Kereta / Corgi / Mobil
  if (name.includes('kereta') || name.includes('train') || name.includes('corgi') || name.includes('bebek') || name.includes('uang') || name.includes('money')) {
    return { dir: 'down', type: 'kereta', label: 'Kereta Cepat Whoosh', meters: 2000, power: 780 };
  }
  // 4. Mahkota / Topi / Kacamata
  if (name.includes('mahkota') || name.includes('crown') || name.includes('topi') || name.includes('hat') || name.includes('kursi')) {
    return { dir: 'down', type: 'basuri', label: 'Bus Telolet Basuri', meters: 1100, power: 560 };
  }
  // 5. Donat / Buket Bunga
  if (name.includes('donat') || name.includes('doughnut') || name.includes('donut') || name.includes('buket') || name.includes('bouquet')) {
    return { dir: 'down', type: 'ufo', label: 'UFO Alien Sedot MBG', meters: 650, power: 440 };
  }
  // 6. Parfum / Beruang / Miska
  if (name.includes('parfum') || name.includes('perfume') || name.includes('beruang') || name.includes('bear') || name.includes('miska')) {
    return { dir: 'down', type: 'kameha', label: 'Laser Kamehameha', meters: 420, power: 340 };
  }
  // 7. Kopi / Rosa / Bom
  if (name.includes('kopi') || name.includes('coffee') || name.includes('rosa') || name.includes('bom') || name.includes('bomb') || name.includes('energi')) {
    return { dir: 'down', type: 'soundhoreg', label: 'Truk Sound Horeg', meters: 250, power: 240 };
  }
  // 8. Es Krim / Jari Hati / Hati
  if (name.includes('es ') || name.includes('es krim') || name.includes('ice') || name.includes('jari') || name.includes('finger') || name.includes('heart') || name.includes('hati')) {
    return { dir: 'down', type: 'kaki', label: 'Injakan Kaki Raksasa', meters: 120, power: 145 };
  }
  // 9. Mawar / TikTok / GG (1 Koin)
  if (name.includes('mawar') || name.includes('rose') || name.includes('tiktok') || name.includes('gg')) {
    return { dir: 'down', type: 'angkot', label: 'Angkot Biru Ngetem', meters: 60, power: 95 };
  }

  // --- FALLBACK OTOMATIS BERDASARKAN JUMLAH KOIN JIKA NAMA GIFT LAIN ---
  if (coins >= 5000) return { dir: 'down', type: 'singa', label: 'Raja Singa & Meteor Kiamat', meters: 15000, power: 1800 };
  if (coins >= 1000) return { dir: 'down', type: 'paus', label: 'Tsunami Paus Raksasa', meters: 4500, power: 1100 };
  if (coins >= 299)  return { dir: 'down', type: 'kereta', label: 'Kereta Cepat Whoosh', meters: 2000, power: 780 };
  if (coins >= 99)   return { dir: 'down', type: 'basuri', label: 'Bus Telolet Basuri', meters: 1100, power: 560 };
  if (coins >= 30)   return { dir: 'down', type: 'ufo', label: 'UFO Alien Sedot MBG', meters: 650, power: 440 };
  if (coins >= 20)   return { dir: 'down', type: 'kameha', label: 'Laser Kamehameha', meters: 420, power: 340 };
  if (coins >= 10)   return { dir: 'down', type: 'soundhoreg', label: 'Truk Sound Horeg', meters: 250, power: 240 };
  if (coins >= 5)    return { dir: 'up', type: 'kopdes', label: 'Truk Kopdes MBG', meters: 220, power: 180 };
  if (coins >= 2)    return { dir: 'down', type: 'kaki', label: 'Injakan Kaki Raksasa', meters: 120, power: 145 };
  return { dir: 'down', type: 'angkot', label: 'Angkot Biru Ngetem', meters: 60, power: 95 };
}

function connectTikTokRoom() {
  if (activeConnection || isConnecting) return;
  isConnecting = true;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }

  console.log('[TIKTOK] Menghubungkan ke Live @' + TARGET_USER + '...');
  io.emit('status', { state: 'connecting', text: 'Mencari Live @' + TARGET_USER + '...' });

  const tiktok = new LiveConnection(TARGET_USER, {
    processInitialData: false,
    enableExtendedGiftInfo: false,
    requestPollingIntervalMs: 2000
  });

  tiktok.connect().then((state) => {
    isConnecting = false;
    activeConnection = tiktok;
    console.log('[SUKSES] TERHUBUNG KE LIVE @' + TARGET_USER + ' (Room ID: ' + state.roomId + ')');
    io.emit('status', { state: 'connected', text: 'LIVE: @' + TARGET_USER });
  }).catch((err) => {
    isConnecting = false;
    activeConnection = null;
    const msg = (err && err.message) ? err.message : String(err);
    const retryMs = msg.includes('403') ? 20000 : 10000;
    console.log('[BELUM LIVE / GAGAL] @' + TARGET_USER + ' -> ' + msg);
    io.emit('status', { state: 'waiting', text: 'Menunggu @' + TARGET_USER + ' Live...' });
    retryTimer = setTimeout(() => { retryTimer = null; connectTikTokRoom(); }, retryMs);
  });

  // TAP-TAP LAYAR (LIKE) REAL-TIME
  tiktok.on('like', (data) => {
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'penonton';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const likeCount = Math.min(data.likeCount || 1, 15);
    console.log('[TAP-TAP] @' + uniqueId + ' (' + likeCount + 'x like)');
    io.emit('live-event', {
      kind: 'boost',
      dir: 'up',
      type: 'tap',
      label: 'Tap-Tap Layar',
      user: uniqueId,
      nickname,
      meters: likeCount * 12,
      power: Math.min(likeCount * 9, 85)
    });
  });

  // KOMENTAR CHAT REAL-TIME
  tiktok.on('chat', (data) => {
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'penonton';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const comment = (data.comment || '').trim();
    console.log('[CHAT] @' + uniqueId + ': ' + comment);

    const reqMatch = comment.match(/^(?:!lagu|!play|req|request)\s+(.+)/i);
    if (reqMatch && reqMatch[1]) {
      const songQuery = reqMatch[1].trim().slice(0, 60);
      io.emit('song-request', { user: nickname, query: songQuery });
    }

    io.emit('live-event', {
      kind: 'chat',
      dir: 'up',
      type: 'chat',
      label: 'Komen: ' + comment.slice(0, 24),
      user: uniqueId,
      nickname,
      comment,
      meters: 35,
      power: 55
    });
  });

  // GIFT TIKTOK REAL-TIME (MURAH S/D SULTAN)
  tiktok.on('gift', (data) => {
    const giftType = data.giftType ?? (data.giftDetails && data.giftDetails.giftType) ?? 0;
    if (giftType === 1 && !data.repeatEnd) return;
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'sultan';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const count = data.repeatCount || 1;
    const diamondCount = data.diamondCount ?? (data.giftDetails && data.giftDetails.diamondCount) ?? 1;
    const coins = diamondCount * count;
    const gName = data.giftName || (data.giftDetails && data.giftDetails.giftName) || 'Gift';
    const act = mapGiftToAction(gName, coins);

    console.log('[GIFT REALTIME] @' + uniqueId + ' -> ' + gName + ' x' + count + ' (' + coins + 'c) => ' + act.label);
    io.emit('live-event', {
      kind: 'gift',
      dir: act.dir,
      type: act.type,
      label: act.label,
      user: uniqueId,
      nickname,
      giftName: gName,
      count,
      coins,
      meters: act.meters * count,
      power: act.power * Math.min(count, 8)
    });
  });

  tiktok.on('streamEnd', () => { activeConnection = null; isConnecting = false; });
  tiktok.on('disconnected', () => { activeConnection = null; isConnecting = false; });
}

io.on('connection', (socket) => {
  if (activeConnection) socket.emit('status', { state: 'connected', text: 'LIVE: @' + TARGET_USER });
  else connectTikTokRoom();
  socket.on('join-live', () => {
    if (activeConnection) socket.emit('status', { state: 'connected', text: 'LIVE: @' + TARGET_USER });
    else connectTikTokRoom();
  });
});

server.listen(3000, () => {
  console.log('====================================================');
  console.log('SERVER REAL-TIME PENONTON + GIFT LENGKAP AKTIF (@ptrgenz)');
  console.log('URL LIVE STUDIO: https://damaputradesta-wq.github.io/tiktok-cliff-game/?user=ptrgenz&live=1&realtime=1');
  console.log('====================================================');
  connectTikTokRoom();
});
