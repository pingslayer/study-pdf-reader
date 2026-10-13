import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Document,
  getCleanDocTitle,
  formatBytes,
  formatDate,
  calculateLibraryStats,
  filterAndSortDocuments,
} from '../Library/libraryUtils.js';

describe('Library Utilities & Search/Sort Engine (Unit Tests)', () => {
  const sampleDocs: Document[] = [
    {
      id: 'doc-1',
      filename: 'uuid-1.pdf',
      original_name: 'Operating Systems: Three Easy Pieces.pdf',
      last_read_page: 45,
      uploaded_at: '2026-10-01 10:00:00',
      file_size: 2048000,
    },
    {
      id: 'doc-2',
      filename: 'uuid-2.pdf',
      original_name: 'Algorithms and Data Structures.pdf',
      last_read_page: 1,
      uploaded_at: '2026-10-05 12:00:00',
      file_size: 512000,
    },
    {
      id: 'doc-3',
      filename: 'uuid-3.pdf',
      original_name: 'Computer Networks - Top Down Approach.PDF',
      last_read_page: 12,
      uploaded_at: '2026-10-08 09:30:00',
      file_size: 1048576,
    },
  ];

  describe('getCleanDocTitle', () => {
    it('strips .pdf extension case-insensitively', () => {
      assert.strictEqual(getCleanDocTitle('Chapter 1.pdf'), 'Chapter 1');
      assert.strictEqual(getCleanDocTitle('Network.PDF'), 'Network');
      assert.strictEqual(getCleanDocTitle('Notes.Pdf'), 'Notes');
    });

    it('handles files without extensions or empty names', () => {
      assert.strictEqual(getCleanDocTitle('Research Paper'), 'Research Paper');
      assert.strictEqual(getCleanDocTitle(''), 'Untitled Document');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes into KB and MB cleanly', () => {
      assert.strictEqual(formatBytes(0), '—');
      assert.strictEqual(formatBytes(1024), '1.0 KB');
      assert.strictEqual(formatBytes(1048576), '1.0 MB');
      assert.strictEqual(formatBytes(5242880), '5.0 MB');
    });
  });

  describe('formatDate', () => {
    it('formats SQLite timestamp into localized string', () => {
      const formatted = formatDate('2026-10-01 10:00:00');
      assert.ok(formatted.includes('2026'), 'Expected year 2026 in formatted date');
      assert.ok(formatted.includes('Oct'), 'Expected Oct in formatted date');
    });
  });

  describe('calculateLibraryStats', () => {
    it('accurately computes summary metrics', () => {
      const stats = calculateLibraryStats(sampleDocs);
      assert.strictEqual(stats.totalDocs, 3);
      assert.strictEqual(stats.inProgressDocs, 2); // doc-1 (page 45) & doc-3 (page 12)
      assert.strictEqual(stats.unreadDocs, 1); // doc-2 (page 1)
      assert.strictEqual(stats.totalPagesRead, 45 + 1 + 12);
      assert.strictEqual(stats.totalSizeBytes, 2048000 + 512000 + 1048576);
    });
  });

  describe('filterAndSortDocuments', () => {
    it('filters documents by search query', () => {
      const result = filterAndSortDocuments(sampleDocs, 'network', 'all', 'uploaded_at', 'desc');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'doc-3');
    });

    it('filters documents by status in_progress', () => {
      const result = filterAndSortDocuments(sampleDocs, '', 'in_progress', 'uploaded_at', 'desc');
      assert.strictEqual(result.length, 2);
      assert.ok(result.every((d) => d.last_read_page > 1));
    });

    it('filters documents by status unread', () => {
      const result = filterAndSortDocuments(sampleDocs, '', 'unread', 'uploaded_at', 'desc');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'doc-2');
    });

    it('sorts alphabetically by title (asc and desc)', () => {
      const asc = filterAndSortDocuments(sampleDocs, '', 'all', 'original_name', 'asc');
      assert.strictEqual(asc[0].id, 'doc-2'); // Algorithms...
      assert.strictEqual(asc[1].id, 'doc-3'); // Computer Networks...
      assert.strictEqual(asc[2].id, 'doc-1'); // Operating Systems...

      const desc = filterAndSortDocuments(sampleDocs, '', 'all', 'original_name', 'desc');
      assert.strictEqual(desc[0].id, 'doc-1');
      assert.strictEqual(desc[2].id, 'doc-2');
    });

    it('sorts by reading progress (last_read_page)', () => {
      const desc = filterAndSortDocuments(sampleDocs, '', 'all', 'last_read_page', 'desc');
      assert.strictEqual(desc[0].last_read_page, 45);
      assert.strictEqual(desc[1].last_read_page, 12);
      assert.strictEqual(desc[2].last_read_page, 1);
    });

    it('sorts by file size', () => {
      const asc = filterAndSortDocuments(sampleDocs, '', 'all', 'file_size', 'asc');
      assert.strictEqual(asc[0].id, 'doc-2'); // 512KB
      assert.strictEqual(asc[2].id, 'doc-1'); // 2MB
    });

    it('combines search and sorting correctly', () => {
      const result = filterAndSortDocuments(sampleDocs, 'system', 'all', 'original_name', 'asc');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'doc-1');
    });
  });
});
