const clockEl = document.getElementById("clock");
const player = document.getElementById("player");
const trackName = document.getElementById("trackName");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const appMain = document.getElementById("app-main");

// ===== Relógio =====
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString();
}

// ===== Equalizador =====
function animateLiveBars() {
  document.querySelectorAll(".live-bars span").forEach((b) => {
    const base = player && !player.paused ? 6 : 3;
    const variance = Math.random() * 16;
    b.style.height = Math.round(base + variance) + "px";
  });
}
setInterval(animateLiveBars, 250);

// ===== Playlist =====
const apiUrl = "https://api.github.com/repos/claviiisorg/radio-musicas/releases/tags/musicas";
let playlist = [];
let current = -1;

async function loadPlaylistFromGithub() {
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Erro HTTP " + res.status);
    const data = await res.json();
    if (!data.assets || !data.assets.length) return;
    playlist = data.assets.map(a => ({
      url: a.browser_download_url,
      name: a.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")
    }));

    const savedIndex = Number(localStorage.getItem("currentSong")) || 0;
    const savedTime = Number(localStorage.getItem("currentTime")) || 0;
    current = savedIndex;
    loadSong(current, savedTime);

  } catch (err) {
    console.error("Erro playlist:", err);
  }
}

// ===== Player =====
function loadSong(index, startTime = 0) {
  if (!playlist.length || index < 0 || index >= playlist.length) return;
  current = index;
  const song = playlist[index];
  player.src = song.url;
  player.currentTime = startTime;
  if (trackName) trackName.textContent = song.name;
  const p = player.play();
  if (p && p.catch) p.catch(() => {});
  localStorage.setItem("currentSong", current);
}

function playRandom() {
  if (!playlist.length) return;
  let next;
  do { next = Math.floor(Math.random() * playlist.length); } 
  while(next === current && playlist.length > 1);
  loadSong(next);
}

player.addEventListener("ended", playRandom);

// ===== Salva tempo =====
setInterval(() => {
  if (!isNaN(player.currentTime)) localStorage.setItem("currentTime", player.currentTime);
}, 1000);

// ===== Botões =====
playBtn.addEventListener("click", () => {
  if (player.paused) player.play();
  else player.pause();
});
prevBtn.addEventListener("click", () => { playRandom(); });
nextBtn.addEventListener("click", () => { playRandom(); });

// ===== SPA Navigation =====
async function loadPage(url, pushHistory = true) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const remoteMain = doc.querySelector("main");
    const newMainHtml = remoteMain ? remoteMain.innerHTML : doc.body.innerHTML;

    appMain.innerHTML = newMainHtml;
    document.title = doc.title || document.title;
    updateActiveNav(url);
  } catch (err) { console.error(err); }
}

function updateActiveNav(url) {
  document.querySelectorAll('nav a[data-nav]').forEach(a => {
    a.classList.toggle("active", new URL(a.href, location.origin).pathname === new URL(url, location.origin).pathname);
  });
}

document.addEventListener("click", (ev) => {
  const a = ev.target.closest && ev.target.closest("a[data-nav]");
  if (!a) return;
  ev.preventDefault();
  loadPage(a.href, true);
});

window.addEventListener("popstate", ev => {
  loadPage((ev.state && ev.state.url) || location.pathname, false);
});

// ===== Inicialização =====
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  loadPlaylistFromGithub();

  // Auto play após clique inicial (evita bloqueio)
  document.body.addEventListener("click", () => {
    if (player.paused) player.play().catch(()=>{});
  }, { once: true });
});
