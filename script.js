/* ==========================
   script.js - Rádio 24h
   Player persistente + SPA + Equalizador AO VIVO + Clock
========================== */

/* ===== Relógio ===== */
const clockEl = document.getElementById("clock");
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString();
}

/* ===== DOM refs ===== */
const player = document.getElementById("player");
let trackName = document.getElementById("trackName");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const appMain = document.getElementById("app-main");

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

/* ===== Playlist (exemplo estático) ===== */
let playlist = [
  { name: "Música 1", url: "musica1.mp3" },
  { name: "Música 2", url: "musica2.mp3" },
  { name: "Música 3", url: "musica3.mp3" }
];
let current = 0;

/* ===== Carregar música ===== */
function loadSong(index, startTime = 0) {
  if (!playlist.length || index < 0 || index >= playlist.length) return;
  current = index;
  const song = playlist[index];
  player.src = song.url;
  player.currentTime = startTime;
  if (trackName) trackName.textContent = song.name;
  try { player.play(); } catch(e){}
}

/* ===== Próxima / Anterior ===== */
function playRandom() {
  if (!playlist.length) return;
  let next;
  do { next = Math.floor(Math.random() * playlist.length); }
  while(next === current && playlist.length > 1);
  loadSong(next);
}

player.addEventListener("ended", playRandom);

/* ===== Salva posição a cada 1s ===== */
setInterval(() => {
  if (!isNaN(player.currentTime)) localStorage.setItem("currentTime", player.currentTime);
  localStorage.setItem("currentSong", current);
}, 1000);

/* ===== Botões ===== */
playBtn.addEventListener("click", () => player.play());
prevBtn.addEventListener("click", () => loadSong((current - 1 + playlist.length) % playlist.length));
nextBtn.addEventListener("click", () => loadSong((current + 1) % playlist.length));

/* ===== SPA navigation ===== */
async function loadPage(url, pushHistory = true){
  try{
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error("Falha ao carregar página");
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text,"text/html");
    const remoteMain = doc.querySelector("main");
    const newMainHtml = remoteMain ? remoteMain.innerHTML : doc.body.innerHTML;
    appMain.innerHTML = newMainHtml;
    document.title = doc.title || document.title;
    updateActiveNav(url);
    fixImages(appMain);
    ensureClockAndLive();
    ensurePlayer();
    if(pushHistory) history.pushState({url},"",url);
  } catch(err){ console.error(err); }
}

function updateActiveNav(url){
  document.querySelectorAll('nav a[data-nav]').forEach(a=>{
    const aUrl = new URL(a.href, location.origin).pathname;
    const u = new URL(url, location.origin).pathname;
    a.classList.toggle("active", aUrl === u);
  });
}

document.addEventListener("click", ev=>{
  const a = ev.target.closest && ev.target.closest("a[data-nav]");
  if(!a) return;
  ev.preventDefault();
  loadPage(a.getAttribute("href"));
});

window.addEventListener("popstate", ev=>{
  const url = (ev.state && ev.state.url) || location.pathname;
  loadPage(url,false);
});

/* ===== Helpers ===== */
function fixImages(container){
  container.querySelectorAll("img").forEach(img=>{
    img.onerror = function(){ this.onerror=null; this.src="https://via.placeholder.com/600x350?text=Imagem+n%C3%A3o+dispon%C3%ADvel"; }
    if(!img.alt) img.alt="Imagem";
  });
}

function ensureClockAndLive(){
  if(!clockEl.textContent) startClock();
}

function ensurePlayer(){
  if(playlist.length && current>=0){
    const currentTime = Number(localStorage.getItem("currentTime")) || 0;
    loadSong(current,currentTime);
  }
}

/* ===== Inicialização ===== */
function init(){
  startClock();
  fixImages(document);
  ensurePlayer();

  const path = location.pathname.replace(/^\//,"");
  if(path && path!="" && path!="index.html") loadPage(location.pathname,false);
  updateActiveNav(location.pathname);
}
init();

/* ===== Autoplay interativo ===== */
document.addEventListener("click", () => {
  if(player.paused) player.play().catch(()=>{});
},{ once:true });
