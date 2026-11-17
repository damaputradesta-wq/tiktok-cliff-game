const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

const connections = new Map();

io.on('connection', (socket) => {
  socket.on('join-live', (username) => {
    if (!username) return;
    const cleanUser = username.replace('@', '').trim().toLowerCase();
    socket.join(cleanUser);

    if (connections.has(cleanUser)) {
      socket.emit('status', 'Terhubung ke Live @' + cleanUser);
      return;
    }

    const tiktok = new WebcastPushConnection(cleanUser);
    tiktok.connect().then(() => {
      connections.set(cleanUser, tiktok);
      io.to(cleanUser).emit('status', 'LIVE AKTIF: @' + cleanUser);
    }).catch(() => {
      socket.emit('status', 'Menunggu @' + cleanUser + ' Live / Mode Simulasi');
    });

    tiktok.on('like', (data) => {
      io.to(cleanUser).emit('game-event', {
        type: 'boost',
        user: data.uniqueId,
        avatar: data.profilePictureUrl,
        power: Math.min((data.likeCount || 1) * 3, 30)
      });
    });

    tiktok.on('chat', (data) => {
      io.to(cleanUser).emit('game-event', {
        type: 'boost',
        user: data.uniqueId,
        avatar: data.profilePictureUrl,
        power: 15
      });
    });

    tiktok.on('gift', (data) => {
      if (data.giftType === 1 && !data.repeatEnd) return;
      const coins = (data.diamondCount || 1) * (data.repeatCount || 1);
      io.to(cleanUser).emit('game-event', {
        type: coins >= 10 ? 'meteor' : 'boulder',
        user: data.uniqueId,
        avatar: data.profilePictureUrl,
        giftName: data.giftName || 'Gift',
        coins: coins,
        power: coins >= 10 ? 180 : 45 * (data.repeatCount || 1)
      });
    });

    tiktok.on('streamEnd', () => {
      connections.delete(cleanUser);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server berjalan di port ' + PORT));
