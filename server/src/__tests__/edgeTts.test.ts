import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeForTTS, EdgeTTSService } from '../edgeTtsService.js';

describe('Edge Neural TTS & SSML Sanitizer (Unit Tests)', () => {
  describe('sanitizeForTTS', () => {
    it('escapes sensitive XML characters for safe SSML generation', () => {
      assert.equal(sanitizeForTTS('#include <stdio.h>'), '#include &lt;stdio.h&gt;');
      assert.equal(sanitizeForTTS('Processes & Threads'), 'Processes &amp; Threads');
      assert.equal(sanitizeForTTS('if (x > y)'), 'if (x &gt; y)');
    });

    it('translates diagram arrows into natural spoken words', () => {
      assert.equal(sanitizeForTTS('READY -> RUNNING'), 'READY to RUNNING');
      assert.equal(sanitizeForTTS('RUNNING <- BLOCKED'), 'RUNNING from BLOCKED');
      assert.equal(sanitizeForTTS('A <=> B'), 'A equivalent to B');
      assert.equal(sanitizeForTTS('A => B'), 'A implies B');
    });

    it('translates programming inequality symbols to spoken English', () => {
      assert.equal(sanitizeForTTS('if (argc != 2)'), 'if (argc not equal to 2)');
    });

    it('strips non-printable ASCII control characters without corrupting text', () => {
      const dirty = 'Process\x00\x08Memory\x1FData';
      assert.equal(sanitizeForTTS(dirty), 'Process Memory Data');
    });

    it('normalizes multi-line spaces into single spaces', () => {
      const multiline = 'First line\n   Second line\n\n\nThird line';
      assert.equal(sanitizeForTTS(multiline), 'First line Second line Third line');
    });
  });

  describe('EdgeTTSService empty and symbol block bypass', () => {
    const service = new EdgeTTSService();

    it('bypasses remote TTS for blocks with no alphanumeric characters', async () => {
      const result = await service.generateSpeech('--- ---');
      assert.equal(result.audioUrl, '');
      assert.deepEqual(result.alignment, []);
      assert.equal(result.duration, 0.1);
    });

    it('bypasses remote TTS for empty strings or pure punctuation', async () => {
      const result = await service.generateSpeech('   ...   ');
      assert.equal(result.audioUrl, '');
      assert.deepEqual(result.alignment, []);
      assert.equal(result.duration, 0.1);
    });
  });
});
