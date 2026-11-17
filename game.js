
(function startGame() {
  if (!document.body) {
    window.addEventListener('DOMContentLoaded', startGame);
    return;
  }

  document.title = 'RAJA TEBING: ARENA GIFT TIKTOK LIVE';
  document.documentElement.style.cssText = 'margin:0;padding:0;width:100%;height:100%;background:#020617;overflow:hidden;';
  document.body.style.cssText = 'margin:0;padding:0;width:100%;height:100%;background:radial-gradient(circle at center,#0f172a 0%,#020617 100%);display:flex;justify-content:center;align-items:center;font-family:Segoe UI,system-ui,sans-serif;user-select:none;color:#fff;overflow:hidden;';
  document.body.innerHTML = '';

  const stage = document.createElement('div');
  stage.style.cssText = 'position:relative;width:100%;max-width:500px;height:100vh;background:#090d16;overflow:hidden;box-shadow:0 0 60px rgba(0,0,0,0.95);border-left:2px solid #334155;border-right:2px solid #334155;';
  document.body.appendChild(stage);

  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 900;
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Panel Kontrol Bawah
  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;bottom:8px;left:8px;right:8px;background:rgba(15,23,42,0.94);border:1.5px solid #475569;border-radius:14px;padding:8px;z-index:30;backdrop-filter:blur(8px);';
  stage.appendChild(panel);

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;';
  panel.appendChild(topRow);

  const statusBadge = document.createElement('div');
  statusBadge.textContent = '?? ONLINE (TANPA LOCALHOST) ? AUTO GIFT AKTIF';
  statusBadge.style.cssText = 'flex:1;background:#064e3b;border:1px solid #10b981;color:#a7f3d0;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:800;';
  topRow.appendChild(statusBadge);

  function createBtn(txt, bg, fn) {
    const b = document.createElement('button');
    b.textContent = txt;
    b.style.cssText = 'background:' + bg + ';color:#fff;border:none;border-radius:8px;padding:7px 9px;font-weight:900;font-size:11px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,0.4);';
    b.onclick = fn;
    return b;
  }

  let autoGift = true;
  const botBtn = createBtn('?? AUTO-RAME: ON', '#dc2626', () => {
    autoGift = !autoGift;
    botBtn.textContent = autoGift ? '?? AUTO-RAME: ON' : '?? AUTO-RAME: OFF';
    botBtn.style.background = autoGift ? '#dc2626' : '#475569';
  });
  topRow.appendChild(botBtn);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:5px;';
  panel.appendChild(grid);

  // Sound Effects & Suara Komentator
  let audioCtx = null;
  function playTone(f1, f2, dur, type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type || 'sawtooth';
      osc.frequency.setValueAtTime(f1, t);
      osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.15, t);
      g.gain.linearRampToValueAtTime(0.01, t + dur);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + dur);
    } catch (e) {}
  }

  function announce(text) {
    try {
      if (!window.speechSynthesis || window.speechSynthesis.speaking) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      u.rate = 1.25;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // State Game
  let alt = 80, targetAlt = 80, wins = 0, shield = 40, shake = 0, flash = 0, lavaY = 60, frame = 0;
  let alertBanner = { title: '', sub: '', icon: '', timer: 0, bg: '#dc2626' };
  const feed = [];
  const scores = {};
  const hazards = [];
  const particles = [];
  const popups = [];

  const hero = { x: 250, y: 520, tx: 250, phase: 0, jetpack: 0, freeze: 0, bomb: null, hurt: 0, hookY: 420 };
  const stars = Array.from({ length: 55 }, () => ({ x: Math.random() * 500, y: Math.random() * 900, s: Math.random() * 2.5 + 1 }));
  const ledges = Array.from({ length: 18 }, (_, i) => ({ x: 95 + Math.random() * 260, y: i * 52, w: 50 + Math.random() * 50, crystal: Math.random() > 0.65 }));

  function explode(x, y, color, count) {
    for (let i = 0; i < (count || 22); i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 8 + 2;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 5 + 2, color, life: 1 });
    }
  }

  function popup(x, y, txt, color) {
    popups.push({ x, y, txt, color, life: 1 });
  }

  function hurtHero(dmg, reason) {
    if (shield > 0) {
      const block = Math.min(shield, dmg);
      shield -= block; dmg -= block;
      popup(hero.x, hero.y - 45, '??? SHIELD -' + Math.round(block), '#38bdf8');
    }
    if (dmg > 0) {
      targetAlt = Math.max(0, targetAlt - dmg);
      hero.hurt = 24;
      shake = Math.min(35, 12 + dmg / 5);
      flash = 0.45;
      playTone(170, 40, 0.35, 'square');
      popup(hero.x, hero.y - 20, '?? -' + Math.round(dmg) + 'm (' + reason + ')', '#f87171');
    }
  }

  function triggerBoost(user, pwr) {
    targetAlt = Math.min(1000, targetAlt + pwr);
    hero.jetpack = 42;
    hero.freeze = 0;
    shield = Math.min(100, shield + 15);
    if (hero.bomb) {
      hero.bomb.hp--;
      if (hero.bomb.hp <= 0) { hero.bomb = null; popup(hero.x, hero.y - 55, '? BOM DIJINAKKAN!', '#4ade80'); }
    }
    playTone(260, 780, 0.25, 'sawtooth');
    explode(hero.x, hero.y + 30, '#38bdf8', 16);
    popup(hero.x, hero.y - 30, '?? +' + pwr + 'm JETPACK!', '#4ade80');
    feed.unshift({ txt: '?? @' + user + ' bantu Jetpack +' + pwr + 'm', c: '#4ade80' });
    if (feed.length > 5) feed.pop();
  }

  const GIFT_CATALOG = [
    { id: 'saw', icon: '??', gift: 'Mawar', title: 'RODA GERGAJI BERDURI', pwr: 45 },
    { id: 'donut', icon: '??', gift: 'Donat', title: 'DONAT RAKSASA PANTUL', pwr: 65 },
    { id: 'bolt', icon: '?', gift: 'Jari Hati', title: 'SAMBERAN PETIR LASER', pwr: 55 },
    { id: 'ice', icon: '??', gift: 'Es Krim', title: 'MERIAM ES PEMBEKU', pwr: 50 },
    { id: 'bomb', icon: '??', gift: 'Bom Waktu', title: 'BOM TEMPEL HITUNG MUNDUR', pwr: 80 },
    { id: 'hammer', icon: '??', gift: 'Palu Thor', title: 'AYUNAN PALU RAKSASA', pwr: 90 },
    { id: 'ufo', icon: '??', gift: 'Roket', title: 'BOSS UFO LASER', pwr: 110 },
    { id: 'meteor', icon: '??', gift: 'Singa Sultan', title: 'KIAMAT METEOR & TSUNAMI LAVA', pwr: 160 }
  ];

  function spawnChallenge(item, user) {
    const u = user || 'Sultan_Live';
    scores[u] = (scores[u] || 0) + item.pwr;
    alertBanner = { icon: item.icon, title: item.title + '!', sub: '@' + u + ' kirim ' + item.gift + ' (-' + item.pwr + 'm)', timer: 95, bg: '#dc2626' };
    feed.unshift({ txt: item.icon + ' @' + u + ' (' + item.gift + ') -> ' + item.title, c: '#fca5a5' });
    if (feed.length > 5) feed.pop();

    playTone(540, 920, 0.3, 'triangle');
    announce(u + ' kirim ' + item.gift + ', ' + item.title);

    if (item.id === 'saw' || item.id === 'donut') {
      for (let i = 0; i < 3; i++) {
        hazards.push({
          kind: item.id, icon: item.icon,
          x: 115 + Math.random() * 270, y: -40 - i * 80,
          vx: (i % 2 === 0 ? 5.5 : -5.5), vy: 7.5,
          r: item.id === 'donut' ? 32 : 26, rot: 0,
          user: u, pwr: item.pwr * 0.5
        });
      }
      hero.tx = 120 + Math.random() * 260;
    } else if (item.id === 'bolt') {
      hazards.push({ kind: 'bolt', x: hero.x, timer: 42, user: u, pwr: item.pwr });
      hero.tx = hero.x > 250 ? 135 : 365;
    } else if (item.id === 'ice') {
      hero.freeze = 100;
      explode(hero.x, hero.y, '#67e8f9', 30);
      hurtHero(item.pwr * 0.7, 'BEKU ES');
    } else if (item.id === 'bomb') {
      hero.bomb = { timer: 135, pwr: item.pwr, hp: 3, user: u };
    } else if (item.id === 'hammer') {
      hazards.push({ kind: 'hammer', side: Math.random() > 0.5 ? 1 : -1, ang: -1.5, y: hero.y, user: u, pwr: item.pwr, hit: false });
    } else if (item.id === 'ufo') {
      hazards.push({ kind: 'ufo', x: 250, y: 140, vx: 4.5, timer: 140, user: u, pwr: item.pwr });
    } else if (item.id === 'meteor') {
      lavaY = 190;
      for (let i = 0; i < 6; i++) {
        hazards.push({
          kind: 'meteor', icon: '??',
          x: 100 + Math.random() * 300, y: -50 - i * 85,
          vx: (Math.random() - 0.5) * 4, vy: 11.5, r: 36,
          user: u, pwr: item.pwr * 0.45
        });
      }
    }
  }

  const FAKE_USERS = ['Sultan_Tasik', 'Raja_Sawer88', 'Bocil_Troll', 'Naga_Hitam', 'Kaisar_Gift', 'Desta_Official', ' Ratu_Mawar'];
  const randUser = () => FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];

  // Buat Tombol Interaktif di Panel Bawah
  grid.appendChild(createBtn('?? JETPACK', '#059669', () => triggerBoost(randUser(), 30)));
  GIFT_CATALOG.slice(0, 7).forEach((g) => {
    const colors = { saw: '#d97706', donut: '#db2777', bolt: '#0284c7', ice: '#0891b2', bomb: '#dc2626', hammer: '#9333ea', ufo: '#4f46e5' };
    grid.appendChild(createBtn(g.icon + ' ' + g.gift.toUpperCase(), colors[g.id] || '#dc2626', () => spawnChallenge(g, randUser())));
  });
  const meteorBtn = createBtn('?? GIFT SINGA SULTAN (KIAMAT METEOR + LAVA)', 'linear-gradient(90deg,#ef4444,#f97316)', () => spawnChallenge(GIFT_CATALOG[7], randUser()));
  meteorBtn.style.gridColumn = 'span 4';
  grid.appendChild(meteorBtn);

  // Simulasi Gift Otomatis Berjalan Langsung
  setTimeout(() => spawnChallenge(GIFT_CATALOG[0], 'Sultan_Pembuka'), 600);
  setInterval(() => {
    if (!autoGift) return;
    if (Math.random() < 0.35) {
      triggerBoost(randUser(), 25);
    } else {
      const pick = GIFT_CATALOG[Math.floor(Math.random() * GIFT_CATALOG.length)];
      spawnChallenge(pick, randUser());
    }
  }, 2200);

  function drawClimber(x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Tali Grappling Hook ke Atas
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(0, -140);
    ctx.stroke();
    ctx.setLineDash([]);

    // Api Jetpack
    if (hero.jetpack > 0) {
      hero.jetpack--;
      ctx.fillStyle = frame % 2 === 0 ? '#f97316' : '#fde047';
      ctx.beginPath();
      ctx.moveTo(-14, 20);
      ctx.lineTo(14, 20);
      ctx.lineTo(0, 68 + Math.random() * 25);
      ctx.fill();
    }

    // Perisai Pelindung
    if (shield > 0) {
      ctx.strokeStyle = 'rgba(56,189,248,0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.stroke();
    }

    const sw = Math.sin(hero.phase) * 16;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, 14); ctx.lineTo(-18, 36 + sw * 0.6);
    ctx.moveTo(9, 14);  ctx.lineTo(18, 36 - sw * 0.6);
    ctx.moveTo(-13, -5); ctx.lineTo(-27, -25 + sw);
    ctx.moveTo(13, -5);  ctx.lineTo(27, -25 - sw);
    ctx.stroke();

    // Jubah Merah Berkibar
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(-13, -8);
    ctx.lineTo(13, -8);
    ctx.lineTo(22 + Math.sin(hero.phase * 2) * 9, 28);
    ctx.lineTo(-20, 25);
    ctx.fill();

    // Armor & Kepala
    ctx.fillStyle = hero.hurt > 0 ? '#ef4444' : '#0284c7';
    ctx.fillRect(-15, -13, 30, 30);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -25, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Visor Cyber
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-10, -28, 20, 6);

    if (hero.freeze > 0) {
      ctx.fillStyle = 'rgba(103,232,249,0.6)';
      ctx.fillRect(-32, -46, 64, 92);
    }

    if (hero.bomb) {
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(0, 5, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(hero.bomb.timer / 35), 0, 10);
    }

    ctx.restore();
  }

  function loop() {
    frame++;
    if (hero.freeze > 0) {
      hero.freeze--;
      targetAlt = Math.max(0, targetAlt - 0.22);
    } else {
      targetAlt += hero.jetpack > 0 ? 0.95 : 0.24;
      hero.phase += hero.jetpack > 0 ? 0.4 : 0.18;
    }
    if (hero.hurt > 0) hero.hurt--;

    if (hero.bomb) {
      hero.bomb.timer--;
      if (hero.bomb.timer <= 0) {
        explode(hero.x, hero.y, '#ef4444', 42);
        hurtHero(hero.bomb.pwr, 'LEDAKAN BOM');
        hero.bomb = null;
      }
    }

    if (targetAlt >= 1000) {
      wins++;
      targetAlt = 40;
      alt = 40;
      alertBanner = { icon: '??', title: 'PUNCAK 1000M TEMBUS!', sub: 'Total Kemenangan: ' + wins + 'x', timer: 110, bg: '#059669' };
      explode(250, 300, '#fde047', 55);
      announce('Puncak seribu meter berhasil ditaklukkan!');
    }

    alt += (targetAlt - alt) * 0.1;
    hero.x += (hero.tx - hero.x) * 0.09;
    if (lavaY > 60) lavaY -= 0.5;

    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shake *= 0.88;
    }

    // Langit & Bintang
    const sky = ctx.createLinearGradient(0, 0, 0, 900);
    sky.addColorStop(0, '#020617');
    sky.addColorStop(0.5, '#0f172a');
    sky.addColorStop(1, '#31102f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 500, 900);

    ctx.fillStyle = '#fff';
    stars.forEach((s) => ctx.fillRect(s.x, (s.y + alt * 3) % 900, s.s, s.s));

    // Dinding Tebing Kiri, Kanan & Tengah
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 75, 900);
    ctx.fillRect(425, 0, 75, 900);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(75, 0, 350, 900);

    // Tekstur Pijakan Tebing & Kristal
    const scrollY = (alt * 16) % 900;
    ledges.forEach((l) => {
      const ly = (l.y + scrollY) % 900;
      ctx.fillStyle = '#334155';
      ctx.fillRect(l.x, ly, l.w, 15);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(l.x + 3, ly + 2, l.w - 6, 4);
      if (l.crystal) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(l.x + 15, ly);
        ctx.lineTo(l.x + 22, ly - 14);
        ctx.lineTo(l.x + 29, ly);
        ctx.fill();
      }
    });

    // Progress Bar Vertikal di Sisi Kanan Tebing
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.fillRect(442, 120, 18, 520);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(442, 120, 18, 520);
    const progH = Math.min(520, (alt / 1000) * 520);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(444, 640 - progH, 14, progH);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1000m', 451, 112);

    drawClimber(hero.x, hero.y);

    // Gambar Semua Tantangan Gift
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      if (h.kind === 'saw' || h.kind === 'donut' || h.kind === 'meteor') {
        h.x += h.vx; h.y += h.vy; h.rot = (h.rot || 0) + 0.22;
        if (h.x < 105 || h.x > 395) h.vx *= -1;

        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rot);
        ctx.fillStyle = h.kind === 'meteor' ? '#ef4444' : (h.kind === 'donut' ? '#ec4899' : '#eab308');
        ctx.beginPath();
        ctx.arc(0, 0, h.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fde047';
        ctx.stroke();
        ctx.restore();

        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(h.icon || '??', h.x, h.y + 7);

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(h.x - 45, h.y - h.r - 20, 90, 16);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('@' + h.user, h.x, h.y - h.r - 9);

        if (Math.hypot(h.x - hero.x, h.y - hero.y) < h.r + 24) {
          explode(h.x, h.y, '#ef4444', 26);
          hurtHero(h.pwr, h.kind.toUpperCase());
          hazards.splice(i, 1);
          continue;
        }
        if (h.y > 940) hazards.splice(i, 1);
      } else if (h.kind === 'ufo') {
        h.timer--; h.x += h.vx;
        if (h.x < 125 || h.x > 375) h.vx *= -1;
        ctx.fillStyle = '#9333ea';
        ctx.beginPath(); ctx.ellipse(h.x, h.y, 50, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(h.x, h.y - 10, 22, Math.PI, 0); ctx.fill();
        if (h.timer % 34 < 15) {
          ctx.fillStyle = 'rgba(239,68,68,0.7)';
          ctx.fillRect(h.x - 18, h.y + 16, 36, 720);
          if (Math.abs(hero.x - h.x) < 34) hurtHero(h.pwr * 0.2, 'LASER UFO');
        }
        if (h.timer <= 0) hazards.splice(i, 1);
      } else if (h.kind === 'bolt') {
        h.timer--;
        if (h.timer > 12) {
          ctx.strokeStyle = 'rgba(239,68,68,0.85)';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(h.x, 0); ctx.lineTo(h.x, 900); ctx.stroke();
        } else {
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 9;
          ctx.beginPath(); ctx.moveTo(h.x, 0); ctx.lineTo(h.x - 22, 310); ctx.lineTo(h.x + 22, 530); ctx.lineTo(h.x, 900); ctx.stroke();
          if (h.timer === 10 && Math.abs(hero.x - h.x) < 48) hurtHero(h.pwr, 'PETIR');
        }
        if (h.timer <= 0) hazards.splice(i, 1);
      } else if (h.kind === 'hammer') {
        h.ang += 0.15;
        const px = h.side === 1 ? 75 : 425;
        const hx = px + Math.cos(h.ang) * 170 * h.side, hy = h.y + Math.sin(h.ang) * 170;
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(px, h.y); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = '#9333ea';
        ctx.beginPath(); ctx.arc(hx, hy, 36, 0, Math.PI * 2); ctx.fill();
        if (!h.hit && Math.hypot(hx - hero.x, hy - hero.y) < 55) {
          h.hit = true;
          hurtHero(h.pwr, 'PALU THOR');
        }
        if (h.ang > 1.6) hazards.splice(i, 1);
      }
    }

    // Partikel & Popup Teks
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.04;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = popups.length - 1; i >= 0; i--) {
      const f = popups[i]; f.y -= 1.8; f.life -= 0.025;
      if (f.life <= 0) { popups.splice(i, 1); continue; }
      ctx.globalAlpha = f.life; ctx.fillStyle = f.color;
      ctx.font = '900 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // Lava Membara di Dasar Tebing
    const lavaGrad = ctx.createLinearGradient(0, 900 - lavaY, 0, 900);
    lavaGrad.addColorStop(0, '#fde047');
    lavaGrad.addColorStop(0.25, '#f97316');
    lavaGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(75, 900 - lavaY, 350, lavaY);

    // HUD Atas
    ctx.fillStyle = 'rgba(15,23,42,0.92)';
    ctx.fillRect(10, 10, 230, 84);
    ctx.fillRect(260, 10, 230, 84);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, 230, 84);
    ctx.strokeStyle = '#f59e0b'; ctx.strokeRect(260, 10, 230, 84);

    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('KETINGGIAN (TARGET 1000M)', 22, 28);
    ctx.fillStyle = '#38bdf8'; ctx.font = '900 30px sans-serif';
    ctx.fillText(Math.floor(alt) + ' m', 22, 62);
    ctx.fillStyle = '#4ade80'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText('MENANG: ' + wins + 'x | SHIELD: ' + Math.round(shield) + '%', 22, 82);

    ctx.fillStyle = '#fde047'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText('?? TOP SULTAN PENGGANGGU:', 272, 30);
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 2);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(top[0] ? '1. @' + top[0][0] + ' (-' + Math.round(top[0][1]) + 'm)' : 'Menunggu Gift...', 272, 54);
    if (top[1]) ctx.fillText('2. @' + top[1][0] + ' (-' + Math.round(top[1][1]) + 'm)', 272, 74);

    // Live Feed Gift
    feed.forEach((item, idx) => {
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.fillRect(10, 102 + idx * 23, 305, 20);
      ctx.fillStyle = item.c;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(item.txt, 16, 116 + idx * 23);
    });

    // Banner Peringatan Saat Gift Masuk
    if (alertBanner.timer > 0) {
      alertBanner.timer--;
      ctx.fillStyle = 'rgba(185,28,28,0.95)';
      ctx.fillRect(35, 235, 430, 76);
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3;
      ctx.strokeRect(35, 235, 430, 76);
      ctx.fillStyle = '#fde047'; ctx.font = '900 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(alertBanner.icon + ' ' + alertBanner.title, 250, 266);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(alertBanner.sub, 250, 294);
    }

    if (flash > 0) {
      ctx.fillStyle = 'rgba(239,68,68,' + flash + ')';
      ctx.fillRect(0, 0, 500, 900);
      flash *= 0.85;
    }

    ctx.restore();
    requestAnimationFrame(loop);
  }
  loop();
})();
