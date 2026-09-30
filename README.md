# StudyPDF Reader

A study-focused technical PDF reader built for textbooks such as **Operating Systems: Three Easy Pieces (OSTEP)**.

Unlike conventional readers that extract text into a plain HTML transcription, **StudyPDF Reader renders the authentic, untouched PDF page and places an interactive highlight layer directly over the original document's coordinates**.

---

## Features (Phase 1 & Phase 2 Implemented)

1. **Original PDF Document Rendering**
   - High-resolution rendering using PDF.js onto an HTML5 Canvas with device-pixel-ratio sharpness.
   - Zoom in/out, Fit to Width, Fit to Page, and window resize synchronization.

2. **Precise Layout & Coordinate Extraction**
   - Extracts every text item with baseline coordinates, font sizes, line heights, and typography attributes.
   - Normalizes coordinates to top-left browser canvas space for 1:1 pixel overlay alignment.

3. **Intelligent Layout & Reading-Order Detection**
   - **Headings**: Detected via font scale ratios and section number patterns (`Chapter 4`, `4.1 ...`).
   - **Prose Paragraphs**: Segmented using line spacing and baseline analysis.
   - **Code Blocks**: Detected using monospace font family analysis, indentation structure, and C/Python/JS syntax matching.
   - **Figures & Captions**: Distinguishes visual figures and anchors narration to captions (`Figure 4.1: ...`).
   - **Mathematical Equations**: Detects standalone formula blocks and labels (`(Equation 4.1)`), separating them from prose.
   - **Running Headers & Footers**: Identifies repetitive running book titles, chapter headers, and page numbers.

4. **Visual Inspector Mode**
   - Toggleable inspector overlay displaying color-coded bounding boxes and badges (`Heading`, `Prose`, `Code`, `Caption`, `Equation`, `Header/Footer`) on the original PDF.

5. **Study Controls & Filtering**
   - Skip running headers/footers (Default: **ON**).
   - Skip standalone page numbers (Default: **ON**).
   - Pause at figures & diagrams (Default: **ON**).
   - Pause at code examples (Default: **ON**).
   - Read figure captions (Default: **ON**).
   - Read equations (Default: **OFF**).
   - "Read code literally" mode for spoken programming syntax narration.

6. **Word-Level Highlighting & Audio Narration**
   - Node.js backend with ElevenLabs integration (`POST /api/tts` with word-level timestamps).
   - Client-side token mapper with hyphenation handling, punctuation normalization, and auto-scrolling synchronization.
   - Seamless simulated TTS fallback for offline or development mode without an API key.

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration (Optional for Live ElevenLabs Voice)

Copy `.env.example` to `.env` in the `server/` directory:

```bash
cp .env.example server/.env
```

Add your ElevenLabs API Key:

```env
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
PORT=3001
```

*(If no key is configured, the application automatically runs in high-fidelity simulated speech mode so you can test all highlighting and layout capabilities immediately.)*

### 3. Start Development Server

```bash
npm run dev
```

* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:3001`

---

## Acceptance Test

The application includes a built-in 4-page OSTEP sample chapter (`OSTEP_Chapter4_Processes.pdf`) containing:
1. Normal prose, chapter headings, running headers, and page numbers.
2. C code snippet using `fork()` with monospace font and pre-formatted block structure.
3. Vector state diagram with caption: `Figure 4.1: Simplified Process State Transitions`.
4. Mathematical scheduling formulas: `T_turnaround` (Equation 4.1) and Jain's Fairness Index (Equation 4.2).

You can also click **Upload PDF** in the top navigation bar to study any custom PDF document.
