import express from 'express';
import crypto from 'crypto';
import db from './db.js';

const router = express.Router();

router.get('/:documentId', (req, res) => {
  try {
    const bookmarks = db.prepare('SELECT * FROM bookmarks WHERE document_id = ? ORDER BY page_number ASC').all(req.params.documentId);
    res.json(bookmarks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:documentId', (req, res) => {
  try {
    const { page_number, title } = req.body;
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO bookmarks (id, document_id, page_number, title) VALUES (?, ?, ?, ?)').run(id, req.params.documentId, page_number, title || null);
    
    const bookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id);
    res.json(bookmark);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
