import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { WordAlignment, TTSResponse } from './ttsService.js';

export function sanitizeForAzureTTS(text: string): string {
  return text
    // Convert math & diagram arrows to natural speech
    .replace(/->/g, ' to ')
    .replace(/<-/g, ' from ')
    .replace(/<=>/g, ' equivalent to ')
    .replace(/=>/g, ' implies ')
    .replace(/!=/g, ' not equal to ')
    // Strip non-printable control chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class AzureSpeechService {
  private key: string;
  private region: string;
  private defaultVoice: string = 'en-US-AvaMultilingualNeural';

  constructor(key?: string, region?: string) {
    this.key = key || process.env.AZURE_SPEECH_KEY || '';
    this.region = region || process.env.AZURE_SPEECH_REGION || '';
  }

  public hasConfig(): boolean {
    const key = this.key || process.env.AZURE_SPEECH_KEY || '';
    const region = this.region || process.env.AZURE_SPEECH_REGION || '';
    return Boolean(key.trim().length > 0 && region.trim().length > 0);
  }

  public async generateSpeech(text: string, voiceId?: string): Promise<TTSResponse> {
    // Normalize line breaks → spaces
    const normalizedText = text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();

    if (!/[a-zA-Z0-9]/.test(normalizedText)) {
      return {
        audioUrl: '',
        alignment: [],
        duration: 0.1,
      };
    }

    const key = this.key || process.env.AZURE_SPEECH_KEY || '';
    const region = this.region || process.env.AZURE_SPEECH_REGION || '';

    if (!key || !region) {
      throw new Error('Azure Speech is not configured. Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in server/.env');
    }

    const selectedVoice = voiceId && voiceId.includes('Neural') ? voiceId : this.defaultVoice;
    const speechText = sanitizeForAzureTTS(normalizedText);

    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
    speechConfig.speechSynthesisVoiceName = selectedVoice;

    // null audioConfig prevents playing through host audio output
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
    const alignment: WordAlignment[] = [];

    synthesizer.wordBoundary = (_sender, event) => {
      // Capture word-level boundaries only (skip punctuation/sentence boundaries)
      if (event.boundaryType === sdk.SpeechSynthesisBoundaryType.Word) {
        let word = event.text;
        if (word === '&amp;') word = '&';
        else if (word === '&lt;') word = '<';
        else if (word === '&gt;') word = '>';

        // 1 tick = 100ns -> 10,000,000 ticks = 1 second
        const start = event.audioOffset / 10000000;
        const end = (event.audioOffset + event.duration) / 10000000;

        alignment.push({
          word,
          start: parseFloat(start.toFixed(3)),
          end: parseFloat(end.toFixed(3)),
          charStart: event.textOffset,
        });
      }
    };

    try {
      const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
        const timeoutMs = Math.max(30000, Math.ceil(speechText.length * 60));
        const timeout = setTimeout(() => {
          synthesizer.close();
          reject(new Error('Azure Speech synthesis timed out. Please check your network connection.'));
        }, timeoutMs);

        synthesizer.speakTextAsync(
          speechText,
          (result) => {
            clearTimeout(timeout);
            synthesizer.close();

            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              resolve(Buffer.from(result.audioData));
            } else {
              reject(new Error(`Azure Speech synthesis failed: ${result.errorDetails || 'Unknown error'}`));
            }
          },
          (err) => {
            clearTimeout(timeout);
            synthesizer.close();
            reject(new Error(`Azure Speech error: ${err}`));
          }
        );
      });

      const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
      const duration = alignment.length > 0 ? alignment[alignment.length - 1].end : 1.0;

      return {
        audioUrl,
        alignment,
        duration,
      };
    } catch (err: any) {
      console.warn('Azure Speech synthesis failed:', err.message);
      throw err;
    }
  }

  public async getVoices(): Promise<Array<{ id: string; name: string; category: string }>> {
    return [
      { id: 'en-US-AvaMultilingualNeural', name: 'Ava (Conversational, Expressive Female)', category: 'Azure Neural' },
      { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew (Warm, Narrative Male)', category: 'Azure Neural' },
      { id: 'en-US-EmmaMultilingualNeural', name: 'Emma (Clear, Lively Female)', category: 'Azure Neural' },
      { id: 'en-US-BrianMultilingualNeural', name: 'Brian (Engaging, Natural Male)', category: 'Azure Neural' },
      { id: 'en-US-GuyNeural', name: 'Guy (Natural, Expressive Male)', category: 'Azure Neural' },
      { id: 'en-US-JennyNeural', name: 'Jenny (Natural, Friendly Female)', category: 'Azure Neural' },
      { id: 'en-US-ChristopherNeural', name: 'Christopher (Deep, Academic Male)', category: 'Azure Neural' },
      { id: 'en-US-AriaNeural', name: 'Aria (Clear, Professional Female)', category: 'Azure Neural' },
      { id: 'en-GB-RyanNeural', name: 'Ryan (British Natural Male)', category: 'Azure Neural' },
      { id: 'en-GB-SoniaNeural', name: 'Sonia (British Natural Female)', category: 'Azure Neural' },
    ];
  }
}
