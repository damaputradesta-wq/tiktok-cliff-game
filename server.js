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

function mapGiftToAction(giftName, coins) {
  const name = (giftName || '').toLowerCase();
  // Gift Bantu Maju / NAIK
  if (name.includes('persahabatan') || name.includes('kalung') || name.includes('hati') || name.includes('heart') || name.includes('cinta')) {
    return { dir: 'up', type: 'kopdes', label: 'Truk Kopdes', power: 180 };
  }
  if (name.includes('roket') || name.includes('pesawat') || name.includes('optimus')) {
    return { dir: 'up', type: 'jet', label: 'Turbo Jet MBG', power: 450 };
  }
  // Gift Ganggu Mundur / TURUN
  if (name.includes('mawar') || name.includes('rose')) {
    return { dir: 'down', type: 'angkot', label: 'Angkot Biru', power: 95 };
  }
  if (name.includes('es ') || name.includes('ice') || name.includes('panci') || name.includes('kaki')) {
    return { dir: 'down', type: 'kaki', label: 'Injakan Kaki Raksasa', power: 140 };
  }
  if (name.includes('rosa') || name.includes('bom') || name.includes('kopi') || name.includes('tiktok')) {
    return { dir: 'down', type: 'soundhoreg', label: 'Truk Sound Horeg', power: 260 };
  }
  if (name.includes('beruang') || name.includes('miska') || name.includes('parfum') || name.includes('topi')) {
    return { dir: 'down', type: 'kameha', label: 'Laser Kamehameha', power: 380 };
  }
  if (name.includes('donat') || name.includes('doughnut') || name.includes('ufo')) {
    return { dir: 'down', type: 'ufo', label: 'UFO Sedot MBG', power: 520 };
  }
  if (name.includes('singa') || name.includes('lion') || name.includes('paus') || name.includes('universe') || coins >= 100) {
    return { dir: 'down', type: 'meteor', label: 'Meteor Api Raksasa', power: 900 };
  }

  if (coins >= 50) return { dir: 'down', type: 'meteor', label: 'Meteor Api Raksasa', power: 750 };
  if (coins >= 25) return { dir: 'down', type: 'ufo', label: 'UFO Alien', power: 480 };
  if (coins >= 15) return { dir: 'down', type: 'kameha', label: 'Laser Kamehameha', power: 350 };
  if (coins >= 8)  return { dir: 'down', type: 'soundhoreg', label: 'Truk Sound Horeg', power: 240 };
  if (coins >= 3)  return { dir: 'up', type: 'kopdes', label: 'Truk Kopdes', power: 170 };
  return { dir: 'down', type: 'angkot', label: 'Angkot Biru', power: 90 };
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

  tiktok.on('like', (data) => {
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'penonton';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const avatar = data.profilePictureUrl || (data.user && data.user.profilePicture && data.user.profilePicture.url && data.user.profilePicture.url[0]) || '';
    const likeCount = data.likeCount || 1;
    io.emit('live-event', {
      kind: 'boost',
      dir: 'up',
      type: 'tap',
      user: uniqueId,
      nickname,
      avatar,
      power: Math.min(likeCount * 6, 45)
    });
  });

  tiktok.on('chat', (data) => {
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'penonton';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const avatar = data.profilePictureUrl || (data.user && data.user.profilePicture && data.user.profilePicture.url && data.user.profilePicture.url[0]) || '';
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
      user: uniqueId,
      nickname,
      avatar,
      comment,
      power: 35
    });
  });

  tiktok.on('gift', (data) => {
    const giftType = data.giftType ?? (data.giftDetails && data.giftDetails.giftType) ?? 0;
    if (giftType === 1 && !data.repeatEnd) return;
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'sultan';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const avatar = data.profilePictureUrl || (data.user && data.user.profilePicture && data.user.profilePicture.url && data.user.profilePicture.url[0]) || '';
    const count = data.repeatCount || 1;
    const diamondCount = data.diamondCount ?? (data.giftDetails && data.giftDetails.diamondCount) ?? 1;
    const coins = diamondCount * count;
    const gName = data.giftName || (data.giftDetails && data.giftDetails.giftName) || 'Gift';
    const giftImg = data.giftPictureUrl || '';
    const act = mapGiftToAction(gName, coins);

    console.log('[GIFT] @' + uniqueId + ' -> ' + gName + ' x' + count + ' (' + act.label + ')');
    io.emit('live-event', {
      kind: 'gift',
      dir: act.dir,
      type: act.type,
      label: act.label,
      user: uniqueId,
      nickname,
      avatar,
      giftName: gName,
      count,
      giftImg,
      coins,
      power: act.power * Math.min(count, 10)
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
  console.log('SERVER MBG HILL RACING + TIKTOK LIVE AKTIF (@ptrgenz)');
  console.log('Buka di Live Studio: https://damaputradesta-wq.github.io/tiktok-cliff-game/?user=ptrgenz&live=1&mbg=1');
  console.log('====================================================');
  connectTikTokRoom();
});
