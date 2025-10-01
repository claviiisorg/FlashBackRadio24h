/* =========================
   script.js - Rádio 24h
   Player persistente + SPA + Equalizador AO VIVO + Clock
   Autoplay handling: tenta autoplay mudo e ativa som após interação do usuário
   ========================= */

/* ===== DOM refs globais ===== */
const clockEl = document.getElementById("clock");
const player = document.getElementById("player"); // PERSISTENTE, fora do <main>
let trackName = document.getElementById("trackName"); // pode ser reapontado após injeção de main
const playBtn = document.getElementById("playBtn");
const prevBtn  = document.getElementById("prevBtn");
const nextBtn  = document.getElementById("nextBtn");
const appMain  = document.getElementById("app-main");

/* ===== Relógio ===== */
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
function updateClock() {
  const now = new Date();
  if (clockEl) clockEl.textContent = now.toLocaleTimeString();
}

/* ===== Equalizador AO VIVO (visual) ===== */
const liveBars = () => document.querySelectorAll(".live-bars span");
function animateLiveBars() {
  const bars = liveBars();
  if (!bars || bars.length === 0) return;
  const base = player && !player.paused ? 6 : 3;
  bars.forEach((b) => {
    const variance = Math.random() * 16;
    const height = Math.round(base + variance);
    b.style.height = height + "px";
  });
}
setInterval(animateLiveBars, 250);

/* ===== Playlist (GitHub) ===== */
const apiUrl = "https://api.github.com/repos/claviiisorg/radio-musicas/releases/tags/musicas";
let playlist = [];
let current = -1;
let autoplayHandled = false; // controla listener único para interação do usuário

async function loadPlaylistFromGithub() {
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Erro HTTP " + res.status);
    const data = await res.json();

    if (!data.assets || !data.assets.length) {
      if (trackName) trackName.textContent = "Nenhuma música disponível.";
      return;
    }

    playlist = data.assets.map((a) => ({
      url: a.browser_download_url,
      name: a.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
    }));

    // restaura índice e tempo
    const savedIndex = Number(localStorage.getItem("currentSong"));
    const savedTime  = Number(localStorage.getItem("currentTime")) || 0;

    if (!Number.isNaN(savedIndex) && savedIndex >= 0 && savedIndex < playlist.length) {
      current = savedIndex;
      // Carrega a música, mas para lidar com autoplay bloqueado, tentamos autoplay mudo
      loadSong(current, savedTime, { tryMutedAutoplay: true });
    } else {
      playRandom({ tryMutedAutoplay: true });
    }
  } catch (err) {
    console.error("Erro ao carregar playlist do GitHub:", err);
    if (trackName) trackName.textContent = "Erro ao carregar músicas.";
  }
}

/* ===== Player: carregar e tocar ===== */
/**
 * loadSong(index, startTime, opts)
 * opts.tryMutedAutoplay = true -> seta player.muted = true e tenta tocar (mudo) para contornar bloqueios
 */
function loadSong(index, startTime = 0, opts = {}) {
  if (!playlist.length || index < 0 || index >= playlist.length) return;
  current = index;
  const song = playlist[index];

  if (!player) return;

  // atribui src e tempo
  player.src = song.url;
  try { player.currentTime = Math.max(0, Number(startTime) || 0); } catch(e){/* alguns browsers bloqueiam setTime até carregar */ }

  // atualiza label se existir
  if (trackName) trackName.textContent = song.name;

  // autoplay attempt
  if (opts.tryMutedAutoplay) {
    // tenta autoplay mudo — frequentemente permitido
    player.muted = true;
    const p = player.play();
    if (p && p.catch) {
      p.catch(() => {
        // se falhar, aguardamos interação do usuário (veja setupAutoplayResume)
      });
    }
    // registra listeners para quando usuário interagir para desmutar
    setupAutoplayResume();
  } else {
    // tenta tocar normalmente (pode ser bloqueado)
    const p = player.play();
    if (p && p.catch) p.catch(() => {
      // se bloquear, registra resume com interação
      setupAutoplayResume();
    });
  }

  localStorage.setItem("currentSong", current);
}

