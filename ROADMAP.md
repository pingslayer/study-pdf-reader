# StudyPDF_Reader: Future Roadmap & Architectural Notes

## 1. Pre-roll Runway Buffering (Smooth Sailing on Short Headings)

### The Problem
When a user begins playback on a very short block (e.g., a 4–5 word heading or section label), the audio for that block only lasts ~1.5 to 2.0 seconds. Even though the next block (a full paragraph) begins downloading in parallel, Microsoft Edge TTS can take 2.0–2.5 seconds to synthesize and return that large body paragraph.
Because the heading audio finishes before the next paragraph's download completes, the user experiences a ~0.5–1.0s gap/silence between the heading and the opening paragraph, breaking their study flow.

### The Proposed Solution: "Pre-roll Initial Buffering"
Similar to how YouTube/Netflix buffers 2–3 seconds of video runway before releasing the first frame:

1. **Check Starting Runway:**
   When `playBlockNarration(block)` is called, calculate the starting block's word count:
   ```ts
   const isLowRunway = blockWords < TARGET_WORD_QUOTA; // e.g. < 35 words
   ```
2. **Hold Until Word Quota is Buffered:**
   - If `isLowRunway` is true, do not immediately start `ttsPlayer.playWithAlignment(firstBlockData)`.
   - Instead, allow the parallel download of the upcoming block(s) to resolve until the cumulative buffered runway reaches `TARGET_WORD_QUOTA` (or times out after a maximum safety ceiling of 2.5s).
   - Once the quota is satisfied, release audio playback for Block 1 immediately.
3. **The User Experience:**
   - On standard paragraphs (>35 words), playback starts immediately with zero delay.
   - On short headings (<35 words), a brief ~1.0–1.5s initial pre-roll buffer occurs before the very first word is spoken.
   - Once speech begins, every single subsequent block (Block 1 -> Block 2 -> Block 3) transitions with **0ms latency**, ensuring continuous, uninterrupted study flow without attention-breaking gaps.

---

## 2. Audio Pipeline Status & Current Providers

- **Active Default Provider:** Microsoft Edge Neural TTS (100% Free, Unlimited, Real-time Word Timestamp Alignment).
- **Default Voices:** `en-US-AvaMultilingualNeural` (Expressive, conversational female) and `en-US-AndrewMultilingualNeural` (Warm narrative male).
- **Prefetch Architecture:** Dynamic Word-Quota Adaptive Prefetcher ($\ge 35$ words runway, max 3 blocks sequential lookahead, idle page pre-warming).
- **Alternative Standby Providers:**
  - ElevenLabs (WebSocket streaming with API key standby).
  - Kokoro-82M (Explored on local CPU & Hugging Face ZeroGPU; CPU generation on dual-core Haswell is ~1.12x real-time; cloud ZeroGPU subject to 5-minute rolling quota).
