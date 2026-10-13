export interface Document {
  id: string;
  filename: string;
  original_name: string;
  last_read_page: number;
  uploaded_at: string;
  file_size?: number;
  total_pages?: number;
}

export type SortField = 'uploaded_at' | 'original_name' | 'last_read_page' | 'file_size';
export type SortOrder = 'asc' | 'desc';
export type StatusFilter = 'all' | 'in_progress' | 'unread';
export type ViewMode = 'grid' | 'list';

export interface LibraryStats {
  totalDocs: number;
  inProgressDocs: number;
  unreadDocs: number;
  totalPagesRead: number;
  totalSizeBytes: number;
}

/**
 * Strips .pdf extension from filename for clean display
 */
export function getCleanDocTitle(originalName: string): string {
  if (!originalName) return 'Untitled Document';
  return originalName.replace(/\.pdf$/i, '').trim() || originalName;
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size < 10 && unitIndex > 0 ? size.toFixed(1) : Math.round(size)} ${units[unitIndex]}`;
}

/**
 * Formats date string into localized readable format
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString.replace(' ', 'T'));
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Computes high-level overview metrics across all library documents
 */
export function calculateLibraryStats(docs: Document[]): LibraryStats {
  let inProgressDocs = 0;
  let unreadDocs = 0;
  let totalPagesRead = 0;
  let totalSizeBytes = 0;

  for (const doc of docs) {
    const page = doc.last_read_page || 1;
    if (page > 1) {
      inProgressDocs++;
      totalPagesRead += page;
    } else {
      unreadDocs++;
      totalPagesRead += 1;
    }
    totalSizeBytes += doc.file_size || 0;
  }

  return {
    totalDocs: docs.length,
    inProgressDocs,
    unreadDocs,
    totalPagesRead,
    totalSizeBytes,
  };
}

/**
 * Filters and sorts documents based on search query, status filter, and sort order
 */
export function filterAndSortDocuments(
  docs: Document[],
  searchQuery: string,
  statusFilter: StatusFilter,
  sortField: SortField,
  sortOrder: SortOrder
): Document[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = docs.filter((doc) => {
    // 1. Search filter
    if (normalizedQuery) {
      const title = getCleanDocTitle(doc.original_name).toLowerCase();
      const filename = (doc.filename || '').toLowerCase();
      const rawName = (doc.original_name || '').toLowerCase();
      if (!title.includes(normalizedQuery) && !filename.includes(normalizedQuery) && !rawName.includes(normalizedQuery)) {
        return false;
      }
    }

    // 2. Status filter
    const page = doc.last_read_page || 1;
    if (statusFilter === 'in_progress') {
      return page > 1;
    }
    if (statusFilter === 'unread') {
      return page <= 1;
    }

    return true;
  });

  // 3. Sorting
  return filtered.sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'original_name': {
        const titleA = getCleanDocTitle(a.original_name).toLowerCase();
        const titleB = getCleanDocTitle(b.original_name).toLowerCase();
        comparison = titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
        break;
      }
      case 'last_read_page': {
        const pageA = a.last_read_page || 1;
        const pageB = b.last_read_page || 1;
        comparison = pageA - pageB;
        break;
      }
      case 'file_size': {
        const sizeA = a.file_size || 0;
        const sizeB = b.file_size || 0;
        comparison = sizeA - sizeB;
        break;
      }
      case 'uploaded_at':
      default: {
        const dateA = new Date(a.uploaded_at?.replace(' ', 'T') || 0).getTime();
        const dateB = new Date(b.uploaded_at?.replace(' ', 'T') || 0).getTime();
        comparison = dateA - dateB;
        break;
      }
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}
