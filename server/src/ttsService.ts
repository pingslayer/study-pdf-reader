export interface WordAlignment {
  word: string;
  start: number;
  end: number;
  charStart?: number;
}

export interface TTSResponse {
  audioUrl: string;
  alignment: WordAlignment[];
  duration: number;
}

export class TTSService {
  private apiKey: string;
  private defaultVoiceId: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // George default (active premade)
  }

  public hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public setApiKey(key: string, voiceId?: string): void {
    this.apiKey = key.trim();
    if (voiceId && voiceId.trim().length > 0) {
      this.defaultVoiceId = voiceId.trim();
    }
  }

  public async generateSpeech(text: string, voiceId?: string): Promise<TTSResponse> {
    if (!this.hasApiKey()) {
      throw new Error('ElevenLabs API Key is not configured. Please connect your ElevenLabs API key in the top right.');
    }

    // If voiceId is the deprecated library voice Rachel, use George
    let selectedVoice = voiceId || this.defaultVoiceId;
    if (selectedVoice === '21m00Tcm4TlvDq8ikWAM') {
      selectedVoice = 'JBFqnCBsd6RMkjVDRZzb';
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}/with-timestamps`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `ElevenLabs API error (${response.status})`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.detail && parsed.detail.message) {
          errorMsg = parsed.detail.message;
        }
      } catch {
        errorMsg += `: ${errorText}`;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const alignment = this.parseCharacterAlignmentToWords(text, data.alignment);
    const audioUrl = `data:audio/mp3;base64,${data.audio_base64}`;
    const duration = alignment.length > 0 ? alignment[alignment.length - 1].end : 1.0;

    return {
      audioUrl,
      alignment,
      duration,
    };
  }

  private parseCharacterAlignmentToWords(
    text: string,
    alignmentData: {
      characters?: string[];
      character_start_times_seconds?: number[];
      character_end_times_seconds?: number[];
    }
  ): WordAlignment[] {
    if (!alignmentData?.characters || !alignmentData.character_start_times_seconds) {
      throw new Error('No character alignment received from ElevenLabs API');
    }

    const words: WordAlignment[] = [];
    const chars = alignmentData.characters;
    const starts = alignmentData.character_start_times_seconds;
    const ends = alignmentData.character_end_times_seconds || [];

    let currentWord = '';
    let wordStart = -1;
    let wordEnd = 0;
    let charOffset = 0;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const start = starts[i] ?? 0;
      const end = ends[i] ?? (start + 0.05);

      if (/\s/.test(char)) {
        if (currentWord.trim().length > 0) {
          words.push({
            word: currentWord.trim(),
            start: wordStart >= 0 ? wordStart : start,
            end: wordEnd,
            charStart: charOffset - currentWord.length,
          });
          currentWord = '';
          wordStart = -1;
        }
        charOffset++;
      } else {
        if (wordStart < 0) {
          wordStart = start;
        }
        currentWord += char;
        wordEnd = end;
        charOffset++;
      }
    }

    if (currentWord.trim().length > 0) {
      words.push({
        word: currentWord.trim(),
        start: wordStart >= 0 ? wordStart : 0,
        end: wordEnd,
        charStart: charOffset - currentWord.length,
      });
    }

    return words;
  }
}
