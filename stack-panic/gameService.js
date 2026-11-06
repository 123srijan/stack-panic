/**
 * Stack Panic — Game Service
 * Centralized service managing game difficulty configurations,
 * speed progression parameters, tolerance windows, guidelines,
 * score persistence, and leaderboards.
 */

(function () {
  'use strict';

  class GameService {
    constructor() {
      this.DIFFICULTIES = {
        easy: {
          id: 'easy',
          name: 'Easy',
          badge: '🌱 EASY',
          icon: '🌱',
          color: '#10B981', // Emerald
          initialWidth: 230,
          baseSpeed: 175,
          maxSpeedBonus: 180,
          speedRamp: 3.2,
          perfectTolerance: 6.5,
          streakRecoveryInterval: 3,
          recoveryAmount: 14,
          minBlockWidth: 4,
          hasLaserGuide: true,
          tagline: 'Relaxed & Forgiving',
          description: 'Wider starting blocks, slower movement, visual laser guides, and faster width recovery.'
        },
        medium: {
          id: 'medium',
          name: 'Medium',
          badge: '⚡ MEDIUM',
          icon: '⚡',
          color: '#F59E0B', // Amber
          initialWidth: 200,
          baseSpeed: 230,
          maxSpeedBonus: 280,
          speedRamp: 5.0,
          perfectTolerance: 4.0,
          streakRecoveryInterval: 4,
          recoveryAmount: 10,
          minBlockWidth: 6,
          hasLaserGuide: false,
          tagline: 'Standard Arcade',
          description: 'Classic arcade speed, standard block dimensions, and balanced precision tolerances.'
        },
        hard: {
          id: 'hard',
          name: 'Hard',
          badge: '🔥 HARD',
          icon: '🔥',
          color: '#EF4444', // Red
          initialWidth: 170,
          baseSpeed: 290,
          maxSpeedBonus: 350,
          speedRamp: 7.2,
          perfectTolerance: 2.5,
          streakRecoveryInterval: 5,
          recoveryAmount: 8,
          minBlockWidth: 7,
          hasLaserGuide: false,
          tagline: 'Panic Mode',
          description: 'Narrow starting blocks, blazing initial speed, rapid acceleration, and razor-sharp tolerances.'
        }
      };

      // Initialize difficulty from URL or localStorage
      this.currentDifficulty = this.resolveInitialDifficulty();
    }

    resolveInitialDifficulty() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlDiff = urlParams.get('diff') || urlParams.get('difficulty');
        if (urlDiff && this.DIFFICULTIES[urlDiff.toLowerCase()]) {
          return urlDiff.toLowerCase();
        }
      } catch (e) {}

      const saved = localStorage.getItem('stack_panic_difficulty');
      if (saved && this.DIFFICULTIES[saved]) {
        return saved;
      }
      return 'medium'; // Default to medium
    }

    getDifficulty() {
      return this.currentDifficulty;
    }

    setDifficulty(diffId) {
      const id = (diffId || '').toLowerCase();
      if (this.DIFFICULTIES[id]) {
        this.currentDifficulty = id;
        try {
          localStorage.setItem('stack_panic_difficulty', id);
        } catch (e) {}
        return this.getConfig();
      }
      return null;
    }

    getConfig(diffId = null) {
      const id = (diffId || this.currentDifficulty).toLowerCase();
      return this.DIFFICULTIES[id] || this.DIFFICULTIES.medium;
    }

    getDifficultiesList() {
      return Object.values(this.DIFFICULTIES);
    }

    getBestScore(mode, dateStr, diffId = null) {
      const diff = (diffId || this.currentDifficulty).toLowerCase();
      try {
        if (mode === 'daily') {
          const key = `stack_panic_daily_${dateStr}_${diff}`;
          const val = localStorage.getItem(key);
          if (val !== null) return parseInt(val, 10);
          return parseInt(localStorage.getItem(`stack_panic_daily_${dateStr}`) || '0', 10);
        } else {
          const key = `stack_panic_best_${diff}`;
          const val = localStorage.getItem(key);
          if (val !== null) return parseInt(val, 10);
          if (diff === 'medium') {
            return parseInt(localStorage.getItem('stack_panic_high_score') || '0', 10);
          }
          return 0;
        }
      } catch (e) {
        return 0;
      }
    }

    saveScore(mode, dateStr, score, diffId = null) {
      const diff = (diffId || this.currentDifficulty).toLowerCase();
      let isNewBest = false;
      try {
        if (mode === 'daily') {
          const key = `stack_panic_daily_${dateStr}_${diff}`;
          const prev = this.getBestScore(mode, dateStr, diff);
          if (score > prev) {
            localStorage.setItem(key, String(score));
            isNewBest = true;
          }
        } else {
          const key = `stack_panic_best_${diff}`;
          const prev = this.getBestScore(mode, '', diff);
          if (score > prev) {
            localStorage.setItem(key, String(score));
            isNewBest = true;
          }
          const allTimeKey = 'stack_panic_high_score';
          const allTime = parseInt(localStorage.getItem(allTimeKey) || '0', 10);
          if (score > allTime) {
            localStorage.setItem(allTimeKey, String(score));
          }
        }
      } catch (e) {}
      return isNewBest;
    }

    recordRoundStats(score, perfects, maxStreak, diffId = null) {
      const diff = (diffId || this.currentDifficulty).toLowerCase();
      try {
        // Per-difficulty statistics
        const diffKey = `stack_panic_stats_${diff}`;
        const raw = localStorage.getItem(diffKey);
        const stats = raw ? JSON.parse(raw) : { played: 0, stacked: 0, perfects: 0, maxStreak: 0 };
        stats.played += 1;
        stats.stacked += score;
        stats.perfects += perfects;
        stats.maxStreak = Math.max(stats.maxStreak, maxStreak);
        localStorage.setItem(diffKey, JSON.stringify(stats));

        // Global cumulative career stats
        const globalKey = 'stack_panic_career_stats';
        const gRaw = localStorage.getItem(globalKey);
        const gStats = gRaw ? JSON.parse(gRaw) : { played: 0, stacked: 0, perfects: 0, maxStreak: 0 };
        gStats.played += 1;
        gStats.stacked += score;
        gStats.perfects += perfects;
        gStats.maxStreak = Math.max(gStats.maxStreak, maxStreak);
        localStorage.setItem(globalKey, JSON.stringify(gStats));
      } catch (e) {}
    }

    getAllDifficultyRecords() {
      return {
        easy: this.getBestScore('classic', '', 'easy'),
        medium: this.getBestScore('classic', '', 'medium'),
        hard: this.getBestScore('classic', '', 'hard')
      };
    }

    getCareerStats() {
      try {
        const raw = localStorage.getItem('stack_panic_career_stats');
        return raw ? JSON.parse(raw) : { played: 0, stacked: 0, perfects: 0, maxStreak: 0 };
      } catch (e) {
        return { played: 0, stacked: 0, perfects: 0, maxStreak: 0 };
      }
    }
  }

  // Export to window
  window.GameService = GameService;
  window.gameService = new GameService();
})();
