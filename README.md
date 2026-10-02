# StudyPDF Reader

> **An elegant, dark-mode technical PDF reader with real-time synchronized word-level TTS narration.**  
> Built specifically for academic textbooks, research papers, and technical books containing complex layouts, code snippets, equations, figures, and running headers.

Unlike typical text-to-speech tools that strip away layout and dump text into a generic HTML transcript, **StudyPDF Reader renders the authentic, untouched PDF page and projects an interactive highlight layer directly onto the original document coordinates in real-time**.

---

## Key Highlights

- **Unobstructed Adobe Acrobat Dark-Mode Aesthetic**: Zero headers, zero footers, and no floating pills overlaying your text. The PDF viewing viewport spans 100% of the vertical screen height for focused, distraction-free reading.
- **Persistent Library & Reading Progress**: Upload PDFs directly to a local dashboard. The app securely stores them on your machine using SQLite and automatically remembers the exact page you last read so you can resume instantly.
- **Explicit Bookmarking System**: Save important references, diagrams, and code snippets across your reading. Quickly jump back to key concepts via the unified sidebar tab, independent of your active reading progress.
- **Word-Level Synchronized TTS Highlighting**: Words on the PDF canvas light up in real-time in exact lockstep with spoken audio using sub-millisecond audio timestamps.
- **Free Edge Neural TTS Out-of-the-Box**: Powered by Microsoft Edge Neural voices (no API keys, subscriptions, or credit cards required), with optional ElevenLabs integration for custom cloned voices.
- **Academic & Technical Layout Intelligence**:
  - **C / Monospace Code Listings**: Accurately distinguished from prose; reads either literally word-by-word with code highlights or summarized as code references.
  - **Running Headers & Footers**: Automatically identifies and filters out repetitive book titles, chapter banners, and page numbers so narration flows uninterrupted.
  - **Paragraph Segmentation**: Distinguishes distinct prose paragraphs using indentation and line-spacing heuristics rather than arbitrarily grouping whole pages.
  - **Figures, Captions & Math**: Detects captions (`Figure 2.1: ...`) and standalone equation blocks.
- **All-in-One Control Sidebar**: Consolidated controls including Play/Pause hero, speed pills (`0.8x` to `2.0x`), neural voice selector, volume, page navigation, zoom with **Fit to Width** & **Fit to Page**, block outline navigator, and page thumbnails.
- **Collapsible Rail Mode**: Collapse the sidebar to a slim 56px icon rail anytime you want maximum horizontal canvas space.
- **Discreet Document Title Tag**: Small, unobtrusive browser hyperlink-style badge pinned to the bottom-right corner showing `filename • Page X of Y`.

---

## Architecture Overview