function playRandom(opts = {}) {
  if (!playlist.length) return;
  let next;
  do {
    next = Math.floor(Math.random() * playlist.length);
  } while (next === current && playlist.length > 1);
  loadSong(next, 0, opts);
}

/* quando a faixa termina, toca outra aleatória */
if (player) player.addEventListener("ended", () => playRandom({ tryMutedAutoplay: false }));

/* Salva posição atual a cada 1s */
setInterval(() => {
  if (player && !isNaN(player.currentTime)) localStorage.setItem("currentTime", player.currentTime);
}, 1000);

/* ===== Autoplay handling: retomar com interação do usuário ===== */
function resumePlaybackWithUserInteraction() {
  if (!player) return;
  try {
    player.muted = false; // desmute
    const p = player.play();
    if (p && p.catch) p.catch(()=>{});
  } catch (e) { console.warn("resumePlaybackWithUserInteraction:", e); }
  // limpa listeners só uma vez
  removeAutoplayListeners();
  autoplayHandled = true;
}

function onFirstInteraction() {
  resumePlaybackWithUserInteraction();
}

function setupAutoplayResume() {
  if (autoplayHandled) return;
  // adiciona listeners (uma vez) para qualquer interação do usuário
  ['click','touchstart','keydown'].forEach(evt => {
    window.addEventListener(evt, onFirstInteraction, { once: true, passive: true });
  });
}

/* remove listeners caso já não precisem mais */
function removeAutoplayListeners() {
  ['click','touchstart','keydown'].forEach(evt => {
    try { window.removeEventListener(evt, onFirstInteraction, { once: true }); } catch(e){ /* ignore */ }
  });
}

/* ===== Botões visuais (não controlam playback) ===== */
if (playBtn) playBtn.addEventListener("click", (e) => e.preventDefault());
if (prevBtn) prevBtn.addEventListener("click", (e) => e.preventDefault());
if (nextBtn) nextBtn.addEventListener("click", (e) => e.preventDefault());

/* ===== SPA + persistência do player ===== */
async function loadPage(url, pushHistory = true) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao carregar página: " + res.status);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const remoteMain = doc.querySelector("main");
    const newMainHtml = remoteMain ? remoteMain.innerHTML : doc.body.innerHTML;

    // Injeta main (player fica FORA do main, portanto permanece)
    appMain.innerHTML = newMainHtml;

    // reaponta trackName (elemento dentro do main foi re-criado)
    const newTrackName = document.getElementById("trackName");
    if (newTrackName) trackName = newTrackName;

    // Se temos uma música carregada, atualiza label e tenta retomar do tempo salvo
    if (playlist.length && current >= 0) {
      if (trackName) trackName.textContent = playlist[current].name || "Tocando";
      const savedTime = Number(localStorage.getItem("currentTime")) || 0;
      // não reinicia a música se já estiver tocando; tenta aplicar o tempo
      try { if (player && Math.abs((player.currentTime || 0) - savedTime) > 1) player.currentTime = savedTime; } catch(e){}
      // se estiver pausado, tenta tocar (lembrando de listeners de interação)
      const p = player && player.play();
      if (p && p.catch) p.catch(() => setupAutoplayResume());
    }

    document.title = doc.title || document.title;
    updateActiveNav(url);
    fixImages(appMain);
    ensureClockAndLive();

    if (pushHistory) history.pushState({ url }, "", url);
  } catch (err) {
    console.error("Erro ao carregar página via SPA:", err);
  }
}

function updateActiveNav(url) {
  document.querySelectorAll('nav a[data-nav]').forEach((a) => {
    try {
      const aUrl = new URL(a.href, location.origin).pathname;
      const u = new URL(url, location.origin).pathname;
      a.classList.toggle("active", aUrl === u);
    } catch (e) {}
  });
}

/* intercepta cliques em links [data-nav] */
document.addEventListener("click", (ev) => {
  const a = ev.target.closest && ev.target.closest("a[data-nav]");
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href)
