export interface WordAlignment {
  word: string;
  start: number;
  end: number;
  charStart?: number;
}

export interface TTSClientResponse {
  audioUrl: string;
  alignment: WordAlignment[];
  duration: number;
}

export class TTSPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private animFrameId: number | null = null;
  private isPlaying: boolean = false;
  private timeTickCallback: (() => void) | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isPlaying && this.timeTickCallback) {
          this.timeTickCallback();
          if (!this.animFrameId && this.audioElement && !this.audioElement.paused) {
            this.animFrameId = requestAnimationFrame(this.timeTickCallback);
          }
        }
      });
    }
  }

  public async fetchTTS(text: string, voiceId?: string): Promise<TTSClientResponse> {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Speech service unreachable' }));
      throw new Error(err.error || `Voice synthesis failed (${response.status})`);
    }

    return await response.json();
  }

  public playWithAlignment(
    ttsData: TTSClientResponse,
    _spokenText: string,
    speed: number,
    volume: number,
    onWordSpoken: (word: string, wordIndex: number, charIndex?: number) => void,
    onEnded: () => void,
    onError?: (error: any) => void
  ) {
    this.stop();
    this.isPlaying = true;

    if (!ttsData.audioUrl || ttsData.audioUrl.length === 0) {
      setTimeout(() => {
        if (this.isPlaying) {
          this.stop();
          onEnded();
        }
      }, 60);
      return;
    }
    const audio = new Audio(ttsData.audioUrl);
    this.audioElement = audio;
    audio.playbackRate = speed;
    audio.volume = volume;

    let lastReportedIndex = -1;

    const checkTime = () => {
      if (!this.isPlaying || !this.audioElement) return;
      const current = audio.currentTime;

      // Find active word in alignment directly from hardware audio time
      for (let i = 0; i < ttsData.alignment.length; i++) {
        const item = ttsData.alignment[i];
        if (current >= item.start && current <= item.end) {
          if (i !== lastReportedIndex) {
            lastReportedIndex = i;
            onWordSpoken(item.word, i, item.charStart);
          }
          break;
        }
      }

      if (!audio.paused && !audio.ended) {
        this.animFrameId = requestAnimationFrame(checkTime);
      }
    };

    this.timeTickCallback = checkTime;

    audio.onplay = () => {
      if (!this.animFrameId) {
        this.animFrameId = requestAnimationFrame(checkTime);
      }
    };

    audio.ontimeupdate = () => {
      checkTime();
    };

    audio.onended = () => {
      this.stop();
      onEnded();
    };

    audio.onerror = (err) => {
      console.error('TTS audio playback error:', err);
      this.stop();
      if (onError) onError(err);
    };

    audio.play().catch((err) => {
      if (err.name === 'AbortError') return; // User paused or stopped before playback started
      console.error('TTS audio playback failed to start:', err);
      this.stop();
      if (onError) onError(err);
    });
  }

  public canResume(): boolean {
    return Boolean(
      this.audioElement &&
      this.audioElement.paused &&
      !this.audioElement.ended &&
      this.audioElement.currentTime > 0
    );
  }

  public resume(): boolean {
    if (this.canResume() && this.audioElement) {
      this.isPlaying = true;
      if (this.timeTickCallback) {
        this.timeTickCallback();
      }
      this.audioElement
        .play()
        .then(() => {
          if (this.isPlaying && this.timeTickCallback && !this.animFrameId) {
            this.animFrameId = requestAnimationFrame(this.timeTickCallback);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Failed to resume audio playback:', err);
          }
        });
      return true;
    }
    return false;
  }

  public pause() {
    this.isPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public stop() {
    this.isPlaying = false;
    this.timeTickCallback = null;
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement.removeAttribute('src');
      this.audioElement.load(); // Release decoded audio buffer from browser memory
      this.audioElement = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public setSpeed(speed: number) {
    if (this.audioElement) {
      this.audioElement.playbackRate = speed;
    }
  }

  public setVolume(volume: number) {
    if (this.audioElement) {
      this.audioElement.volume = volume;
    }
  }
}

export const ttsPlayer = new TTSPlayer();
