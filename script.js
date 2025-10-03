/* script.js - Rádio FlashBack com nomes corrigidos e relógio */
document.addEventListener('DOMContentLoaded', () => {
  const GITHUB_API = "https://api.github.com/repos/claviiisorg/radio-musicas/releases/tags/musicas";
  const LOCAL_PLAYLIST = [
    { url: "musicas/faixa1.mp3", name: "Música Local 1" },
    { url: "musicas/faixa2.mp3", name: "Música Local 2" }
  ];

  if (!window.flashbackRadioState) {
    window.flashbackRadioState = {
      player: new Audio(),
      playlist: [],
      currentIndex: 0,
      initialized: false
    };
  }

  const state = window.flashbackRadioState;
  const player = state.player;
  player.preload = 'auto';
  player.autoplay = true;
  player.controls = false;

  const trackNameEl = document.getElementById('trackName');
  const clockEl = document.getElementById('clock');

  // Função para limpar nomes
  function sanitizeTrackName(name) {
    let cleanName = name.replace(/\.[^/.]+$/, '');
    cleanName = cleanName.replace(/_/g, ' ');
    cleanName = cleanName.replace(/\d{1,2}-/g, '');
    cleanName = cleanName.replace(/\s{2,}/g, ' ').trim();
    return cleanName;
  }

  async function loadPlaylist() {
    if (state.playlist.length) return;
    try {
      const res = await fetch(GITHUB_API);
      const data = await res.json();
      if (data.assets && data.assets.length) {
        state.playlist = data.assets.map(asset => ({
          url: asset.browser_download_url,
          name: sanitizeTrackName(asset.name)
        }));
      }
    } catch (err) {
      console.warn('Falha GitHub, usando fallback.', err);
    }
    if (!state.playlist.length) state.playlist = LOCAL_PLAYLIST;
  }

  function loadTrack(index, force = false) {
    const track = state.playlist[index];
    if (!track) return;
    state.currentIndex = index;
    const savedTime = Number(localStorage.getItem('flashbackTime')) || 0;

    if (!state.initialized || force) {
      player.src = track.url;
      player.currentTime = savedTime;
      state.initialized = true;
    }

    if (trackNameEl) trackNameEl.textContent = `▶ AO VIVO: ${track.name}`;
    player.play().catch(() => {});
  }

  function playRandom() {
    if (!state.playlist.length) return;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * state.playlist.length);
    } while (nextIndex === state.currentIndex && state.playlist.length > 1);
    loadTrack(nextIndex, true);
  }
  player.addEventListener('ended', playRandom);

  // Persistir tempo e índice
  setInterval(() => {
    if (!isNaN(player.currentTime)) localStorage.setItem('flashbackTime', Math.floor(player.currentTime));
    localStorage.setItem('flashbackIndex', state.currentIndex);
  }, 1000);

  // Relógio ao vivo
  function updateClock() {
    if (clockEl) clockEl.textContent = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  }
  setInterval(updateClock, 1000);
  updateClock();

  (async () => {
    await loadPlaylist();
    const savedIndex = Number(localStorage.getItem('flashbackIndex'));
    if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < state.playlist.length) {
      state.currentIndex = savedIndex;
      loadTrack(state.currentIndex, true);
    } else {
      playRandom();
    }
  })();
});
