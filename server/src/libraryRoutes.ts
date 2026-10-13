import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import db from './db.js';
import fs from 'fs';

const router = express.Router();

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, crypto.randomUUID() + ext);
  }
});
const upload = multer({ storage });

// Get all documents
router.get('/', (req, res) => {
  try {
    const docs = db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all() as any[];
    const enriched = docs.map((doc) => {
      let fileSize = doc.file_size;
      if (!fileSize || fileSize === 0) {
        try {
          const filePath = path.join(uploadDir, doc.filename);
          if (fs.existsSync(filePath)) {
            fileSize = fs.statSync(filePath).size;
          }
        } catch {}
      }
      return { ...doc, file_size: fileSize || 0 };
    });
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload document
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const id = crypto.randomUUID();
    const fileSize = req.file.size || 0;
    const stmt = db.prepare('INSERT INTO documents (id, filename, original_name, file_size) VALUES (?, ?, ?, ?)');
    stmt.run(id, req.file.filename, req.file.originalname, fileSize);
    
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    res.json({ ...doc, file_size: doc.file_size || fileSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rename document
router.patch('/:id', (req, res) => {
  try {
    const { original_name } = req.body;
    if (!original_name || typeof original_name !== 'string' || !original_name.trim()) {
      return res.status(400).json({ error: 'A valid document name is required' });
    }
    const cleanName = original_name.trim();
    const finalName = cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;
    const stmt = db.prepare('UPDATE documents SET original_name = ? WHERE id = ?');
    const result = stmt.run(finalName, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete document
router.delete('/:id', (req, res) => {
  try {
    const doc = db.prepare('SELECT filename FROM documents WHERE id = ?').get(req.params.id) as any;
    if (doc) {
      const filePath = path.join(uploadDir, doc.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get document file
router.get('/:id/file', (req, res) => {
  try {
    const doc = db.prepare('SELECT filename, original_name FROM documents WHERE id = ?').get(req.params.id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const filePath = path.join(uploadDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name)}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update progress
router.put('/:id/progress', (req, res) => {
  try {
    const { last_read_page } = req.body;
    db.prepare('UPDATE documents SET last_read_page = ? WHERE id = ?').run(last_read_page, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
