import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import path from 'path';
import { AzureSpeechService } from '../azureSpeechService.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

describe('Azure Speech Service (Unit Tests)', () => {
  const service = new AzureSpeechService();

  it('detects configured credentials correctly', () => {
    assert.equal(service.hasConfig(), true);
  });

  it('returns a list of available high-quality neural voices', async () => {
    const voices = await service.getVoices();
    assert.ok(Array.isArray(voices));
    assert.ok(voices.length >= 5);
    assert.ok(voices.some(v => v.id.includes('Ava')));
  });

  it('bypasses remote TTS for blocks with no alphanumeric characters', async () => {
    const result = await service.generateSpeech('--- ---');
    assert.equal(result.audioUrl, '');
    assert.deepEqual(result.alignment, []);
    assert.equal(result.duration, 0.1);
  });

  it('bypasses remote TTS for pure punctuation or spaces', async () => {
    const result = await service.generateSpeech('   ...   ');
    assert.equal(result.audioUrl, '');
    assert.deepEqual(result.alignment, []);
    assert.equal(result.duration, 0.1);
  });
});
