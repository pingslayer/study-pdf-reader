with open("README.md", "r") as f:
    content = f.read()

# Update Architecture
arch_new = """StudyPDF_Reader/
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
└── package.json                # Root workspace orchestration (concurrently)"""

content = content.replace("StudyPDF_Reader/\n├── client/", arch_new.split("\n├── client/")[0] + "\n├── client/")
content = content.replace("│   │   ├── components/\n│   │   │   ├── PDFViewer/", "│   │   ├── components/\n│   │   │   ├── PDFViewer/")
# Actually, I'll just do a simpler replacement of the whole code block.

import re
content = re.sub(r"```\nStudyPDF_Reader/[\s\S]*?```", "```\n" + arch_new + "\n```", content)

# Update Key Highlights
highlights = """- **Unobstructed Adobe Acrobat Dark-Mode Aesthetic**: Zero headers, zero footers, and no floating pills overlaying your text. The PDF viewing viewport spans 100% of the vertical screen height for focused, distraction-free reading.
- **Persistent Library & Reading Progress**: Upload PDFs directly to a local dashboard. The app securely stores them on your machine using SQLite and automatically remembers the exact page you last read so you can resume instantly.
- **Explicit Bookmarking System**: Save important references, diagrams, and code snippets across your reading. Quickly jump back to key concepts via the unified sidebar tab, independent of your active reading progress."""

content = content.replace("- **Unobstructed Adobe Acrobat Dark-Mode Aesthetic**: Zero headers, zero footers, and no floating pills overlaying your text. The PDF viewing viewport spans 100% of the vertical screen height for focused, distraction-free reading.", highlights)

# Update How to Use
how_to = """1. **The Library Dashboard**:
   - The app boots into your local **Library**, showing all previously uploaded PDFs and your reading progress.
   - Click the **Upload** button to add a new PDF from your local machine.
   - Click on any book in your grid to instantly jump back to exactly where you left off.

2. **Playback & Narration**:"""

content = content.replace("1. **Load a Document**:\n   - The app boots with a built-in sample chapter from *Operating Systems: Three Easy Pieces (OSTEP)* (`OSTEP_Chapter4_Processes.pdf`).\n   - Click the **Upload** button in the sidebar to open any PDF from your local machine.\n   - Click **Reset Sample** in the sidebar footer at any time to return to the sample textbook.\n\n2. **Playback & Narration**:", how_to)

bookmarks_info = """6. **Bookmarks**:
   - Click the **Bookmark** icon at the top of the sidebar to save the current page for reference.
   - Switch to the **Bookmarks** tab in the sidebar to view all saved references and instantly jump back to critical diagrams or concepts without losing your place.

7. **Keyboard Shortcuts**:"""

content = content.replace("6. **Keyboard Shortcuts**:", bookmarks_info)

with open("README.md", "w") as f:
    f.write(content)
