const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.type('html').send('<script src="/socket.io/socket.io.js"></script><script src="/game.js"></script>');
});

const connections = new Map();
const ALL_CHALLENGES = ['sawblade', 'ufo_laser', 'meteor', 'lightning', 'bomb', 'freeze', 'hammer', 'lava_wave'];

io.on('connection', (socket) => {
  socket.on('join-live', (username) => {
    if (!username) return;
    const clean = username.replace('@', '').trim().toLowerCase();
    socket.join(clean);
    if (connections.has(clean)) {
      socket.emit('status', 'TERHUBUNG KE LIVE @' + clean);
      return;
    }
    const tiktok = new WebcastPushConnection(clean);
    tiktok.connect().then(() => {
      connections.set(clean, tiktok);
      io.to(clean).emit('status', 'LIVE AKTIF: @' + clean);
    }).catch(() => {
      socket.emit('status', 'MODE AUTO-SIMULASI (@' + clean + ' belum live)');
    });

    tiktok.on('like', (d) => {
      io.to(clean).emit('event', { kind: 'boost', user: d.uniqueId, power: Math.min((d.likeCount || 1) * 4, 40) });
    });

    tiktok.on('chat', (d) => {
      io.to(clean).emit('event', { kind: 'shield', user: d.uniqueId, comment: d.comment, power: 18 });
    });

    tiktok.on('gift', (d) => {
      if (d.giftType === 1 && !d.repeatEnd) return;
      const count = d.repeatCount || 1;
      const coins = (d.diamondCount || 1) * count;
      let challenge = ALL_CHALLENGES[Math.floor(Math.random() * ALL_CHALLENGES.length)];
      if (coins >= 30) challenge = 'ufo_laser';
      else if (coins >= 15) challenge = 'meteor';
      else if (coins >= 5) challenge = 'sawblade';
      io.to(clean).emit('event', {
        kind: 'gift',
        challenge,
        user: d.uniqueId,
        giftName: (d.giftName || 'Gift') + (count > 1 ? ' x' + count : ''),
        coins,
        power: Math.min(35 + coins * 10, 400)
      });
    });

    tiktok.on('streamEnd', () => connections.delete(clean));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Game Engine JS aktif di http://localhost:' + PORT));