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
    const docs = db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all();
    res.json(docs);
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
    const stmt = db.prepare('INSERT INTO documents (id, filename, original_name) VALUES (?, ?, ?)');
    stmt.run(id, req.file.filename, req.file.originalname);
    
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
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
