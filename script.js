/* script.js - Rádio contínua FlashBack corrigido */
document.addEventListener('DOMContentLoaded', () => {
  const GITHUB_API = "https://api.github.com/repos/claviiisorg/radio-musicas/releases/tags/musicas";
  const LOCAL_PLAYLIST = [
    { url: "musicas/faixa1.mp3", name: "Música Local 1" },
    { url: "musicas/faixa2.mp3", name: "Música Local 2" }
  ];

  if (!window.flashbackState) {
    window.flashbackState = {
      player: new Audio(),
      playlist: [],
      currentIndex: 0,
      initialized: false
    };
  }

  const state = window.flashbackState;
  const player = state.player;
  player.preload = 'auto';
  player.autoplay = true;
  player.controls = false;

  const trackNameEl = document.getElementById('trackName');
  const clockEl = document.getElementById('clock');
  const overlay = document.getElementById('audio-overlay');
  const overlayBtn = document.getElementById('overlayBtn');

  // Relógio
  function updateClock() {
    if (clockEl) clockEl.textContent = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Carregar playlist
  async function loadPlaylist() {
    if (state.playlist.length) return;
    try {
      const res = await fetch(GITHUB_API);
      const data = await res.json();
      if (data.assets && data.assets.length) {
        state.playlist = data.assets.map(asset => ({
          url: asset.browser_download_url,
          name: asset.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
        }));
      }
    } catch (err) {
      console.warn('Falha ao buscar playlist GitHub, usando fallback.', err);
    }
    if (!state.playlist.length) state.playlist = LOCAL_PLAYLIST;
  }

  // Carregar faixa sem reiniciar caso já esteja tocando
  function loadTrack(index, startTime = 0) {
    const track = state.playlist[index];
    if (!track) return;

    state.currentIndex = index;
    player.src = track.url;
    player.currentTime = startTime;

    if (trackNameEl) trackNameEl.textContent = `▶ ${track.name}`;

    player.play().catch(() => overlay?.classList.remove('hidden'));
  }

  // Tocar música aleatória após término
  function playRandom() {
    if (!state.playlist.length) return;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * state.playlist.length);
    } while (nextIndex === state.currentIndex && state.playlist.length > 1);
    loadTrack(nextIndex, 0);
  }
  player.removeEventListener('ended', playRandom);
  player.addEventListener('ended', playRandom);

  // Persistir tempo atual da música e índice
  setInterval(() => {
    if (!isNaN(player.currentTime)) localStorage.setItem('flashbackTime', Math.floor(player.currentTime));
    localStorage.setItem('flashbackIndex', state.currentIndex);
  }, 1000);

  // Overlay para ativar áudio do usuário
  function enableAudioFromUser() {
    overlay?.classList.add('hidden');
    player.muted = false;
    player.play().catch(() => {});
  }
  if (overlayBtn) overlayBtn.addEventListener('click', enableAudioFromUser);
  document.body.addEventListener('click', () => { if (overlay && !overlay.classList.contains('hidden')) enableAudioFromUser(); }, { once: true });
  document.body.addEventListener('keydown', () => { if (overlay && !overlay.classList.contains('hidden')) enableAudioFromUser(); }, { once: true });

  // Botões decorativos
  ['playBtn', 'prevBtn', 'nextBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => {});
  });

  // Inicialização
  (async () => {
    await loadPlaylist();
    const savedIndex = Number(localStorage.getItem('flashbackIndex'));
    const savedTime = Number(localStorage.getItem('flashbackTime')) || 0;

    if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < state.playlist.length) {
      loadTrack(savedIndex, savedTime);
    } else {
      playRandom();
    }
  })();
});
