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

app.get('/tts', (req, res) => {
  const rawText = (req.query.text || '').toString().trim();
  if (!rawText) return res.status(400).end();
  const trUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=' + encodeURIComponent(rawText);
  https.get(trUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (trRes) => {
    let body = '';
    trRes.on('data', (chunk) => body += chunk);
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

function mapGiftToChallenge(giftName, coins) {
  const name = (giftName || '').toLowerCase();
  if (name.includes('mawar') || name.includes('rose')) return 'saw';
  if (name.includes('donat') || name.includes('doughnut')) return 'donut';
  if (name.includes('hati') || name.includes('heart') || name.includes('petir')) return 'bolt';
  if (name.includes('es ') || name.includes('ice') || name.includes('salju')) return 'ice';
  if (name.includes('bom') || name.includes('kopi') || name.includes('rosa')) return 'bomb';
  if (name.includes('palu') || name.includes('parfum') || name.includes('topi')) return 'hammer';
  if (name.includes('roket') || name.includes('pesawat') || name.includes('mahkota') || name.includes('konfeti')) return 'ufo';
  if (name.includes('singa') || name.includes('lion') || name.includes('paus') || name.includes('kereta') || name.includes('universe')) return 'meteor';
  if (coins >= 100) return 'meteor';
  if (coins >= 30) return 'ufo';
  if (coins >= 15) return 'hammer';
  if (coins >= 10) return 'bomb';
  if (coins >= 5) return 'bolt';
  if (coins >= 2) return 'ice';
  return 'saw';
}

function connectTikTokRoom() {
  if (activeConnection || isConnecting) return;
  isConnecting = true;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  console.log('[TIKTOK] Mencoba menghubungkan ke Live @' + TARGET_USER + '...');
  io.emit('status', { state: 'connecting', text: 'Mencari sinyal Live @' + TARGET_USER + '...' });
  const tiktok = new LiveConnection(TARGET_USER, {
    processInitialData: false,
    enableExtendedGiftInfo: false,
    requestPollingIntervalMs: 2000
  });
  tiktok.connect().then((state) => {
    isConnecting = false;
    activeConnection = tiktok;
    console.log('[SUKSES] TERHUBUNG KE LIVE @' + TARGET_USER + ' (Room ID: ' + state.roomId + ')');
    io.emit('status', { state: 'connected', text: 'LIVE TERHUBUNG: @' + TARGET_USER });
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
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'user';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const avatar = data.profilePictureUrl || (data.user && data.user.profilePicture && data.user.profilePicture.url && data.user.profilePicture.url[0]) || '';
    const likeCount = data.likeCount || 1;
    io.emit('live-event', { kind: 'boost', user: uniqueId, nickname, avatar, power: Math.min(likeCount * 3, 35) });
  });
  tiktok.on('chat', (data) => {
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'user';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const avatar = data.profilePictureUrl || (data.user && data.user.profilePicture && data.user.profilePicture.url && data.user.profilePicture.url[0]) || '';
    const comment = (data.comment || '').trim();
    console.log('[CHAT] @' + uniqueId + ': ' + comment);
    const reqMatch = comment.match(/^(?:!lagu|!play|req|request)\s+(.+)/i);
    if (reqMatch && reqMatch[1]) {
      const songQuery = reqMatch[1].trim().slice(0, 60);
      console.log('[REQUEST LAGU] @' + uniqueId + ' -> ' + songQuery);
      io.emit('song-request', { user: nickname, query: songQuery });
    }
    io.emit('live-event', { kind: 'chat', user: uniqueId, nickname, avatar, comment, power: 20 });
  });
  tiktok.on('gift', (data) => {
    const giftType = data.giftType ?? (data.giftDetails && data.giftDetails.giftType) ?? 0;
    if (giftType === 1 && !data.repeatEnd) return;
    const uniqueId = data.uniqueId || (data.user && data.user.uniqueId) || 'user';
    const nickname = data.nickname || (data.user && data.user.nickname) || uniqueId;
    const avatar = data.profilePictureUrl || (data.user && data.user.profilePicture && data.user.profilePicture.url && data.user.profilePicture.url[0]) || '';
    const count = data.repeatCount || 1;
    const diamondCount = data.diamondCount ?? (data.giftDetails && data.giftDetails.diamondCount) ?? 1;
    const coins = diamondCount * count;
    const gName = data.giftName || (data.giftDetails && data.giftDetails.giftName) || 'Gift';
    const giftImg = data.giftPictureUrl || '';
    const challengeId = mapGiftToChallenge(gName, coins);
    console.log('[GIFT MASUK] @' + uniqueId + ' kirim ' + gName + ' x' + count);
    io.emit('live-event', { kind: 'gift', id: challengeId, user: uniqueId, nickname, avatar, giftName: gName + (count > 1 ? ' x' + count : ''), giftImg, coins, pwr: Math.min(35 + coins * 8, 450) });
  });
  tiktok.on('streamEnd', () => { activeConnection = null; isConnecting = false; });
  tiktok.on('disconnected', () => { activeConnection = null; isConnecting = false; });
}

io.on('connection', (socket) => {
  if (activeConnection) socket.emit('status', { state: 'connected', text: 'LIVE TERHUBUNG: @' + TARGET_USER });
  else connectTikTokRoom();
  socket.on('join-live', () => {
    if (activeConnection) socket.emit('status', { state: 'connected', text: 'LIVE TERHUBUNG: @' + TARGET_USER });
    else connectTikTokRoom();
  });
});

server.listen(3000, () => {
  console.log('====================================================');
  console.log('SERVER AKTIF! MUSIK SPOTIFY + SUARA INDONESIA SIAP!');
  console.log('URL LIVE STUDIO: https://damaputradesta-wq.github.io/tiktok-cliff-game/?user=ptrgenz&live=1&musik=1');
  console.log('====================================================');
  connectTikTokRoom();
});