```
StudyPDF_Reader/
├── client/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── PDFViewer/      # PDF.js Canvas + Synchronized Highlight Layer
│   │   │   ├── Sidebar.tsx     # Unified Playback & Navigation Control Hub
│   │   │   ├── Library.tsx     # Dashboard for uploaded PDFs and reading progress
│   │   │   └── Controls/       # Study Settings & API Modals
│   │   ├── services/
│   │   │   ├── layoutAnalysis.ts # Heading, Code, Paragraph, Header/Footer heuristics
│   │   │   ├── textMapping.ts    # Audio timestamp to PDF bounding-box mapping
│   │   │   ├── pdfService.ts     # PDF.js document loader & page renderer
│   │   │   └── ttsClient.ts      # Web Audio API streaming & alignment player
│   │   └── types/pdf.ts          # Core geometry and block data models
│   └── package.json
├── server/                     # Node.js + Express + SQLite + TypeScript
│   ├── src/
│   │   ├── tts/
│   │   │   ├── edgeTTS.ts      # Microsoft Edge Neural TTS with SSML word timestamps
│   │   │   └── elevenlabs.ts   # ElevenLabs Streaming API with alignment
│   │   ├── db.ts               # SQLite Database initialization
│   │   ├── libraryRoutes.ts    # API for uploads and document progress
│   │   ├── bookmarkRoutes.ts   # API for managing document bookmarks
│   │   └── index.ts            # REST API endpoints
│   ├── uploads/                # Local persistent PDF file storage
│   ├── db/                     # SQLite database (library.db)
│   └── package.json
└── package.json                # Root workspace orchestration (concurrently)
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 1. Installation

Clone the repository and install all workspace dependencies from the root directory:

```bash
git clone https://github.com/your-username/StudyPDF_Reader.git
cd StudyPDF_Reader
npm install
```

### 2. Running in Development Mode

You only need **a single command** to start both the backend API and frontend dev server:

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

### 3. Optional: ElevenLabs Integration

By default, the app uses **Microsoft Edge Neural TTS**, which works instantly with high naturalness and zero configuration.

If you also wish to use ElevenLabs:
1. Copy `.env.example` in `server/`:
   ```bash
   cp server/.env.example server/.env
   ```
2. Add your API key and preferred Voice ID:
   ```env
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
   PORT=3001
   ```
3. Alternatively, click the **Settings** icon inside the app to configure your API key at runtime.

---

## How to Use

1. **The Library Dashboard**:
   - The app boots into your local **Library**, showing all previously uploaded PDFs and your reading progress.
   - Click the **Upload** button to add a new PDF from your local machine.
   - Click on any book in your grid to instantly jump back to exactly where you left off.

2. **Playback & Narration**:
   - Click **Play** in the sidebar (or press `Spacebar`) to begin continuous narration from the current block.
   - Click directly on any paragraph, code listing, or heading on the PDF to jump playback immediately to that block.
   - Use **Prev / Next Block** to skip between sections.

3. **Code Reading Mode ("Literal Code" vs. "Summarized")**:
   - **Literal Code (`ON`)**: Reads code blocks keyword-by-keyword, syntax-by-syntax (`#include`, `int main(...)`, `while (1)`, `printf(...)`) with word-by-word visual highlights.
   - **Summarized (`OFF`)**: Acknowledges code snippets briefly (e.g. *"Code example. C code."*) and moves straight to the explanation text. Ideal for listening like an audiobook.

4. **Zoom & Page Navigation**:
   - Use `+` and `-` to scale the page, or click **Fit to Width** / **Fit to Page** for instant responsive alignment.
   - Step through pages with `<` and `>`, or click the **Pages** tab in the sidebar to pick from page thumbnails.

5. **Study Settings & Filtering**:
   - Click the **Settings** gear icon in the sidebar to toggle:
     - Skip running headers & footers (Default: `ON`)
     - Skip standalone page numbers (Default: `ON`)
     - Read figure captions (Default: `ON`)
     - Pause at headings / code / figures (Default: `OFF` for continuous reading)

6. **Bookmarks**:
   - Click the **Bookmark** icon at the top of the sidebar to save the current page for reference.
   - Switch to the **Bookmarks** tab in the sidebar to view all saved references and instantly jump back to critical diagrams or concepts without losing your place.

7. **Keyboard Shortcuts**:
   - `Space`: Play / Pause narration.
   - `Arrow Left`: Navigate to previous page.
   - `Arrow Right`: Navigate to next page.
   - `i`: Toggle Layout Inspector overlay (shows bounding boxes & classification labels).

---

## Production Build

To test or generate a production build:

```bash
npm run build
```

This compiles both the server TypeScript and the client Vite bundle into optimized static distribution assets with zero type errors.

---

## Automated Testing Suite

The repository includes a comprehensive, professional-grade test suite covering layout analysis, study settings filtering, token alignment synchronization, and SSML sanitization:

```bash
npm run test
```

- **Study Settings Filter Tests** (`studySettings.test.ts`): Proves complete independence of all 10 study settings toggles (page numbers, headers, footers, code skipping, captions, equations).
- **Layout Engine Tests** (`layoutAnalysis.test.ts`): Validates heading detection, C program parsing, caption distinguishing vs. prose, and diagram arrows.
- **Word-Level Highlighting Tests** (`textMapping.test.ts`): Validates priority matching, hyphenation resolution, and 1-to-1 SSML token alignment.
- **Backend SSML Tests** (`edgeTts.test.ts`): Validates XML entity safety, mathematical arrow conversion, and empty/symbol block handling.

---

## License

MIT License. Designed and built for students, researchers, and technical readers everywhere.
