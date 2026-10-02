import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';

describe('Library & Bookmarks Database (Unit Tests)', () => {
  let db: Database.Database;

  before(() => {
    // Use an in-memory database for testing
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        last_read_page INTEGER DEFAULT 1,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE bookmarks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
      );
    `);
  });

  after(() => {
    db.close();
  });

  it('inserts a new document and retrieves it', () => {
    const insert = db.prepare('INSERT INTO documents (id, filename, original_name) VALUES (?, ?, ?)');
    insert.run('doc-1', '123.pdf', 'test.pdf');

    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get('doc-1') as any;
    assert.strictEqual(row.id, 'doc-1');
    assert.strictEqual(row.filename, '123.pdf');
    assert.strictEqual(row.original_name, 'test.pdf');
    assert.strictEqual(row.last_read_page, 1);
  });

  it('updates the last_read_page for a document', () => {
    const update = db.prepare('UPDATE documents SET last_read_page = ? WHERE id = ?');
    update.run(42, 'doc-1');

    const row = db.prepare('SELECT last_read_page FROM documents WHERE id = ?').get('doc-1') as any;
    assert.strictEqual(row.last_read_page, 42);
  });

  it('inserts a bookmark for a document and retrieves it', () => {
    const insert = db.prepare('INSERT INTO bookmarks (id, document_id, page_number, title) VALUES (?, ?, ?, ?)');
    insert.run('bm-1', 'doc-1', 42, 'Important Diagram');

    const rows = db.prepare('SELECT * FROM bookmarks WHERE document_id = ?').all('doc-1') as any[];
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].id, 'bm-1');
    assert.strictEqual(rows[0].page_number, 42);
    assert.strictEqual(rows[0].title, 'Important Diagram');
  });

  it('deletes a bookmark', () => {
    const del = db.prepare('DELETE FROM bookmarks WHERE id = ?');
    del.run('bm-1');

    const rows = db.prepare('SELECT * FROM bookmarks WHERE document_id = ?').all('doc-1') as any[];
    assert.strictEqual(rows.length, 0);
  });

  it('cascades deletion of a document to its bookmarks', () => {
    // Insert another bookmark
    const insertBm = db.prepare('INSERT INTO bookmarks (id, document_id, page_number) VALUES (?, ?, ?)');
    insertBm.run('bm-2', 'doc-1', 10);

    // Delete the document
    // SQLite requires PRAGMA foreign_keys = ON; for cascading deletes in memory, so we enable it first
    db.pragma('foreign_keys = ON');
    
    const delDoc = db.prepare('DELETE FROM documents WHERE id = ?');
    delDoc.run('doc-1');

    const docRow = db.prepare('SELECT * FROM documents WHERE id = ?').get('doc-1');
    assert.strictEqual(docRow, undefined);

    const bmRow = db.prepare('SELECT * FROM bookmarks WHERE document_id = ?').get('doc-1');
    assert.strictEqual(bmRow, undefined); // Should be cascade deleted
  });
});
