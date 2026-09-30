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

  public async fetchTTS(text: string, voiceId?: string): Promise<TTSClientResponse> {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to generate speech' }));
      throw new Error(err.error || 'ElevenLabs TTS generation failed');
    }

    return await response.json();
  }

  public playWithAlignment(
    ttsData: TTSClientResponse,
    _spokenText: string,
    speed: number,
    volume: number,
    onWordSpoken: (word: string, wordIndex: number, charIndex?: number) => void,
    onEnded: () => void
  ) {
    this.stop();

    if (!ttsData.audioUrl || ttsData.audioUrl.length === 0) {
      setTimeout(() => {
        if (this.isPlaying) {
          onEnded();
        }
      }, 60);
      return;
    }

    this.isPlaying = true;
    const audio = new Audio(ttsData.audioUrl);
    this.audioElement = audio;
    audio.playbackRate = speed;
    audio.volume = volume;

    let lastReportedIndex = -1;

    const checkTime = () => {
      if (!this.isPlaying) return;
      const current = audio.currentTime;

      // Find active word in alignment directly from ElevenLabs hardware audio time
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

    audio.onplay = () => {
      this.animFrameId = requestAnimationFrame(checkTime);
    };

    audio.onended = () => {
      this.stop();
      onEnded();
    };

    audio.onerror = (err) => {
      console.error('ElevenLabs audio playback failed:', err);
      this.stop();
      onEnded();
    };

    audio.play().catch((err) => {
      console.error('ElevenLabs audio playback failed to start:', err);
      this.stop();
      onEnded();
    });
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
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
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
