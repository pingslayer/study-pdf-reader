import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { TTSService } from './ttsService.js';
import { EdgeTTSService } from './edgeTtsService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const elevenLabsService = new TTSService();
const edgeTtsService = new EdgeTTSService();

import libraryRoutes from './libraryRoutes.js';
import bookmarkRoutes from './bookmarkRoutes.js';

app.use('/api/library', libraryRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Default provider: Edge Neural TTS (Free, high-quality, unlimited with word timestamps)
let activeProvider: 'edge' | 'elevenlabs' = 'edge';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    active_provider: activeProvider,
    elevenlabs_configured: elevenLabsService.hasApiKey(),
    timestamp: new Date().toISOString(),
  });
});

// Switch active TTS provider
app.post('/api/config/provider', (req, res) => {
  const { provider } = req.body;
  if (provider === 'elevenlabs' || provider === 'edge') {
    activeProvider = provider;
    res.json({ success: true, active_provider: activeProvider });
  } else {
    res.status(400).json({ error: 'Provider must be "edge" or "elevenlabs"' });
  }
});

// Configure ElevenLabs API Key dynamically (kept for future use)
app.post('/api/config/elevenlabs', async (req, res) => {
  try {
    const { apiKey, voiceId } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      res.status(400).json({ error: 'Valid apiKey string is required' });
      return;
    }

    elevenLabsService.setApiKey(apiKey, voiceId);

    // Save to server/.env so it persists across restarts
    const envPath = path.resolve(process.cwd(), 'server/.env');
    const envContent = `ELEVENLABS_API_KEY=${apiKey.trim()}\nELEVENLABS_VOICE_ID=${voiceId ? voiceId.trim() : 'JBFqnCBsd6RMkjVDRZzb'}\nPORT=3001\n`;
    try {
      fs.writeFileSync(envPath, envContent, 'utf-8');
    } catch (fsErr) {
      console.warn('Could not write .env file, continuing in-memory:', fsErr);
    }

    res.json({
      success: true,
      message: 'ElevenLabs API key configured successfully',
      elevenlabs_configured: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to configure ElevenLabs API key' });
  }
});

// Voices list endpoint
app.get('/api/voices', async (req, res) => {
  const requestedProvider = (req.query.provider as string) || activeProvider;

  if (requestedProvider === 'elevenlabs') {
    const defaultVoices = [
      { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George - Storyteller (premade)', category: 'ElevenLabs' },
      { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger - Laid-Back (premade)', category: 'ElevenLabs' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah - Confident (premade)', category: 'ElevenLabs' },
      { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice - Educator (premade)', category: 'ElevenLabs' },
    ];

    if (!elevenLabsService.hasApiKey()) {
      return res.json({ voices: defaultVoices, provider: 'elevenlabs', hasCustomApiKey: false });
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': elevenLabsService.getApiKey(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const voices = (data.voices || []).map((v: any) => ({
          id: v.voice_id,
          name: `${v.name} (${v.category || 'voice'})`,
          category: 'ElevenLabs',
        }));
        return res.json({ voices, provider: 'elevenlabs', hasCustomApiKey: true });
      }
    } catch (err) {
      console.warn('Failed to fetch custom voices from ElevenLabs API, returning defaults:', err);
    }

    return res.json({ voices: defaultVoices, provider: 'elevenlabs', hasCustomApiKey: true });
  }

  // Default: Microsoft Edge Neural Voices (Free & Unlimited)
  const edgeVoices = await edgeTtsService.getVoices();
  res.json({ voices: edgeVoices, provider: 'edge' });
});

// TTS generation endpoint
app.post('/api/tts', async (req, res) => {
  const { text, voiceId, provider } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text parameter is required.' });
  }

  const chosenProvider = provider || activeProvider;

  try {
    if (chosenProvider === 'elevenlabs') {
      const result = await elevenLabsService.generateSpeech(text.trim(), voiceId);
      res.json(result);
    } else {
      // Free Microsoft Edge Neural TTS with exact word-boundary timestamps
      const result = await edgeTtsService.generateSpeech(text.trim(), voiceId);
      res.json(result);
    }
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
});

app.listen(port, () => {
  console.log(`StudyPDF Reader Server listening on http://localhost:${port}`);
  console.log(`Active TTS Provider: ${activeProvider.toUpperCase()} (Neural with Word Timestamps)`);
  console.log(`ElevenLabs Key Configured: ${elevenLabsService.hasApiKey() ? 'YES (standby)' : 'NO'}`);
});
