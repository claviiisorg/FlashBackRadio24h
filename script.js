/* =========================
   script.js - Rádio 24h
   Player persistente + SPA + Equalizador AO VIVO + Clock
   ========================= */

/* ===== DOM refs globais ===== */
const clockEl = document.getElementById("clock");
const player = document.getElementById("player");
let trackName = document.getElementById("trackName");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const appMain = document.getElementById("app-main");

/* ===== Relógio ===== */
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
function updateClock() {
  const now = new Date();
  if(clockEl) clockEl.textContent = now.toLocaleTimeString();
}

/* ===== Equalizador AO VIVO ===== */
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

async function loadPlaylistFromGithub() {
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Erro HTTP " + res.status);
    const data = await res.json();
    if (!data.assets || !data.assets.length) {
      if(trackName) trackName.textContent = "Nenhuma música disponível.";
      return;
    }

    playlist = data.assets.map((a) => ({
      url: a.browser_download_url,
      name: a.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
    }));

    const savedIndex = Number(localStorage.getItem("currentSong"));
    const savedTime = Number(localStorage.getItem("currentTime")) || 0;

    if (!Number.isNaN(savedIndex) && savedIndex >= 0 && savedIndex < playlist.length) {
      current = savedIndex;
      loadSong(current, savedTime);
    } else {
      playRandom();
    }
  } catch (err) {
    console.error("Erro ao carregar playlist do GitHub:", err);
    if(trackName) trackName.textContent = "Erro ao carregar músicas.";
  }
}

/* ===== Player ===== */
function loadSong(index, startTime = 0) {
  if (!playlist.length || index < 0 || index >= playlist.length) return;
  current = index;
  const song = playlist[index];
  if(player) {
    player.src = song.url;
    player.currentTime = startTime;
    const p = player.play();
    if(p && p.catch) p.catch(() => {});
  }
  if(trackName) trackName.textContent = song.name;
  localStorage.setItem("currentSong", current);
}

function playRandom() {
  if (!playlist.length) return;
  let next;
  do { next = Math.floor(Math.random() * playlist.length); } 
  while(next === current && playlist.length > 1);
  loadSong(next);
}

if(player) player.addEventListener("ended", playRandom);

/* Salva posição atual */
setInterval(() => {
  if(player && !isNaN(player.currentTime)) localStorage.setItem("currentTime", player.currentTime);
}, 1000);

/* Botões visuais (não controlam playback) */
if(playBtn) playBtn.addEventListener("click", e => e.preventDefault());
if(prevBtn) prevBtn.addEventListener("click", e => e.preventDefault());
if(nextBtn) nextBtn.addEventListener("click", e => e.preventDefault());

/* ===== SPA + persistência do player ===== */
async function loadPage(url, pushHistory = true) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error("Falha ao carregar página: " + res.status);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const remoteMain = doc.querySelector("main");
    const newMainHtml = remoteMain ? remoteMain.innerHTML : doc.body.innerHTML;

    // Injeta main
    appMain.innerHTML = newMainHtml;

    // Home: remove <audio> duplicado e mantém player
    if(url.endsWith("index.html") || url === "/" || url === "") {
      appMain.querySelectorAll("audio").forEach(a => a.remove());
    }

    // reaponta trackName
    const newTrackName = document.getElementById("trackName");
    if(newTrackName) trackName = newTrackName;

    // garante player funcionando
    if(playlist.length && current >= 0) {
      const savedTime = Number(localStorage.getItem("currentTime")) || 0;
      loadSong(current, savedTime);
    }

    document.title = doc.title || document.title;
    updateActiveNav(url);
    fixImages(appMain);
    ensureClockAndLive();

    if(pushHistory) history.pushState({ url }, "", url);
  } catch(err) {
    console.error("Erro ao carregar página via SPA:", err);
  }
}

function updateActiveNav(url) {
  document.querySelectorAll('nav a[data-nav]').forEach((a) => {
    try {
      const aUrl = new URL(a.href, location.origin).pathname;
      const u = new URL(url, location.origin).pathname;
      a.classList.toggle("active", aUrl === u);
    } catch(e) {}
  });
}

document.addEventListener("click", ev => {
  const a = ev.target.closest && ev.target.closest("a[data-nav]");
  if(!a) return;
  const href = a.getAttribute("href");
  if(!href) return;
  ev.preventDefault();
  loadPage(href, true);
});

window.addEventListener("popstate", ev => {
  const url = (ev.state && ev.state.url) || location.pathname;
  loadPage(url, false);
});

/* ===== Helpers ===== */
function fixImages(container) {
  container.querySelectorAll("img").forEach((img) => {
    img.onerror = function() {
      this.onerror = null;
      this.src = "https://via.placeholder.com/600x350?text=Imagem+n%C3%A3o+dispon%C3%ADvel";
    };
    if(!img.alt) img.alt = "Imagem";
  });
}

function ensureClockAndLive() {
  if(!clockEl.textContent) startClock();
}

/* ===== Inicialização ===== */
function init() {
  startClock();
  fixImages(document);
  loadPlaylistFromGithub();

  // Se abriu outra página direto
  const path = location.pathname.replace(/^\//, "");
  if(path && path !== "" && path !== "index.html") loadPage(location.pathname, false);

  updateActiveNav(location.pathname);
}

init();
