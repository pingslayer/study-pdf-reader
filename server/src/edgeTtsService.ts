import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { WordAlignment, TTSResponse } from './ttsService.js';

function sanitizeForTTS(text: string): string {
  return text
    // Convert math & diagram arrows to natural speech
    .replace(/->/g, ' to ')
    .replace(/<-/g, ' from ')
    .replace(/<=>/g, ' equivalent to ')
    .replace(/=>/g, ' implies ')
    .replace(/!=/g, ' not equal to ')
    // Escape XML entities for SSML parser safety without deleting text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Strip non-printable control chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class EdgeTTSService {
  private defaultVoice: string = 'en-US-GuyNeural';

  public async generateSpeech(text: string, voiceId?: string): Promise<TTSResponse> {
    const selectedVoice = voiceId && voiceId.includes('Neural') ? voiceId : this.defaultVoice;

    // Normalize line breaks → spaces so the TTS engine does not insert pauses
    // at PDF line-break positions that aren't sentence boundaries.
    const normalizedText = text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();

    // If block contains no alphanumeric characters (e.g. empty diagram spacer, pure symbols),
    // skip speech generation cleanly without calling TTS engine
    if (!/[a-zA-Z0-9]/.test(normalizedText)) {
      return {
        audioUrl: '',
        alignment: [],
        duration: 0.1,
      };
    }

    // Sanitize symbols and XML-sensitive characters (&, <, >, ->, <-) so Microsoft Edge's
    // SSML parser never crashes with a malformed XML / unexpected stream termination error.
    const speechText = sanitizeForTTS(normalizedText);

    const tts = new MsEdgeTTS();

    try {
      await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
        wordBoundaryEnabled: true,
      });

      const { audioStream, metadataStream } = tts.toStream(speechText);
      const audioChunks: Buffer[] = [];
      const alignment: WordAlignment[] = [];
      let runningCharOffset = 0;

      audioStream.on('data', (chunk: Buffer) => {
        audioChunks.push(chunk);
      });

      if (metadataStream) {
        metadataStream.on('data', (chunk: Buffer) => {
          try {
            const raw = JSON.parse(chunk.toString());
            if (raw.Metadata) {
              for (const item of raw.Metadata) {
                if (item.Type === 'WordBoundary' && item.Data) {
                  let word = item.Data.text.Text;
                  if (word === '&amp;') word = '&';
                  else if (word === '&lt;') word = '<';
                  else if (word === '&gt;') word = '>';

                  // 1 tick = 100 nanoseconds -> 10,000,000 ticks = 1 second
                  const start = item.Data.Offset / 10000000;
                  const end = (item.Data.Offset + item.Data.Duration) / 10000000;

                  // Find word offset in original text for visual token matching
                  const foundIdx = normalizedText.indexOf(word, runningCharOffset);
                  const charStart = foundIdx >= 0 ? foundIdx : runningCharOffset;
                  runningCharOffset = charStart + word.length;

                  alignment.push({
                    word,
                    start: parseFloat(start.toFixed(3)),
                    end: parseFloat(end.toFixed(3)),
                    charStart,
                  });
                }
              }
            }
          } catch (err) {
            // Ignore partial JSON
          }
        });
      }

      await new Promise<void>((resolve, reject) => {
        audioStream.on('end', () => resolve());
        audioStream.on('error', (err) => reject(err));
      });

      const audioBuffer = Buffer.concat(audioChunks);
      const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
      const duration = alignment.length > 0 ? alignment[alignment.length - 1].end : 1.0;

      return {
        audioUrl,
        alignment,
        duration,
      };
    } catch (err: any) {
      console.warn('Edge TTS synthesis warning (skipping gracefully):', err.message);
      // Return empty audio response so the reading flow advances without popping up an alert
      return {
        audioUrl: '',
        alignment: [],
        duration: 0.2,
      };
    } finally {
      try {
        tts.close();
      } catch {}
    }
  }

  public async getVoices(): Promise<Array<{ id: string; name: string; category: string }>> {
    return [
      { id: 'en-US-GuyNeural', name: 'Guy (Natural, Expressive Male)', category: 'Neural (Free)' },
      { id: 'en-US-JennyNeural', name: 'Jenny (Natural, Friendly Female)', category: 'Neural (Free)' },
      { id: 'en-US-ChristopherNeural', name: 'Christopher (Deep, Academic Male)', category: 'Neural (Free)' },
      { id: 'en-US-AriaNeural', name: 'Aria (Clear, Professional Female)', category: 'Neural (Free)' },
      { id: 'en-US-EricNeural', name: 'Eric (Conversational Male)', category: 'Neural (Free)' },
      { id: 'en-GB-RyanNeural', name: 'Ryan (British Natural Male)', category: 'Neural (Free)' },
      { id: 'en-GB-SoniaNeural', name: 'Sonia (British Natural Female)', category: 'Neural (Free)' },
    ];
  }
}
