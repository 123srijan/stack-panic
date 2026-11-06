/**
 * Stack Panic — Addictive Tower Stacking Arcade Game
 * Self-contained HTML5 Canvas + Web Audio API mini-game.
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const VIRTUAL_WIDTH = 420;
  const BASE_VIRTUAL_HEIGHT = 680;
  const BLOCK_HEIGHT = 32;
  const INITIAL_BLOCK_WIDTH = 200;
  const PERFECT_TOLERANCE = 4.0; // Overhang within 4px counts as Perfect!
  const BASE_SPEED = 230; // Virtual px/sec
  const MAX_SPEED_BONUS = 280;
  const GRAVITY = 900; // Falling debris acceleration

  // --- Seeded PRNG (Mulberry32) for Daily Challenge ---
  function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getDailySeedString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function hashSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // --- Web Audio API Procedural Synthesizer ---
  class SoundController {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('stack_panic_muted') === 'true';
      this.masterGain = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      } else if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    setMuted(muted) {
      this.muted = muted;
      localStorage.setItem('stack_panic_muted', muted ? 'true' : 'false');
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(muted ? 0 : 0.45, this.ctx.currentTime);
      }
    }

    toggleMuted() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    // Snappy drop woodblock / click
    playDrop() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.08);
    }

    // Shimmering melodic chord for Perfect combos!
    playPerfect(combo) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      // Musical pentatonic progression
      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98];
      const baseFreq = scale[Math.min(combo - 1, scale.length - 1)];

      // Primary tone
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, t);

      gain1.gain.setValueAtTime(0.5, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(t);
      osc1.stop(t + 0.35);

      // Shimmer overtone (octave + fifth)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 1.5, t);

      gain2.gain.setValueAtTime(0.2, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(t);
      osc2.stop(t + 0.25);
    }

    // Width recovery sparkle arpeggio
    playRecovery() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [659.25, 830.61, 987.77, 1318.51];
      const startT = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteT = startT + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteT);

        gain.gain.setValueAtTime(0.3, noteT);
        gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(noteT);
        osc.stop(noteT + 0.15);
      });
    }

    // Snappy slice sound
    playSlice() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.07);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.07);
    }

    // Game over descending thud
    playGameOver() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.45);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.45);
    }

    // Button click pop
    playClick() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1000, t + 0.04);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  }

  // --- Main Game Class ---
  class StackPanicGame {
    constructor() {
      // DOM Elements
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.gameContainer = document.getElementById('game-container');

      this.scoreEl = document.getElementById('current-score');
      this.bestScoreEl = document.getElementById('hud-best-score');
      this.hudBestLabel = document.getElementById('hud-best-label');
      this.streakBanner = document.getElementById('streak-banner');
      this.streakText = document.getElementById('streak-text');
      this.startHint = document.getElementById('start-hint-overlay');

      this.gameOverModal = document.getElementById('game-over-modal');
      this.gameOverTitle = document.getElementById('game-over-title');
      this.verdictAvatar = document.getElementById('verdict-avatar');
      this.verdictQuote = document.getElementById('verdict-quote');
      this.finalScoreEl = document.getElementById('gameover-final-score');
      this.bestScoreModalEl = document.getElementById('gameover-best-score');
      this.streakModalEl = document.getElementById('gameover-streak');
      this.perfectsModalEl = document.getElementById('gameover-perfects');
      this.newBestBadge = document.getElementById('new-best-badge');
      this.labelGameOverBest = document.getElementById('label-gameover-best');
      this.dailyResultBanner = document.getElementById('daily-result-banner');
      this.dailyRankTag = document.getElementById('daily-rank-tag');

      this.btnPlayAgain = document.getElementById('btn-play-again');
      this.btnChallenge = document.getElementById('btn-challenge-friend');
      this.btnSwitchMode = document.getElementById('btn-switch-mode');
      this.switchModeText = document.getElementById('switch-mode-text');

      this.btnModeClassic = document.getElementById('btn-mode-classic');
      this.btnModeDaily = document.getElementById('btn-mode-daily');
      this.dailyDateLabel = document.getElementById('daily-date-label');

      // Difficulty Controls (Header & Modal)
      this.btnDiffEasy = document.getElementById('btn-diff-easy');
      this.btnDiffMed = document.getElementById('btn-diff-medium');
      this.btnDiffHard = document.getElementById('btn-diff-hard');

      this.btnModalDiffEasy = document.getElementById('btn-modal-diff-easy');
      this.btnModalDiffMed = document.getElementById('btn-modal-diff-medium');
      this.btnModalDiffHard = document.getElementById('btn-modal-diff-hard');

      // HUD Difficulty Tag
      this.hudDiffTag = document.getElementById('hud-diff-tag');
      this.hudDiffIcon = document.getElementById('hud-diff-icon');
      this.hudDiffLabel = document.getElementById('hud-diff-label');

      this.btnSoundToggle = document.getElementById('btn-sound-toggle');
      this.iconSoundOn = document.getElementById('icon-sound-on');
      this.iconSoundOff = document.getElementById('icon-sound-off');

      this.btnHelpToggle = document.getElementById('btn-help-toggle');
      this.helpModal = document.getElementById('help-modal');
      this.btnCloseHelp = document.getElementById('btn-close-help');
      this.btnDoneHelp = document.getElementById('btn-done-help');

      this.toastEl = document.getElementById('toast-notification');
      this.toastMsgEl = document.getElementById('toast-message');

      // Career & Difficulty Stats elements
      this.cGamesPlayed = document.getElementById('c-games-played');
      this.cBlocksStacked = document.getElementById('c-blocks-stacked');
      this.cPerfectDrops = document.getElementById('c-perfect-drops');
      this.cMaxStreak = document.getElementById('c-max-streak');
      this.cBestScore = document.getElementById('c-best-score');
      this.cEasyBest = document.getElementById('c-easy-best');
      this.cMediumBest = document.getElementById('c-medium-best');
      this.cHardBest = document.getElementById('c-hard-best');

      // Services & Controllers
      this.gameService = window.gameService || new GameService();
      this.sound = new SoundController();
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Game state variables
      this.mode = 'classic'; // 'classic' or 'daily'
      this.todayStr = getDailySeedString();
      this.dailySeed = hashSeed(this.todayStr);
      this.rng = Math.random;

      // Check URL parameters for direct challenge link (e.g. ?mode=daily)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'daily') {
          this.mode = 'daily';
          this.btnModeDaily.classList.add('active');
          this.btnModeDaily.setAttribute('aria-selected', 'true');
          this.btnModeClassic.classList.remove('active');
          this.btnModeClassic.setAttribute('aria-selected', 'false');
        }
      } catch (e) {}

      this.gameState = 'IDLE'; // 'IDLE' | 'PLAYING' | 'GAMEOVER'
      this.score = 0;
      this.combo = 0;
      this.maxStreakInRound = 0;
      this.perfectSlicesInRound = 0;
      this.hasDroppedFirstBlock = false;

      // Coordinate & Viewport state
      this.virtualHeight = BASE_VIRTUAL_HEIGHT;
      this.scale = 1;
      this.cameraY = 0;
      this.targetCameraY = 0;
      this.screenShake = 0;

      // Tower & Block state
      this.tower = [];
      this.activeBlock = null;
      this.fallingDebris = [];
      this.particles = [];
      this.floatingTexts = [];
      this.shockwaves = [];
      this.clouds = [];
      this.shootingStars = [];
      this.towerSway = 0;
      this.swayVelocity = 0;
      this.milestoneBanner = null;
      this.reachedMilestones = new Set();
      this.stars = [];

      // Timing
      this.lastTimestamp = performance.now();
      this.toastTimeout = null;

      // Setup
      this.initStars();
      this.initClouds();
      this.updateDailyBadge();
      this.updateSoundIcons();
      this.attachEventListeners();
      this.handleResize();
      this.resetRound();

      // Start animation loop
      requestAnimationFrame(this.gameLoop.bind(this));
    }

    initStars() {
      this.stars = [];
      for (let i = 0; i < 65; i++) {
        this.stars.push({
          x: Math.random() * VIRTUAL_WIDTH,
          y: Math.random() * BASE_VIRTUAL_HEIGHT,
          size: Math.random() * 1.8 + 0.8,
          alpha: Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.04 + 0.01
        });
      }
    }

    initClouds() {
      this.clouds = [];
      for (let i = 0; i < 5; i++) {
        this.clouds.push({
          x: Math.random() * (VIRTUAL_WIDTH + 100) - 50,
          y: Math.random() * 260 + 80,
          w: Math.random() * 70 + 60,
          h: Math.random() * 20 + 16,
          vx: Math.random() * 12 + 8,
          alpha: Math.random() * 0.25 + 0.15
        });
      }
    }

    updateDailyBadge() {
      const now = new Date();
      const options = { month: 'short', day: 'numeric' };
      this.dailyDateLabel.textContent = now.toLocaleDateString(undefined, options);
    }

    updateSoundIcons() {
      if (this.sound.muted) {
        this.iconSoundOn.classList.add('hidden');
        this.iconSoundOff.classList.remove('hidden');
        this.btnSoundToggle.setAttribute('aria-label', 'Sound muted. Click to turn on.');
      } else {
        this.iconSoundOn.classList.remove('hidden');
        this.iconSoundOff.classList.add('hidden');
        this.btnSoundToggle.setAttribute('aria-label', 'Sound enabled. Click to mute.');
      }
    }

    attachEventListeners() {
      // Resize handling with debounce
      window.addEventListener('resize', () => this.handleResize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.handleResize(), 100));

      // Primary interaction triggers: Tap / Click / Spacebar
      this.canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handleUserAction();
      });

      // Prevent mobile touch scroll / rubber-banding on viewport
      this.gameContainer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Prevent key repeat auto-drops!

        if (e.code === 'Space' || e.code === 'Enter') {
          // If a modal is open, trigger action
          if (!this.gameOverModal.classList.contains('hidden')) {
            e.preventDefault();
            this.btnPlayAgain.click();
            return;
          }
          if (!this.helpModal.classList.contains('hidden')) {
            e.preventDefault();
            this.helpModal.classList.add('hidden');
            return;
          }
          e.preventDefault();
          this.handleUserAction();
        } else if (e.code === 'KeyR') {
          if (this.gameState === 'PLAYING' || this.gameState === 'GAMEOVER') {
            this.resetRound();
          }
        } else if (e.code === 'KeyM') {
          this.toggleSound();
        } else if (e.code === 'Escape') {
          if (!this.helpModal.classList.contains('hidden')) {
            this.helpModal.classList.add('hidden');
          }
        }
      });

      // Sound button
      this.btnSoundToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSound();
      });

      // Mode pill switchers
      this.btnModeClassic.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMode('classic');
      });

      this.btnModeDaily.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMode('daily');
      });

      // Modal buttons
      this.btnPlayAgain.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.playClick();
        this.gameOverModal.classList.add('hidden');
        this.resetRound();
      });

      this.btnChallenge.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.playClick();
        this.shareScore();
      });

      this.btnSwitchMode.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.playClick();
        this.gameOverModal.classList.add('hidden');
        this.setMode(this.mode === 'classic' ? 'daily' : 'classic');
      });

      // Difficulty Buttons (Header)
      if (this.btnDiffEasy) {
        this.btnDiffEasy.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sound.playClick();
          this.setDifficulty('easy');
        });
      }
      if (this.btnDiffMed) {
        this.btnDiffMed.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sound.playClick();
          this.setDifficulty('medium');
        });
      }
      if (this.btnDiffHard) {
        this.btnDiffHard.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sound.playClick();
          this.setDifficulty('hard');
        });
      }

      // Difficulty Buttons (Modal)
      if (this.btnModalDiffEasy) {
        this.btnModalDiffEasy.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sound.playClick();
          this.setDifficulty('easy');
        });
      }
      if (this.btnModalDiffMed) {
        this.btnModalDiffMed.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sound.playClick();
          this.setDifficulty('medium');
        });
      }
      if (this.btnModalDiffHard) {
        this.btnModalDiffHard.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sound.playClick();
          this.setDifficulty('hard');
        });
      }

      // Help Modal triggers
      this.btnHelpToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.playClick();
        this.openHelpModal();
      });

      this.btnCloseHelp.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.playClick();
        this.helpModal.classList.add('hidden');
      });

      this.btnDoneHelp.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.playClick();
        this.helpModal.classList.add('hidden');
      });
    }

    setDifficulty(diffId) {
      const config = this.gameService.setDifficulty(diffId);
      if (!config) return;

      const diffBtns = [
        { el: this.btnDiffEasy, id: 'easy' },
        { el: this.btnDiffMed, id: 'medium' },
        { el: this.btnDiffHard, id: 'hard' }
      ];
      diffBtns.forEach(({ el, id }) => {
        if (el) {
          const isActive = id === config.id;
          el.classList.toggle('active', isActive);
          el.setAttribute('aria-checked', isActive ? 'true' : 'false');
        }
      });

      const modalBtns = [
        { el: this.btnModalDiffEasy, id: 'easy' },
        { el: this.btnModalDiffMed, id: 'medium' },
        { el: this.btnModalDiffHard, id: 'hard' }
      ];
      modalBtns.forEach(({ el, id }) => {
        if (el) {
          el.classList.toggle('active', id === config.id);
        }
      });

      this.updateHudDifficultyBadge(config);
      this.showToast(`Difficulty: ${config.name} ${config.icon}`);
      this.resetRound();
    }

    updateHudDifficultyBadge(config) {
      const cfg = config || this.gameService.getConfig();
      if (this.hudDiffIcon) this.hudDiffIcon.textContent = cfg.icon;
      if (this.hudDiffLabel) this.hudDiffLabel.textContent = cfg.name.toUpperCase();
      if (this.hudDiffTag) {
        this.hudDiffTag.style.borderColor = cfg.color;
        this.hudDiffTag.style.color = cfg.color;
      }
    }

    setMode(newMode) {
      if (this.mode === newMode) return;
      this.mode = newMode;
      if (newMode === 'classic') {
        this.btnModeClassic.classList.add('active');
        this.btnModeClassic.setAttribute('aria-selected', 'true');
        this.btnModeDaily.classList.remove('active');
        this.btnModeDaily.setAttribute('aria-selected', 'false');
        if (this.hudBestLabel) this.hudBestLabel.textContent = 'BEST';
      } else {
        this.btnModeDaily.classList.add('active');
        this.btnModeDaily.setAttribute('aria-selected', 'true');
        this.btnModeClassic.classList.remove('active');
        this.btnModeClassic.setAttribute('aria-selected', 'false');
        if (this.hudBestLabel) this.hudBestLabel.textContent = 'DAILY BEST';
      }
      this.resetRound();
    }

    toggleSound() {
      const isMuted = this.sound.toggleMuted();
      this.updateSoundIcons();
      this.showToast(isMuted ? 'Sound muted 🔇' : 'Sound enabled 🔊');
    }

    handleResize() {
      const canvasRect = this.canvas.getBoundingClientRect();
      if (canvasRect.width === 0 || canvasRect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      this.canvas.width = Math.round(canvasRect.width * dpr);
      this.canvas.height = Math.round(canvasRect.height * dpr);

      // Virtual height is proportional to the canvas aspect ratio
      this.virtualHeight = (canvasRect.height / canvasRect.width) * VIRTUAL_WIDTH;

      // Uniform scale factor
      this.scale = (canvasRect.width * dpr) / VIRTUAL_WIDTH;
    }

    getPersonalBest() {
      return this.gameService.getBestScore(this.mode, this.todayStr);
    }

    savePersonalBest(newScore) {
      return this.gameService.saveScore(this.mode, this.todayStr, newScore);
    }

    recordCareerStats(roundScore, roundPerfects, maxStreak) {
      this.gameService.recordRoundStats(roundScore, roundPerfects, maxStreak);
    }

    openHelpModal() {
      const records = this.gameService.getAllDifficultyRecords();
      if (this.cEasyBest) this.cEasyBest.textContent = records.easy.toLocaleString();
      if (this.cMediumBest) this.cMediumBest.textContent = records.medium.toLocaleString();
      if (this.cHardBest) this.cHardBest.textContent = records.hard.toLocaleString();

      const cStats = this.gameService.getCareerStats();
      if (this.cGamesPlayed) this.cGamesPlayed.textContent = cStats.played.toLocaleString();
      if (this.cBlocksStacked) this.cBlocksStacked.textContent = cStats.stacked.toLocaleString();
      if (this.cPerfectDrops) this.cPerfectDrops.textContent = cStats.perfects.toLocaleString();
      if (this.cMaxStreak) this.cMaxStreak.textContent = `${cStats.maxStreak} 🔥`;
      if (this.cBestScore) this.cBestScore.textContent = Math.max(records.easy, records.medium, records.hard).toLocaleString();

      this.helpModal.classList.remove('hidden');
    }

    resetRound() {
      const config = this.gameService.getConfig();

      // Re-seed PRNG if in Daily Mode
      if (this.mode === 'daily') {
        this.rng = mulberry32(this.dailySeed);
      } else {
        this.rng = Math.random;
      }

      this.score = 0;
      this.combo = 0;
      this.maxStreakInRound = 0;
      this.perfectSlicesInRound = 0;
      this.screenShake = 0;
      this.cameraY = 0;
      this.targetCameraY = 0;
      this.gameState = 'PLAYING';
      this.fallingDebris = [];
      this.particles = [];
      this.floatingTexts = [];
      this.shockwaves = [];
      this.shootingStars = [];
      this.towerSway = 0;
      this.swayVelocity = 0;
      this.milestoneBanner = null;
      this.reachedMilestones.clear();

      // Update HUD
      this.scoreEl.textContent = '0';
      this.bestScoreEl.textContent = this.getPersonalBest();
      this.streakBanner.classList.add('hidden');
      this.updateHudDifficultyBadge(config);

      // Update switch mode button text on game over modal
      this.switchModeText.textContent = this.mode === 'classic'
        ? 'Play Daily Challenge'
        : 'Play Classic Mode';

      // Base block placed at bottom of tower with configured initial width
      const baseBlockWidth = config.initialWidth;
      const baseBlockX = (VIRTUAL_WIDTH - baseBlockWidth) / 2;
      const baseBlockY = this.virtualHeight - 140;
      const baseHue = Math.floor(this.rng() * 360);

      this.tower = [{
        x: baseBlockX,
        y: baseBlockY,
        w: baseBlockWidth,
        h: BLOCK_HEIGHT,
        hue: baseHue,
        squash: 0
      }];

      // First run hint display
      const hasSeenHint = localStorage.getItem('stack_panic_hint_seen');
      if (!hasSeenHint && !this.hasDroppedFirstBlock) {
        this.startHint.classList.remove('hidden');
      } else {
        this.startHint.classList.add('hidden');
      }

      // Spawn first sliding block
      this.spawnActiveBlock();
    }

    spawnActiveBlock() {
      const config = this.gameService.getConfig();
      const topBlock = this.tower[this.tower.length - 1];
      const targetY = topBlock.y - BLOCK_HEIGHT;
      const hue = (topBlock.hue + 8) % 360;

      // Seeded spawn side and direction
      const spawnFromLeft = this.rng() > 0.5;
      const width = topBlock.w;
      const speed = config.baseSpeed + Math.min(config.maxSpeedBonus, this.score * config.speedRamp);

      let startX;
      let dir;
      if (spawnFromLeft) {
        startX = -width;
        dir = 1;
      } else {
        startX = VIRTUAL_WIDTH;
        dir = -1;
      }

      this.activeBlock = {
        x: startX,
        y: targetY,
        w: width,
        h: BLOCK_HEIGHT,
        hue: hue,
        speed: speed,
        dir: dir,
        minX: -width - 20,
        maxX: VIRTUAL_WIDTH + 20
      };

      // Adjust camera so the top of the tower stays comfortably visible
      const comfortableTopY = this.virtualHeight * 0.58;
      if (targetY < comfortableTopY) {
        this.targetCameraY = comfortableTopY - targetY;
      } else {
        this.targetCameraY = 0;
      }
    }

    handleUserAction() {
      if (this.gameState !== 'PLAYING' || !this.activeBlock) return;

      // Audio init on user gesture
      this.sound.init();

      // Mark hint as seen
      if (!this.hasDroppedFirstBlock) {
        this.hasDroppedFirstBlock = true;
        localStorage.setItem('stack_panic_hint_seen', 'true');
        this.startHint.classList.add('hidden');
      }

      const config = this.gameService.getConfig();
      const prevBlock = this.tower[this.tower.length - 1];
      const diff = this.activeBlock.x - prevBlock.x;
      const absDiff = Math.abs(diff);

      // 1. Check for COMPLETE MISS
      if (absDiff >= this.activeBlock.w) {
        this.triggerMiss();
        return;
      }

      // 2. Check for PERFECT LANDING using configured difficulty tolerance
      if (absDiff <= config.perfectTolerance) {
        this.triggerPerfectLanding(prevBlock);
        return;
      }

      // 3. Regular Landing with OVERHANG SLICE
      this.triggerTrimmedLanding(prevBlock, diff, absDiff);
    }

    triggerPerfectLanding(prevBlock) {
      const config = this.gameService.getConfig();

      // Snap exactly to previous block
      this.activeBlock.x = prevBlock.x;
      this.combo++;
      this.perfectSlicesInRound++;
      this.maxStreakInRound = Math.max(this.maxStreakInRound, this.combo);

      // Score bonus: +1 base plus combo streak multiplier
      const bonus = Math.min(this.combo - 1, 5);
      this.score += 1 + bonus;

      // Sound
      this.sound.playPerfect(this.combo);

      // Bonus recovery check: configured difficulty interval & recovery amount
      let recoveredWidth = false;
      if (this.combo >= config.streakRecoveryInterval &&
          this.combo % config.streakRecoveryInterval === 0 &&
          this.activeBlock.w < config.initialWidth) {
        const widthGain = Math.min(config.recoveryAmount, config.initialWidth - this.activeBlock.w);
        this.activeBlock.w += widthGain;
        this.activeBlock.x -= widthGain / 2; // Center the expansion
        recoveredWidth = true;
        this.sound.playRecovery();
        this.createFloatingText(
          this.activeBlock.x + this.activeBlock.w / 2,
          this.activeBlock.y - 35,
          `+${widthGain}px EXPANDED! 🌟`,
          '#FDE047',
          20
        );
      }

      // Confetti & spark effects
      this.createSparkles(
        this.activeBlock.x + this.activeBlock.w / 2,
        this.activeBlock.y + BLOCK_HEIGHT / 2,
        this.activeBlock.hue,
        24
      );

      // Expanding Shockwave Ring
      this.createShockwave(
        this.activeBlock.x + this.activeBlock.w / 2,
        this.activeBlock.y + BLOCK_HEIGHT,
        `hsl(${this.activeBlock.hue}, 100%, 75%)`
      );

      // Floating text judgment
      const streakMsg = this.combo > 1 ? `PERFECT x${this.combo}! 🎯` : 'PERFECT! 🎯';
      this.createFloatingText(
        this.activeBlock.x + this.activeBlock.w / 2,
        this.activeBlock.y - 14,
        streakMsg,
        '#FACC15',
        19
      );

      // Update HUD Streak Banner
      this.streakText.textContent = `PERFECT x${this.combo}!`;
      this.streakBanner.classList.remove('hidden');

      // Place block onto tower with tactile squash animation
      this.tower.push({ ...this.activeBlock, squash: 0.28 });

      // Check height milestones
      this.checkMilestones();

      // Update HUD Score
      this.updateHudScore();

      // Next block
      this.spawnActiveBlock();
    }

    triggerTrimmedLanding(prevBlock, diff, absDiff) {
      const config = this.gameService.getConfig();

      // Reset streak combo
      this.combo = 0;
      this.streakBanner.classList.add('hidden');

      const newWidth = this.activeBlock.w - absDiff;

      // If the remaining sliver is too thin to build upon, topple the tower!
      if (newWidth < config.minBlockWidth) {
        this.triggerMiss();
        return;
      }

      let placedX, debrisX, debrisWidth, debrisDirection;

      if (diff > 0) {
        // Dropped to the right of tower
        placedX = this.activeBlock.x;
        debrisX = this.activeBlock.x + newWidth;
        debrisWidth = absDiff;
        debrisDirection = 1;
      } else {
        // Dropped to the left of tower
        placedX = prevBlock.x;
        debrisX = this.activeBlock.x;
        debrisWidth = absDiff;
        debrisDirection = -1;
      }

      // Tower wobble sway physics: sway in the direction of the drop impact
      if (!this.prefersReducedMotion) {
        this.swayVelocity += (diff > 0 ? 1 : -1) * Math.min(absDiff * 0.45, 24);
      }

      // Update active block to trimmed size
      this.activeBlock.x = placedX;
      this.activeBlock.w = newWidth;

      // Create falling debris piece
      this.createFallingDebris(
        debrisX,
        this.activeBlock.y,
        debrisWidth,
        BLOCK_HEIGHT,
        this.activeBlock.hue,
        debrisDirection
      );

      // Create slice dust particles along the cut line
      const cutLineX = (diff > 0) ? debrisX : placedX;
      this.createSliceDust(cutLineX, this.activeBlock.y + BLOCK_HEIGHT / 2, this.activeBlock.hue);

      // Judgment Label feedback based on precision
      let judgmentText = "GOOD! 👍";
      let judgmentColor = "#10B981"; // emerald
      if (absDiff <= 14) {
        judgmentText = "EXCELLENT! ✨";
        judgmentColor = "#38BDF8"; // sky blue
      } else if (absDiff <= 28) {
        judgmentText = "GREAT! 🎯";
        judgmentColor = "#34D399";
      } else if (absDiff <= 48) {
        judgmentText = "NICE SLICE! ✂️";
        judgmentColor = "#F59E0B"; // amber
      } else {
        judgmentText = "CLOSE CALL! ⚠️";
        judgmentColor = "#F43F5E"; // rose
      }

      if (newWidth < 38) {
        judgmentText = "MICRO SLIVER! 🤏";
        judgmentColor = "#FB7185";
      }

      this.createFloatingText(
        this.activeBlock.x + this.activeBlock.w / 2,
        this.activeBlock.y - 14,
        judgmentText,
        judgmentColor,
        17
      );

      // Audio & feedback
      this.sound.playSlice();
      this.sound.playDrop();
      if (!this.prefersReducedMotion) {
        this.screenShake = 3.5;
      }

      this.score += 1;
      this.checkMilestones();
      this.updateHudScore();

      // Place block onto tower with squash animation
      this.tower.push({ ...this.activeBlock, squash: 0.20 });

      // Next block
      this.spawnActiveBlock();
    }

    triggerMiss() {
      this.gameState = 'GAMEOVER';
      this.sound.playGameOver();
      if (!this.prefersReducedMotion) {
        this.screenShake = 8;
      }

      // The entire active block tumbles down
      const dir = this.activeBlock.dir || 1;
      this.createFallingDebris(
        this.activeBlock.x,
        this.activeBlock.y,
        this.activeBlock.w,
        this.activeBlock.h,
        this.activeBlock.hue,
        dir,
        true
      );
      this.activeBlock = null;

      // Save high score and career stats
      const isNewBest = this.savePersonalBest(this.score);
      this.recordCareerStats(this.score, this.perfectSlicesInRound, this.maxStreakInRound);

      // Reveal game over overlay after brief tumble delay
      setTimeout(() => {
        this.showGameOverModal(isNewBest);
      }, 650);
    }

    createFallingDebris(x, y, w, h, hue, dir, isFullMiss = false) {
      this.fallingDebris.push({
        x: x,
        y: y,
        w: w,
        h: h,
        hue: hue,
        vx: dir * (isFullMiss ? 80 : 45),
        vy: -40,
        rot: 0,
        vRot: dir * (isFullMiss ? 4.5 : 3.2),
        alpha: 1
      });
    }

    createSparkles(centerX, centerY, hue, count) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 150 + 60;
        this.particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          size: Math.random() * 4 + 2,
          color: `hsl(${(hue + Math.random() * 50 - 25) % 360}, 100%, 70%)`,
          alpha: 1,
          decay: Math.random() * 1.8 + 1.2
        });
      }
    }

    createSliceDust(cutX, cutY, hue) {
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: cutX + (Math.random() - 0.5) * 6,
          y: cutY + (Math.random() - 0.5) * BLOCK_HEIGHT,
          vx: (Math.random() - 0.5) * 80,
          vy: -Math.random() * 90 - 20,
          size: Math.random() * 3 + 1.5,
          color: `hsl(${hue}, 90%, 80%)`,
          alpha: 0.9,
          decay: 2.2
        });
      }
    }

    createFloatingText(x, y, text, color, fontSize) {
      this.floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        fontSize: fontSize,
        alpha: 1,
        scale: 0.2,
        targetScale: 1.05,
        vy: -55,
        life: 0.95
      });
    }

    createShockwave(x, y, color) {
      this.shockwaves.push({
        x: x,
        y: y,
        radius: 8,
        maxRadius: 85,
        color: color,
        alpha: 0.95
      });
    }

    checkMilestones() {
      const milestones = [
        { height: 10, label: "☁️ CLOUD ZONE! (10 FLOORS)" },
        { height: 25, label: "✈️ JETSTREAM CRUISER! (25 FLOORS)" },
        { height: 40, label: "🛰️ STRATOSPHERE REACHED! (40 FLOORS)" },
        { height: 60, label: "🌌 LOW EARTH ORBIT! (60 FLOORS)" },
        { height: 80, label: "🚀 DEEP COSMOS STACKER! (80 FLOORS)" },
        { height: 100, label: "🌕 TO THE MOON! (100 FLOORS)" }
      ];

      for (const m of milestones) {
        if (this.score >= m.height && !this.reachedMilestones.has(m.height)) {
          this.reachedMilestones.add(m.height);
          this.showMilestoneBanner(m.label);
          this.createSparkles(VIRTUAL_WIDTH / 2, this.activeBlock ? this.activeBlock.y : 200, 45, 35);
          break;
        }
      }
    }

    showMilestoneBanner(text) {
      this.milestoneBanner = {
        text: text,
        alpha: 1,
        life: 2.3,
        scale: 0.4,
        targetScale: 1
      };
    }

    updateHudScore() {
      this.scoreEl.textContent = this.score;
      this.scoreEl.classList.remove('pop');
      void this.scoreEl.offsetWidth; // Trigger reflow for CSS pop animation
      this.scoreEl.classList.add('pop');

      const currentBest = this.getPersonalBest();
      if (this.score > currentBest) {
        this.bestScoreEl.textContent = this.score;
      }
    }

    getVerdict(score, maxStreak) {
      if (score === 0) {
        return {
          title: 'Ground Level!',
          avatar: '🧱',
          quote: 'Did you drop it with your eyes closed? Try again!'
        };
      }
      if (score < 4) {
        return {
          title: 'Wobbly Warmup',
          avatar: '🐣',
          quote: 'Finding your footing, one wobble at a time.'
        };
      }
      if (score < 10) {
        return {
          title: 'Apprentice Mason',
          avatar: '🔨',
          quote: 'Nice rhythm! Now keep those overhangs clean.'
        };
      }
      if (score < 18) {
        return {
          title: 'Tower Builder',
          avatar: '🏗️',
          quote: 'A respectable silhouette taking shape!'
        };
      }
      if (score < 30) {
        return {
          title: 'Skyline Architect',
          avatar: '🏙️',
          quote: 'City planners are frantically taking notes.'
        };
      }
      if (score < 48) {
        return {
          title: 'Tower Titan',
          avatar: '⚡',
          quote: 'Defying all known local seismic building codes!'
        };
      }
      if (score < 70) {
        return {
          title: 'Stratosphere Stacker',
          avatar: '🚀',
          quote: 'Entering low Earth orbit. Watch out for satellites!'
        };
      }
      return {
        title: 'Gravity Defier',
        avatar: '👑',
        quote: 'Sir Isaac Newton is weeping tears of sheer joy!'
      };
    }

    showGameOverModal(isNewBest) {
      const verdict = this.getVerdict(this.score, this.maxStreakInRound);

      this.verdictAvatar.textContent = verdict.avatar;
      this.gameOverTitle.textContent = verdict.title;
      this.verdictQuote.textContent = `"${verdict.quote}"`;

      this.finalScoreEl.textContent = this.score;
      this.bestScoreModalEl.textContent = this.getPersonalBest();
      this.streakModalEl.textContent = `${this.maxStreakInRound} 🔥`;
      this.perfectsModalEl.textContent = this.perfectSlicesInRound;

      if (isNewBest && this.score > 0) {
        this.newBestBadge.classList.remove('hidden');
      } else {
        this.newBestBadge.classList.add('hidden');
      }

      if (this.mode === 'daily') {
        this.labelGameOverBest.textContent = "TODAY'S BEST";
        this.dailyResultBanner.classList.remove('hidden');
        this.dailyRankTag.textContent = verdict.title;
      } else {
        this.labelGameOverBest.textContent = 'PERSONAL BEST';
        this.dailyResultBanner.classList.add('hidden');
      }

      this.gameOverModal.classList.remove('hidden');
      this.btnPlayAgain.focus();
    }

    shareScore() {
      const config = this.gameService.getConfig();
      const modeName = this.mode === 'daily' ? `Daily Challenge (${this.todayStr})` : 'Classic Mode';
      const verdict = this.getVerdict(this.score, this.maxStreakInRound);
      const baseUrl = window.location.href.split('?')[0].split('#')[0];
      const url = `${baseUrl}?mode=${this.mode}&diff=${config.id}`;

      const shareText = `🏗️ I stacked ${this.score} blocks on ${config.name} difficulty ${config.icon} in Stack Panic! (${modeName})\n🔥 Max Streak: ${this.maxStreakInRound}\n🏆 Verdict: ${verdict.title} ${verdict.avatar}\nCan you top my tower? Play here:\n${url}`;

      if (navigator.share) {
        navigator.share({
          title: 'Stack Panic Challenge',
          text: shareText,
          url: url
        }).catch(() => {
          this.copyToClipboard(shareText);
        });
      } else {
        this.copyToClipboard(shareText);
      }
    }

    copyToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.showToast('Challenge copied to clipboard! 📋');
        }).catch(() => {
          this.fallbackCopyText(text);
        });
      } else {
        this.fallbackCopyText(text);
      }
    }

    fallbackCopyText(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.showToast('Challenge copied to clipboard! 📋');
      } catch (err) {
        this.showToast('Unable to copy automatically.');
      }
      document.body.removeChild(textArea);
    }

    showToast(message) {
      this.toastMsgEl.textContent = message;
      this.toastEl.classList.remove('hidden');
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.toastEl.classList.add('hidden');
      }, 2600);
    }

    // --- Main Game Loop ---
    gameLoop(currentTimestamp) {
      const dt = Math.min((currentTimestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = currentTimestamp;

      this.update(dt);
      this.render();

      requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(dt) {
      // 1. Update sliding active block
      if (this.gameState === 'PLAYING' && this.activeBlock) {
        const moveDist = this.activeBlock.speed * dt * this.activeBlock.dir;
        this.activeBlock.x += moveDist;

        if (this.activeBlock.dir > 0 && this.activeBlock.x >= this.activeBlock.maxX - this.activeBlock.w) {
          this.activeBlock.dir = -1;
        } else if (this.activeBlock.dir < 0 && this.activeBlock.x <= this.activeBlock.minX) {
          this.activeBlock.dir = 1;
        }
      }

      // 2. Camera smooth tracking
      if (this.prefersReducedMotion) {
        this.cameraY = this.targetCameraY;
      } else {
        this.cameraY += (this.targetCameraY - this.cameraY) * (8 * dt);
      }

      // 3. Screen shake decay
      if (this.screenShake > 0) {
        this.screenShake = Math.max(0, this.screenShake - 20 * dt);
      }

      // 4. Tower sway spring physics
      if (!this.prefersReducedMotion && (Math.abs(this.towerSway) > 0.01 || Math.abs(this.swayVelocity) > 0.01)) {
        const springK = 32;
        const damping = 6.5;
        const accel = -springK * this.towerSway - damping * this.swayVelocity;
        this.swayVelocity += accel * dt;
        this.towerSway += this.swayVelocity * dt;
      } else {
        this.towerSway = 0;
        this.swayVelocity = 0;
      }

      // 5. Block squash decay
      for (const b of this.tower) {
        if (b.squash && b.squash > 0.005) {
          b.squash *= Math.pow(0.001, dt);
        } else {
          b.squash = 0;
        }
      }

      // 6. Update falling debris
      for (let i = this.fallingDebris.length - 1; i >= 0; i--) {
        const d = this.fallingDebris[i];
        d.vy += GRAVITY * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (!this.prefersReducedMotion) {
          d.rot += d.vRot * dt;
        }

        // Fade out as it falls below screen
        if (d.y + this.cameraY > this.virtualHeight + 100) {
          this.fallingDebris.splice(i, 1);
        }
      }

      // 7. Update shockwaves
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 11 * dt;
        sw.alpha -= 2.2 * dt;
        if (sw.alpha <= 0) {
          this.shockwaves.splice(i, 1);
        }
      }

      // 8. Update milestone banner
      if (this.milestoneBanner) {
        this.milestoneBanner.life -= dt;
        this.milestoneBanner.scale += (this.milestoneBanner.targetScale - this.milestoneBanner.scale) * 12 * dt;
        if (this.milestoneBanner.life < 0.5) {
          this.milestoneBanner.alpha = Math.max(0, this.milestoneBanner.life / 0.5);
        }
        if (this.milestoneBanner.life <= 0) {
          this.milestoneBanner = null;
        }
      }

      // 9. Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 380 * dt; // gravity
        p.alpha -= p.decay * dt;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // 10. Update floating texts with scale pop
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy * dt;
        if (ft.scale !== undefined) {
          ft.scale += (ft.targetScale - ft.scale) * 14 * dt;
        }
        ft.life -= dt;
        ft.alpha = Math.max(0, ft.life / 0.95);
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }

      // 11. Update background drifting clouds
      for (const c of this.clouds) {
        c.x += c.vx * dt;
        if (c.x > VIRTUAL_WIDTH + 100) {
          c.x = -c.w - 100;
          c.y = Math.random() * 260 + 80;
        }
      }

      // 12. Cosmic Shooting stars in space
      if (this.score >= 35 && Math.random() < 0.02 && this.shootingStars.length < 3) {
        this.shootingStars.push({
          x: Math.random() * VIRTUAL_WIDTH + 80,
          y: Math.random() * 150,
          vx: -(Math.random() * 300 + 350),
          vy: Math.random() * 160 + 100,
          len: Math.random() * 50 + 30,
          alpha: 1,
          decay: Math.random() * 1.6 + 1.2
        });
      }

      for (let i = this.shootingStars.length - 1; i >= 0; i--) {
        const ss = this.shootingStars[i];
        ss.x += ss.vx * dt;
        ss.y += ss.vy * dt;
        ss.alpha -= ss.decay * dt;
        if (ss.alpha <= 0) {
          this.shootingStars.splice(i, 1);
        }
      }

      // 13. Twinkle background stars
      for (let s of this.stars) {
        s.alpha += s.twinkleSpeed;
        if (s.alpha > 0.9 || s.alpha < 0.25) {
          s.twinkleSpeed = -s.twinkleSpeed;
        }
      }
    }

    render() {
      const ctx = this.ctx;
      const w = this.virtualHeight * (this.canvas.width / this.canvas.height);

      ctx.save();
      // Apply scaling to canvas virtual resolution
      ctx.scale(this.scale, this.scale);

      // Screen Shake
      if (this.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * this.screenShake;
        const shakeY = (Math.random() - 0.5) * this.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Draw dynamic background sky (screen space)
      this.drawBackground(ctx);

      // 2. Apply Camera Translation for world objects
      ctx.save();
      ctx.translate(0, this.cameraY);

      // Draw ground platform (anchored beneath base block)
      this.drawGround(ctx);

      // Draw placed tower blocks with spring sway and landing squash
      for (let i = 0; i < this.tower.length; i++) {
        const b = this.tower[i];
        if (b.y + this.cameraY > this.virtualHeight + 100) continue;
        if (b.y + this.cameraY < -100) continue;

        const swayRatio = i / Math.max(this.tower.length, 1);
        const swayX = this.towerSway * swayRatio;
        this.drawBlock(ctx, b.x + swayX, b.y, b.w, b.h, b.hue, false, b.squash || 0);
      }

      // Draw shockwave expanding rings
      for (const sw of this.shockwaves) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3.5 * sw.alpha;
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw falling debris
      for (const d of this.fallingDebris) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, d.alpha);
        ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
        ctx.rotate(d.rot);
        this.drawBlock(ctx, -d.w / 2, -d.h / 2, d.w, d.h, d.hue, false, 0);
        ctx.restore();
      }

      // Draw Laser Alignment Guides (Exclusive to Easy Mode!)
      const config = this.gameService.getConfig();
      if (config.hasLaserGuide && this.activeBlock && this.tower.length > 0) {
        const topTower = this.tower[this.tower.length - 1];
        const topSway = this.towerSway;
        ctx.save();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'; // Soft emerald laser
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        // Left guide projection
        ctx.moveTo(topTower.x + topSway, topTower.y);
        ctx.lineTo(topTower.x + topSway, topTower.y - 150);
        // Right guide projection
        ctx.moveTo(topTower.x + topTower.w + topSway, topTower.y);
        ctx.lineTo(topTower.x + topTower.w + topSway, topTower.y - 150);
        ctx.stroke();
        ctx.restore();
      }

      // Draw active sliding block (swaying with the tower top)
      if (this.activeBlock) {
        const activeSway = this.towerSway;
        this.drawBlock(
          ctx,
          this.activeBlock.x + activeSway,
          this.activeBlock.y,
          this.activeBlock.w,
          this.activeBlock.h,
          this.activeBlock.hue,
          true,
          0
        );
      }

      // Draw particles
      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw floating judgment labels with playful spring bounce
      for (const ft of this.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.translate(ft.x, ft.y);
        const s = ft.scale !== undefined ? ft.scale : 1;
        ctx.scale(s, s);
        ctx.font = `800 ${ft.fontSize}px 'Fredoka', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
      }

      // Draw floating altitude milestone banner
      if (this.milestoneBanner) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.milestoneBanner.alpha);
        const bannerY = this.virtualHeight * 0.35 - this.cameraY;
        ctx.translate(VIRTUAL_WIDTH / 2, bannerY);
        const bs = this.milestoneBanner.scale;
        ctx.scale(bs, bs);

        // Glowing pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(250, 204, 21, 0.65)';
        ctx.shadowBlur = 18;

        const bw = 330;
        const bh = 46;
        this.roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 23);
        ctx.fill();
        ctx.stroke();

        // Banner text
        ctx.shadowBlur = 0;
        ctx.font = `800 15px 'Fredoka', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.milestoneBanner.text, 0, 0);
        ctx.restore();
      }

      ctx.restore(); // Restore camera translation
      ctx.restore(); // Restore root scale
    }

    drawBackground(ctx) {
      // Dynamic gradient palette transitions based on height
      const t = Math.min(this.score / 60, 1);
      const grad = ctx.createLinearGradient(0, 0, 0, this.virtualHeight);

      // Smooth color transitions from warm sunrise to cosmic deep violet
      if (this.score < 15) {
        grad.addColorStop(0, '#2e1065');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#0f172a');
      } else if (this.score < 35) {
        grad.addColorStop(0, '#3b0764');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#111827');
      } else if (this.score < 60) {
        grad.addColorStop(0, '#4c0519');
        grad.addColorStop(0.6, '#1e1b4b');
        grad.addColorStop(1, '#090d16');
      } else {
        // Deep Space
        grad.addColorStop(0, '#030712');
        grad.addColorStop(0.6, '#0f172a');
        grad.addColorStop(1, '#020617');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, this.virtualHeight);

      // Draw starry sky
      ctx.save();
      for (const s of this.stars) {
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.restore();

      // Draw drifting clouds (lower/mid atmosphere)
      if (this.score < 45) {
        ctx.save();
        for (const c of this.clouds) {
          ctx.globalAlpha = c.alpha * (1 - Math.min(this.score / 45, 1));
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          this.drawCloudShape(ctx, c.x, c.y, c.w, c.h);
        }
        ctx.restore();
      }

      // Draw shooting stars (cosmic altitude)
      if (this.shootingStars.length > 0) {
        ctx.save();
        for (const ss of this.shootingStars) {
          ctx.globalAlpha = Math.max(0, ss.alpha);
          const sGrad = ctx.createLinearGradient(ss.x, ss.y, ss.x + ss.len, ss.y - ss.len * 0.45);
          sGrad.addColorStop(0, '#ffffff');
          sGrad.addColorStop(1, 'transparent');
          ctx.strokeStyle = sGrad;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(ss.x, ss.y);
          ctx.lineTo(ss.x + ss.len, ss.y - ss.len * 0.45);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    drawCloudShape(ctx, x, y, w, h) {
      ctx.beginPath();
      ctx.arc(x + w * 0.25, y + h * 0.6, h * 0.5, 0, Math.PI * 2);
      ctx.arc(x + w * 0.5, y + h * 0.4, h * 0.65, 0, Math.PI * 2);
      ctx.arc(x + w * 0.75, y + h * 0.6, h * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawGround(ctx) {
      if (this.tower.length === 0) return;
      const baseBlock = this.tower[0];
      const groundY = baseBlock.y + baseBlock.h;

      ctx.save();
      // Platform dark fill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, groundY, VIRTUAL_WIDTH, this.virtualHeight * 2);

      // Platform top neon trim
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(VIRTUAL_WIDTH, groundY);
      ctx.stroke();

      // Pedestal accent bar
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(baseBlock.x - 25, groundY + 8);
      ctx.lineTo(baseBlock.x + baseBlock.w + 25, groundY + 8);
      ctx.stroke();

      ctx.restore();
    }

    drawBlock(ctx, x, y, w, h, hue, isActive, squash = 0) {
      if (w <= 0) return;

      ctx.save();

      // Tactile landing squash & stretch bounce animation
      if (squash > 0.001) {
        const scaleX = 1 + squash * 0.45;
        const scaleY = 1 - squash;
        ctx.translate(x + w / 2, y + h);
        ctx.scale(scaleX, scaleY);
        ctx.translate(-(x + w / 2), -(y + h));
      }

      // Block colors (acrylic 3D style)
      const baseColor = `hsl(${hue}, 85%, 58%)`;
      const highlightTop = `hsl(${hue}, 90%, 72%)`;
      const shadowRight = `hsl(${hue}, 80%, 42%)`;
      const shadowBottom = `hsl(${hue}, 80%, 35%)`;

      // Soft drop shadow beneath block
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = isActive ? 12 : 6;
      ctx.shadowOffsetY = isActive ? 8 : 4;

      // Main face
      ctx.fillStyle = baseColor;
      const radius = 4;
      this.roundRect(ctx, x, y, w, h, radius);
      ctx.fill();

      // Reset shadow for edge bevels
      ctx.shadowColor = 'transparent';

      // Top bevel highlight
      ctx.fillStyle = highlightTop;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.lineTo(x + w - radius - 3, y + 4);
      ctx.lineTo(x + radius + 3, y + 4);
      ctx.closePath();
      ctx.fill();

      // Right bevel shadow
      ctx.fillStyle = shadowRight;
      ctx.beginPath();
      ctx.moveTo(x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.lineTo(x + w - 4, y + h - radius - 2);
      ctx.lineTo(x + w - 4, y + radius + 2);
      ctx.closePath();
      ctx.fill();

      // Bottom bevel shadow
      ctx.fillStyle = shadowBottom;
      ctx.beginPath();
      ctx.moveTo(x + radius, y + h);
      ctx.lineTo(x + w - radius, y + h);
      ctx.lineTo(x + w - radius - 3, y + h - 3);
      ctx.lineTo(x + radius + 3, y + h - 3);
      ctx.closePath();
      ctx.fill();

      // Glowing pulse highlight for active block
      if (isActive) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, x, y, w, h, radius);
        ctx.stroke();
      }

      ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  // Launch when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    window.stackPanicGame = new StackPanicGame();
  });
})();
