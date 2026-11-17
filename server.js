const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const connections = new Map();

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

io.on('connection', (socket) => {
  socket.on('join-live', (username) => {
    if (!username) return;
    const clean = username.replace('@', '').trim().toLowerCase();
    socket.join(clean);

    if (connections.has(clean)) {
      socket.emit('status', { state: 'connected', text: 'TERHUBUNG KE LIVE @' + clean });
      return;
    }

    socket.emit('status', { state: 'connecting', text: 'Menghubungkan ke Live @' + clean + '...' });
    const tiktok = new WebcastPushConnection(clean, { processInitialData: false });

    tiktok.connect().then((state) => {
      connections.set(clean, tiktok);
      io.to(clean).emit('status', { state: 'connected', text: 'LIVE REAL AKTIF: @' + clean + ' (Room ' + state.roomId + ')' });
    }).catch((err) => {
      socket.emit('status', { state: 'waiting', text: 'Menunggu @' + clean + ' mulai Live di TikTok Studio...' });
    });

    tiktok.on('like', (data) => {
      io.to(clean).emit('live-event', {
        kind: 'boost',
        user: data.uniqueId,
        nickname: data.nickname || data.uniqueId,
        avatar: data.profilePictureUrl || '',
        power: Math.min((data.likeCount || 1) * 3, 35)
      });
    });

    tiktok.on('chat', (data) => {
      io.to(clean).emit('live-event', {
        kind: 'chat',
        user: data.uniqueId,
        nickname: data.nickname || data.uniqueId,
        avatar: data.profilePictureUrl || '',
        comment: data.comment || '',
        power: 15
      });
    });

    tiktok.on('gift', (data) => {
      if (data.giftType === 1 && !data.repeatEnd) return;
      const count = data.repeatCount || 1;
      const coins = (data.diamondCount || 1) * count;
      const gName = data.giftName || 'Gift';
      const challengeId = mapGiftToChallenge(gName, coins);

      io.to(clean).emit('live-event', {
        kind: 'gift',
        id: challengeId,
        user: data.uniqueId,
        nickname: data.nickname || data.uniqueId,
        avatar: data.profilePictureUrl || '',
        giftName: gName + (count > 1 ? ' x' + count : ''),
        giftImg: data.giftPictureUrl || '',
        coins: coins,
        pwr: Math.min(35 + coins * 8, 450)
      });
    });

    tiktok.on('streamEnd', () => {
      connections.delete(clean);
      io.to(clean).emit('status', { state: 'ended', text: 'Siaran Live @' + clean + ' telah berakhir.' });
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('====================================================');
  console.log('JEMBATAN GIFT ASLI TIKTOK AKTIF DI PORT ' + PORT);
  console.log('Biarkan terminal ini terbuka saat kamu Live!');
  console.log('====================================================');
});
