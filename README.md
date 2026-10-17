# StudyPDF Reader

> **An elegant, dark-mode technical PDF reader with real-time synchronized word-level TTS narration.**  
> Built specifically for academic textbooks, research papers, and technical books containing complex layouts, code snippets, equations, figures, and running headers.

Unlike typical text-to-speech tools that strip away layout and dump text into a generic HTML transcript, **StudyPDF Reader renders the authentic, untouched PDF page and projects an interactive highlight layer directly onto the original document coordinates in real-time**.

---

## Key Highlights

- **Unobstructed Professional Dark-Mode Aesthetic**: Zero cluttering banners, zero footers, and no floating pills overlaying your text. The PDF viewing viewport spans 100% of the vertical screen height for focused, distraction-free reading.
- **Professional Library Dashboard**:
  - **Instant Real-Time Search**: Search through your books and documents instantly with search term highlighting and a `/` quick-focus shortcut.
  - **Multi-Criteria Sorting**: Sort documents by Date Added, Title (A–Z / Z–A), Reading Progress, or File Size with an Ascending/Descending direction toggle.
  - **Status Filter Tabs**: Filter between *All*, *In Progress*, and *Unread* with live count indicators.
  - **Dual View Modes (List & Grid)**: Opens in a streamlined, sortable List/Table view by default, with a one-click toggle to visual Grid Cards (persisted across sessions).
  - **Drag-and-Drop Uploading**: Drag and drop any PDF anywhere onto the window to upload directly to your library.
  - **Document Renaming & Modal Safeguards**: Rename document titles inline (`PATCH /api/library/:id`) and delete with accessible confirmation dialogs.
- **Persistent Reading Progress & Bookmarks**: Automatically tracks the exact page you last read so you can resume where you left off. Save key references and diagrams into an explicit Bookmarks tab.
- **Word-Level Synchronized TTS Highlighting**: Words on the PDF canvas light up in real-time in exact lockstep with spoken audio using sub-millisecond audio timestamps.
- **Robust Playback Engine & Spam Protection**: Hardened against rapid user interactions (Prev/Next spam, pause during buffer) using monotonic playback generation tickets (`playbackEpochRef`), debounced buffering indicators, and clean prefetch cache isolation.
- **Network Resilience & Circuit Breaker**: Gracefully handles network disconnects and offline mode with a non-intrusive error banner and one-click Retry button instead of silent skipping loops.
- **Free Edge Neural & Official Azure Speech Out-of-the-Box**: Powered by high-fidelity neural voices with sub-millisecond word boundaries. Supports **Microsoft Azure Speech Service** (via official SDK with sub-second latency and zero rate-limiting) and **Microsoft Edge Neural voices**, with optional **ElevenLabs** integration for cloned voices.
- **Academic & Technical Layout Intelligence**:
  - **LaTeX Small Caps & Multi-Item Word Coalescing**: Headings and titles in LaTeX documents (which PDF engines split into disparate glyph fragments like `[T]` and `[HE]`) are automatically coalesced into unified words with compound bounding boxes, preventing spelling out of titles.
  - **C / Monospace Code Listings**: Accurately distinguished from prose; reads either literally word-by-word with code highlights or summarized as code references. Preserves operators (`!=`, `->`, `<=`, etc.) with natural spoken translations.
  - **Running Headers & Footers**: Automatically identifies and filters out repetitive book titles, chapter banners, and page numbers so narration flows uninterrupted.
  - **Paragraph Segmentation**: Distinguishes distinct prose paragraphs using indentation and line-spacing heuristics rather than arbitrarily grouping whole pages.
  - **Figures, Captions & Math**: Detects captions (`Figure 2.1: ...`) and standalone equation blocks.
- **Canvas Rendering Stability & Fluid Scrolling**: Uses isolated per-page canvas rendering, dirty transformation matrix resets, and bundled local CMaps and standard font assets. Smooth independent scroll containers with custom dark theme scrollbars.
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
│   │   │   ├── Library.tsx     # Modern Library Dashboard (Search, Sort, List/Grid)
│   │   │   ├── Library/        # Library utilities, modals, and sorting engine
│   │   │   │   ├── libraryUtils.ts   # Search, sort, filter, and formatting logic
│   │   │   │   └── LibraryModals.tsx # Delete confirmation & rename modals
│   │   │   └── Controls/       # Study Settings & API Modals
│   │   ├── services/
│   │   │   ├── layoutAnalysis.ts # Heading, Code, Paragraph, Header/Footer heuristics
│   │   │   ├── textMapping.ts    # Small caps coalescing & word alignment mapping
│   │   │   ├── pdfService.ts     # PDF.js document loader & page renderer
│   │   │   └── ttsClient.ts      # Web Audio API streaming & alignment player
│   │   └── types/pdf.ts          # Core geometry and block data models
│   └── package.json
├── server/                     # Node.js + Express + SQLite + TypeScript
│   ├── src/
│   │   ├── azureSpeechService.ts # Microsoft Azure Speech SDK with WordBoundary events
│   │   ├── edgeTtsService.ts     # Microsoft Edge Neural TTS fallback
│   │   ├── ttsService.ts         # ElevenLabs Streaming API with alignment
│   │   ├── db.ts                 # SQLite Database initialization & schema migrations
│   │   ├── libraryRoutes.ts      # API for uploads, progress, renaming, and file sizes
│   │   ├── bookmarkRoutes.ts     # API for managing document bookmarks
│   │   └── index.ts              # REST API endpoints & voice discovery
│   ├── uploads/                  # Local persistent PDF file storage
│   ├── db/                       # SQLite database (library.db)
│   └── package.json
└── package.json                  # Root workspace orchestration (concurrently)
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 1. Installation

