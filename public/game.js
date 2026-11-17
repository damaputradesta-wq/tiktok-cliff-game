(function () {
  document.title = 'CYBER CLIMBER: ARENA GIFT TIKTOK LIVE';
  document.documentElement.style.margin = '0';
  document.body.style.cssText = 'margin:0;padding:0;background:#030712;overflow:hidden;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Segoe UI,sans-serif;user-select:none;color:#fff;';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:520px;height:100vh;background:#090d16;overflow:hidden;box-shadow:0 0 60px #000;border-left:2px solid #1e293b;border-right:2px solid #1e293b;';
  document.body.appendChild(wrap);

  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 920;
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Panel Kontrol JS Murni
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;bottom:8px;left:8px;right:8px;background:rgba(15,23,42,0.94);border:1px solid #334155;border-radius:12px;padding:8px;z-index:20;';
  wrap.appendChild(bar);

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;gap:5px;margin-bottom:6px;';
  bar.appendChild(topRow);

  const input = document.createElement('input');
  input.placeholder = 'Ketik @username TikTok Live...';
  input.style.cssText = 'flex:1;background:#020617;border:1px solid #475569;color:#fff;padding:6px 10px;border-radius:7px;font-size:12px;';
  topRow.appendChild(input);

  function makeBtn(label, bg, onClick) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'background:' + bg + ';color:#fff;border:none;border-radius:7px;padding:7px 9px;font-weight:800;font-size:11px;cursor:pointer;';
    b.onclick = onClick;
    return b;
  }

  let autoMode = true;
  const autoBtn = makeBtn('AUTO-TANTANGAN: ON', '#dc2626', () => {
    autoMode = !autoMode;
    autoBtn.textContent = autoMode ? 'AUTO-TANTANGAN: ON' : 'AUTO-TANTANGAN: OFF';
    autoBtn.style.background = autoMode ? '#dc2626' : '#475569';
  });
  topRow.appendChild(makeBtn('HUBUNGKAN', '#2563eb', () => connectLive(input.value)));
  topRow.appendChild(autoBtn);

  const btnGrid = document.createElement('div');
  btnGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;';
  bar.appendChild(btnGrid);

  // Synthesizer Sound & Suara Komentator Bahasa Indonesia
  let actx = null;
  function sfx(freq1, freq2, dur, type) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const now = actx.currentTime;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'sawtooth';
      o.frequency.setValueAtTime(freq1, now);
      o.frequency.exponentialRampToValueAtTime(freq2, now + dur);
      g.gain.setValueAtTime(0.14, now);
      g.gain.linearRampToValueAtTime(0.01, now + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(now); o.stop(now + dur);
    } catch (e) {}
  }

  function speak(txt) {
    try {
      if (!window.speechSynthesis || window.speechSynthesis.speaking) return;
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'id-ID';
      u.rate = 1.2;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // Variabel Fisika & State Game
  let altitude = 60, targetAlt = 60, wins = 0, combo = 0, shield = 30, shake = 0, flash = 0, lavaH = 55;
  let statusText = 'AUTO-CHALLENGE AKTIF';
  let banner = { text: '', sub: '', timer: 0, color: '#ef4444' };
  const logs = [];
  const trolls = {};
  const hazards = [];
  const particles = [];
  const popups = [];

  const player = { x: 260, y: 540, tx: 260, phase: 0, jetpack: 0, frozen: 0, bomb: null, hurt: 0 };
  const stars = Array.from({ length: 60 }, () => ({ x: Math.random() * 520, y: Math.random() * 920, r: Math.random() * 2 + 1 }));
  const rocks = Array.from({ length: 16 }, (_, i) => ({ x: 105 + Math.random() * 270, y: i * 60, w: 45 + Math.random() * 45 }));

  function burst(x, y, color, n) {
    for (let i = 0; i < (n || 20); i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 8 + 2;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 5 + 2, color, life: 1 });
    }
  }

  function addPopup(x, y, txt, color) {
    popups.push({ x, y, txt, color, life: 1 });
  }

  function hitPlayer(dmg, label) {
    combo = 0;
    if (shield > 0) {
      const abs = Math.min(shield, dmg);
      shield -= abs; dmg -= abs;
      addPopup(player.x, player.y - 45, 'SHIELD -' + Math.round(abs), '#38bdf8');
    }
    if (dmg > 0) {
      targetAlt = Math.max(0, targetAlt - dmg);
      player.hurt = 25;
      shake = Math.min(35, 10 + dmg / 5);
      flash = 0.5;
      sfx(180, 42, 0.35, 'square');
      addPopup(player.x, player.y - 20, '-' + Math.round(dmg) + 'm (' + label + ')', '#f87171');
    }
  }

  function triggerBoost(user, pwr, isShield) {
    combo++;
    targetAlt = Math.min(1000, targetAlt + pwr);
    player.jetpack = 40;
    player.frozen = 0;
    if (isShield) shield = Math.min(100, shield + 30);
    if (player.bomb) {
      player.bomb.hp--;
      if (player.bomb.hp <= 0) { player.bomb = null; addPopup(player.x, player.y - 55, 'BOM DIJINAKKAN!', '#4ade80'); }
    }
    sfx(240, 720, 0.22, 'sawtooth');
    burst(player.x, player.y + 30, '#38bdf8', 14);
    addPopup(player.x, player.y - 30, '+' + pwr + 'm NITRO!', '#4ade80');
    logs.unshift({ txt: '?? @' + user + ' kasih Boost +' + pwr + 'm', c: '#4ade80' });
    if (logs.length > 5) logs.pop();
  }

  const CHALLENGE_NAMES = {
    sawblade: 'RODA GERGAJI BERDURI',
    ufo_laser: 'BOSS UFO LASER',
    meteor: 'HUJAN METEOR SULTAN',
    lightning: 'SAMBERAN PETIR LASER',
    bomb: 'BOM WAKTU TEMPEL',
    freeze: 'BADAI ES PEMBEKU',
    hammer: 'PALU RAKSASA THOR',
    lava_wave: 'TSUNAMI LAVA NAIK'
  };

  function triggerGiftChallenge(ev) {
    const user = ev.user || 'Sultan_TikTok';
    const gift = ev.giftName || 'Mawar';
    const ch = ev.challenge || 'sawblade';
    const pwr = ev.power || 55;

    trolls[user] = (trolls[user] || 0) + pwr;
    const cName = CHALLENGE_NAMES[ch] || 'SERANGAN GIFT';
    banner = { text: '?? ' + cName + '!', sub: '@' + user + ' kirim ' + gift + ' (-' + pwr + 'm)', timer: 95, color: '#ef4444' };
    logs.unshift({ txt: '?? @' + user + ' (' + gift + ') -> ' + cName, c: '#f87171' });
    if (logs.length > 5) logs.pop();

    sfx(520, 880, 0.3, 'triangle');
    speak(user + ' mengirim ' + gift + ', ' + cName);

    if (ch === 'sawblade') {
      for (let i = 0; i < 3; i++) {
        hazards.push({ kind: 'saw', x: 130 + Math.random() * 260, y: -40 - i * 80, vx: (i % 2 ? 5 : -5), vy: 7.5, r: 28, rot: 0, user, pwr: pwr * 0.5 });
      }
      player.tx = 135 + Math.random() * 250;
    } else if (ch === 'ufo_laser') {
      hazards.push({ kind: 'ufo', x: 260, y: 135, vx: 4.5, timer: 130, pwr, user });
    } else if (ch === 'meteor') {
      lavaH = 150;
      for (let i = 0; i < 5; i++) {
        hazards.push({ kind: 'meteor', x: 110 + Math.random() * 300, y: -50 - i * 90, vx: (Math.random() - 0.5) * 4, vy: 11, r: 36, user, pwr: pwr * 0.45 });
      }
    } else if (ch === 'lightning') {
      hazards.push({ kind: 'bolt', x: player.x, timer: 42, user, pwr });
      player.tx = player.x > 260 ? 150 : 370;
    } else if (ch === 'bomb') {
      player.bomb = { timer: 135, pwr: pwr + 35, hp: 3, user };
    } else if (ch === 'freeze') {
      player.frozen = 100;
      burst(player.x, player.y, '#67e8f9', 28);
      hitPlayer(pwr * 0.65, 'ES BEKU');
    } else if (ch === 'hammer') {
      hazards.push({ kind: 'hammer', side: Math.random() > 0.5 ? 1 : -1, ang: -1.5, y: player.y, pwr, user, hit: false });
    } else if (ch === 'lava_wave') {
      lavaH = 290;
      hitPlayer(pwr * 0.75, 'LAVA PANAS');
    }
  }

  // Tombol Tes Cepat di Bawah
  const USERS = ['Sultan_Tasik', 'Raja_Sawer88', 'Bocil_Troll', 'Naga_Merah', 'Kaisar_Gift', 'Desta_Pro'];
  const rUser = () => USERS[Math.floor(Math.random() * USERS.length)];

  btnGrid.appendChild(makeBtn('?? NITRO', '#059669', () => triggerBoost(rUser(), 28, true)));
  btnGrid.appendChild(makeBtn('?? GERGAJI', '#d97706', () => triggerGiftChallenge({ challenge: 'sawblade', user: rUser(), giftName: 'Mawar', power: 45 })));
  btnGrid.appendChild(makeBtn('?? UFO BOSS', '#7c3aed', () => triggerGiftChallenge({ challenge: 'ufo_laser', user: rUser(), giftName: ' Paus', power: 95 })));
  btnGrid.appendChild(makeBtn('? PETIR', '#0284c7', () => triggerGiftChallenge({ challenge: 'lightning', user: rUser(), giftName: 'Jari Hati', power: 55 })));
  btnGrid.appendChild(makeBtn('?? BOM', '#dc2626', () => triggerGiftChallenge({ challenge: 'bomb', user: rUser(), giftName: 'Bom', power: 65 })));
  btnGrid.appendChild(makeBtn('?? BEKU', '#0891b2', () => triggerGiftChallenge({ challenge: 'freeze', user: rUser(), giftName: 'Es Krim', power: 50 })));
  btnGrid.appendChild(makeBtn('?? PALU', '#9333ea', () => triggerGiftChallenge({ challenge: 'hammer', user: rUser(), giftName: 'Palu Thor', power: 75 })));
  btnGrid.appendChild(makeBtn('?? METEOR', '#ea580c', () => triggerGiftChallenge({ challenge: 'meteor', user: rUser(), giftName: 'Singa Sultan', power: 130 })));

  // Auto-Bot Rame Otomatis
  setInterval(() => {
    if (!autoMode) return;
    if (Math.random() < 0.38) {
      triggerBoost(rUser(), 24, Math.random() > 0.5);
    } else {
      const keys = Object.keys(CHALLENGE_NAMES);
      const gifts = ['Mawar', 'Kopi', 'Jari Hati', 'Donat', 'Mahkota', 'Roket', 'Singa'];
      const k = keys[Math.floor(Math.random() * keys.length)];
      const g = gifts[Math.floor(Math.random() * gifts.length)];
      triggerGiftChallenge({ challenge: k, user: rUser(), giftName: g, power: 40 + Math.floor(Math.random() * 70) });
    }
  }, 2400);

  // Koneksi Socket.io TikTok Live
  let socket = null;
  function connectLive(username) {
    if (!username) return;
    try {
      const url = location.hostname.includes('github.io') ? 'http://localhost:3000' : location.origin;
      if (socket) socket.disconnect();
      socket = io(url);
      socket.emit('join-live', username);
      socket.on('status', (m) => { statusText = m; });
      socket.on('event', (ev) => {
        if (ev.kind === 'boost' || ev.kind === 'shield') triggerBoost(ev.user, ev.power, ev.kind === 'shield');
        else triggerGiftChallenge(ev);
      });
    } catch (e) {}
  }

  // Render Karakter Cyber Ninja
  function drawHero(x, y) {
    ctx.save();
    ctx.translate(x, y);
    if (player.jetpack > 0) {
      player.jetpack--;
      ctx.fillStyle = Math.random() > 0.5 ? '#f97316' : '#fde047';
      ctx.beginPath(); ctx.moveTo(-14, 20); ctx.lineTo(14, 20); ctx.lineTo(0, 68 + Math.random() * 22); ctx.fill();
    }
    if (shield > 0) {
      ctx.strokeStyle = 'rgba(56,189,248,0.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke();
    }
    const sw = Math.sin(player.phase) * 15;
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, 14); ctx.lineTo(-18, 35 + sw * 0.6);
    ctx.moveTo(9, 14);  ctx.lineTo(18, 35 - sw * 0.6);
    ctx.moveTo(-12, -5); ctx.lineTo(-26, -24 + sw);
    ctx.moveTo(12, -5);  ctx.lineTo(26, -24 - sw);
    ctx.stroke();

    // Jubah Berkibar
    ctx.fillStyle = '#e11d48';
    ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(12, -8); ctx.lineTo(20 + Math.sin(player.phase * 2) * 8, 26); ctx.lineTo(-18, 24); ctx.fill();

    // Armor & Helm Cyber
    ctx.fillStyle = player.hurt > 0 ? '#ef4444' : '#0284c7';
    ctx.fillRect(-14, -12, 28, 28);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(0, -24, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fde047'; ctx.fillRect(-9, -27, 18, 5);

    if (player.frozen > 0) {
      ctx.fillStyle = 'rgba(103,232,249,0.55)'; ctx.fillRect(-30, -45, 60, 88);
    }
    if (player.bomb) {
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 4, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(player.bomb.timer / 35), 0, 9);
    }
    ctx.restore();
  }

  // Game Loop 60 FPS
  function tick() {
    if (player.frozen > 0) { player.frozen--; targetAlt = Math.max(0, targetAlt - 0.2); }
    else { targetAlt += player.jetpack > 0 ? 0.9 : 0.22; player.phase += player.jetpack > 0 ? 0.38 : 0.18; }
    if (player.hurt > 0) player.hurt--;

    if (player.bomb) {
      player.bomb.timer--;
      if (player.bomb.timer <= 0) { burst(player.x, player.y, '#ef4444', 40); hitPlayer(player.bomb.pwr, 'BOM MELEDAK'); player.bomb = null; }
    }

    if (targetAlt >= 1000) {
      wins++; targetAlt = 30; altitude = 30;
      banner = { text: '?? PUNCAK 1000M TEMBUS!', sub: 'Total Menang: ' + wins + 'x', timer: 110, color: '#10b981' };
      burst(260, 300, '#fde047', 50);
      speak('Selamat! Puncak seribu meter berhasil ditaklukkan!');
    }

    altitude += (targetAlt - altitude) * 0.1;
    player.x += (player.tx - player.x) * 0.09;
    if (lavaH > 55) lavaH -= 0.6;

    ctx.save();
    if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.88; }

    // Background & Bintang
    const g = ctx.createLinearGradient(0, 0, 0, 920);
    g.addColorStop(0, '#020617'); g.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 520, 920);
    ctx.fillStyle = '#fff';
    for (const s of stars) ctx.fillRect(s.x, (s.y + altitude * 3) % 920, s.r, s.r);

    // Tebing & Pijakan
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 90, 920); ctx.fillRect(430, 0, 90, 920);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(90, 0, 340, 920);
    const offY = (altitude * 16) % 920;
    for (const r of rocks) {
      const ry = (r.y + offY) % 920;
      ctx.fillStyle = '#475569'; ctx.fillRect(r.x, ry, r.w, 14);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(r.x + 3, ry + 2, r.w - 6, 4);
    }

    drawHero(player.x, player.y);

    // Update Semua Rintangan Gift
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      if (h.kind === 'saw' || h.kind === 'meteor') {
        h.x += h.vx; h.y += h.vy; h.rot = (h.rot || 0) + 0.25;
        if (h.x < 115 || h.x > 405) h.vx *= -1;
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
        ctx.fillStyle = h.kind === 'meteor' ? '#ef4444' : '#eab308';
        ctx.beginPath(); ctx.arc(0, 0, h.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('@' + h.user, h.x, h.y + 4);
        if (Math.hypot(h.x - player.x, h.y - player.y) < h.r + 24) {
          burst(h.x, h.y, '#ef4444', 25); hitPlayer(h.pwr, h.kind === 'meteor' ? 'METEOR' : 'GERGAJI');
          hazards.splice(i, 1); continue;
        }
        if (h.y > 960) hazards.splice(i, 1);
      } else if (h.kind === 'ufo') {
        h.timer--; h.x += h.vx;
        if (h.x < 130 || h.x > 390) h.vx *= -1;
        ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 48, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(h.x, h.y - 10, 22, Math.PI, 0); ctx.fill();
        if (h.timer % 35 < 14) {
          ctx.fillStyle = 'rgba(239,68,68,0.65)'; ctx.fillRect(h.x - 16, h.y + 15, 32, 750);
          if (Math.abs(player.x - h.x) < 34) hitPlayer(h.pwr * 0.25, 'LASER UFO');
        }
        if (h.timer <= 0) hazards.splice(i, 1);
      } else if (h.kind === 'bolt') {
        h.timer--;
        if (h.timer > 12) {
          ctx.strokeStyle = 'rgba(239,68,68,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x, 0); ctx.lineTo(h.x, 920); ctx.stroke();
        } else {
          ctx.strokeStyle = '#fde047'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(h.x, 0); ctx.lineTo(h.x - 20, 320); ctx.lineTo(h.x + 20, 540); ctx.lineTo(h.x, 920); ctx.stroke();
          if (h.timer === 10 && Math.abs(player.x - h.x) < 46) hitPlayer(h.pwr, 'PETIR');
        }
        if (h.timer <= 0) hazards.splice(i, 1);
      } else if (h.kind === 'hammer') {
        h.ang += 0.15;
        const px = h.side === 1 ? 90 : 430;
        const hx = px + Math.cos(h.ang) * 170 * h.side, hy = h.y + Math.sin(h.ang) * 170;
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(px, h.y); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = '#9333ea'; ctx.beginPath(); ctx.arc(hx, hy, 36, 0, Math.PI * 2); ctx.fill();
        if (!h.hit && Math.hypot(hx - player.x, hy - player.y) < 55) { h.hit = true; hitPlayer(h.pwr, 'PALU THOR'); }
        if (h.ang > 1.6) hazards.splice(i, 1);
      }
    }

    // Partikel & Popup
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.04;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = popups.length - 1; i >= 0; i--) {
      const f = popups[i]; f.y -= 1.8; f.life -= 0.025;
      if (f.life <= 0) { popups.splice(i, 1); continue; }
      ctx.globalAlpha = f.life; ctx.fillStyle = f.color; ctx.font = '900 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // Lava Membara
    ctx.fillStyle = '#dc2626'; ctx.fillRect(90, 920 - lavaH, 340, lavaH);
    ctx.fillStyle = '#fde047'; ctx.fillRect(90, 920 - lavaH, 340, 6);

    // HUD Canvas Langsung (Murni JS)
    ctx.fillStyle = 'rgba(15,23,42,0.88)'; ctx.fillRect(12, 12, 235, 86); ctx.fillRect(273, 12, 235, 86);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(12, 12, 235, 86);
    ctx.strokeStyle = '#f59e0b'; ctx.strokeRect(273, 12, 235, 86);

    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('TARGET PUNCAK: 1000 METER', 24, 32);
    ctx.fillStyle = '#38bdf8'; ctx.font = '900 30px sans-serif';
    ctx.fillText(Math.floor(altitude) + ' m', 24, 65);
    ctx.fillStyle = '#4ade80'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(statusText, 24, 86);

    ctx.fillStyle = '#fde047'; ctx.fillText('MENANG: ' + wins + 'x | SHIELD: ' + Math.round(shield) + '%', 285, 32);
    ctx.fillStyle = '#fca5a5'; ctx.fillText('TOP SULTAN PENGGANGGU:', 285, 50);
    const top = Object.entries(trolls).sort((a, b) => b[1] - a[1])[0];
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText(top ? '@' + top[0] + ' (-' + Math.round(top[1]) + 'm)' : 'Menunggu Gift...', 285, 72);

    // Live Log Feed
    logs.forEach((l, idx) => {
      ctx.fillStyle = 'rgba(15,23,42,0.82)'; ctx.fillRect(12, 108 + idx * 24, 290, 20);
      ctx.fillStyle = l.c; ctx.font = 'bold 11px sans-serif'; ctx.fillText(l.txt, 18, 122 + idx * 24);
    });

    // Banner Tengah Saat Ada Gift Masuk
    if (banner.timer > 0) {
      banner.timer--;
      ctx.fillStyle = 'rgba(185,28,28,0.95)'; ctx.fillRect(40, 250, 440, 74);
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.strokeRect(40, 250, 440, 74);
      ctx.fillStyle = '#fde047'; ctx.font = '900 20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(banner.text, 260, 282);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText(banner.sub, 260, 308);
    }

    if (flash > 0) {
      ctx.fillStyle = 'rgba(239,68,68,' + flash + ')'; ctx.fillRect(0, 0, 520, 920); flash *= 0.85;
    }
    ctx.restore();
    requestAnimationFrame(tick);
  }
  tick();
})();