Clone the repository and install all workspace dependencies from the root directory:

```bash
git clone https://github.com/pingslayer/study-pdf-reader.git
cd study-pdf-reader
npm install
```

### 2. Speech Synthesis Configuration

The application supports three TTS engines:

1. **Microsoft Azure Speech Service (Recommended)**:
   Add your Azure Speech key and region to `server/.env`:
   ```env
   AZURE_SPEECH_KEY=your_azure_speech_key_here
   AZURE_SPEECH_REGION=centralindia
   PORT=3001
   ```
2. **Microsoft Edge Neural TTS (Free, Zero Configuration)**:
   Works out of the box with natural neural voices if no Azure credentials are provided.
3. **ElevenLabs (Optional Custom Voices)**:
   ```env
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
   ```

### 3. Running in Development Mode

Start both the backend API and frontend dev server with a single command:

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## How to Use

1. **The Library Dashboard**:
   - The app boots into the **Library Dashboard** in a clean, professional **List View** by default.
   - **Search & Sort**: Type in the search bar (press `/` to focus) to find documents in real time. Sort by date, title, progress, or file size with ascending/descending toggles.
   - **Filter Status**: Toggle between *All*, *In Progress*, and *Unread* filters.
   - **View Modes**: Switch seamlessly between the sortable List view and card-based Grid view via the toolbar buttons.
   - **Upload**: Click **Upload PDF** or drag and drop files anywhere onto the window.
   - **Document Actions**: Resume reading, rename document titles, or remove documents with confirmation dialogs.

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
   - Switch to the **Bookmarks** tab in the sidebar to view all saved references and jump back to critical diagrams or concepts without losing your place.

7. **Keyboard Shortcuts**:
   - `Space`: Play / Pause narration.
   - `Arrow Left`: Navigate to previous page.
   - `Arrow Right`: Navigate to next page.
   - `/`: Focus library search bar.
   - `Esc`: Clear search / close modals.
   - `i`: Toggle Layout Inspector overlay (shows bounding boxes & classification labels).

---

## Production Build

To build both client and server for production:

```bash
npm run build
```

This compiles both the server TypeScript and the client Vite bundle into optimized static distribution assets with zero type errors.

---

## Automated Testing Suite

The repository includes a comprehensive, 72-test automated suite covering layout analysis, study settings filtering, token alignment synchronization, small-caps coalescing, library utilities, database persistence, and Azure / Edge TTS synthesis:

```bash
npm run test
```

- **Azure Speech Service Tests** (`azureSpeech.test.ts`): Validates Azure SDK initialization, voice discovery, word boundary parsing, symbol sanitization without double-escaping, and empty block bypass.
- **Edge Neural TTS Tests** (`edgeTts.test.ts`): Validates SSML XML entity escaping, arrow and inequality conversions, and fallback handling.
- **Word-Level Highlighting & Alignment Tests** (`textMapping.test.ts`): Validates priority matching, hyphenation resolution, LaTeX small caps merging into compound tokens, and multi-item word alignment.
- **Library Utilities & Search/Sort Engine Tests** (`libraryUtils.test.ts`): Validates title cleaning, byte/date formatting, search substring matching, status filtering, and multi-field sorting.
- **Library & Bookmarks Database Tests** (`database.test.ts`): Validates document insertions, last-read page tracking, bookmark management, and cascade deletions.
- **Study Settings Filter Tests** (`studySettings.test.ts`): Proves complete independence of all 10 study settings toggles (page numbers, headers, footers, code skipping, captions, equations).
- **Layout Engine Tests** (`layoutAnalysis.test.ts`): Validates heading detection, C program parsing, caption distinguishing vs. prose, and diagram arrows.

---

## License

MIT License. Designed and built for students, researchers, and technical readers everywhere.
