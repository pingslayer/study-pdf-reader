import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Upload,
  BookOpen,
  Trash2,
  Clock,
  Search,
  X,
  Grid,
  List,
  ArrowUp,
  ArrowDown,
  Edit3,
  FileText,
  RefreshCw,
  FileUp,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  Document,
  SortField,
  SortOrder,
  StatusFilter,
  ViewMode,
  filterAndSortDocuments,
  formatBytes,
  formatDate,
  getCleanDocTitle,
} from './Library/libraryUtils';
import { DeleteConfirmModal, RenameDocModal } from './Library/LibraryModals';

export type { Document };

export interface LibraryProps {
  onDocumentSelect: (doc: Document) => void;
}

export const Library: React.FC<LibraryProps> = ({ onDocumentSelect }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('uploaded_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      // Clear legacy storage key so it does not override default list view
      localStorage.removeItem('studypdf_library_view');
      const saved = localStorage.getItem('studypdf_library_view_v2');
      return saved === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });

  // Modal & Toast states
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameDoc, setRenameDoc] = useState<Document | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:3001/api/library');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        showToast('Failed to load library documents', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
      showToast('Could not connect to document library', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Persist view mode preference
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('studypdf_library_view_v2', mode);
    } catch {}
  };

  // Keyboard shortcut to focus search with '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        }
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Upload handler
  const processUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Only PDF files are supported', 'error');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3001/api/library/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const doc = await res.json();
        setDocuments((prev) => [doc, ...prev]);
        showToast(`"${getCleanDocTitle(doc.original_name)}" added to library`);
        onDocumentSelect(doc);
      } else {
        showToast('Document upload failed', 'error');
      }
    } catch (err) {
      console.error('Upload failed', err);
      showToast('Upload error. Please try again', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUpload(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  // Drag and drop handlers
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUpload(file);
    }
  };

  // Delete document
  const confirmDelete = async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:3001/api/library/${deleteDoc.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDocuments((docs) => docs.filter((d) => d.id !== deleteDoc.id));
        showToast(`"${getCleanDocTitle(deleteDoc.original_name)}" deleted`);
        setDeleteDoc(null);
      } else {
        showToast('Failed to delete document', 'error');
      }
    } catch (err) {
      console.error('Delete failed', err);
      showToast('Error deleting document', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Rename document
  const confirmRename = async (newName: string) => {
    if (!renameDoc) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`http://localhost:3001/api/library/${renameDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_name: newName }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDocuments((docs) => docs.map((d) => (d.id === updated.id ? updated : d)));
        showToast('Document title updated');
        setRenameDoc(null);
      } else {
        showToast('Failed to rename document', 'error');
      }
    } catch (err) {
      console.error('Rename failed', err);
      showToast('Error updating document title', 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  // Toggle sort direction or sort column
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'original_name' ? 'asc' : 'desc');
    }
  };

  // Status counts
  const inProgressCount = useMemo(
    () => documents.filter((d) => (d.last_read_page || 1) > 1).length,
    [documents]
  );
  const unreadCount = documents.length - inProgressCount;

  const filteredDocuments = useMemo(() => {
    return filterAndSortDocuments(documents, searchQuery, statusFilter, sortField, sortOrder);
  }, [documents, searchQuery, statusFilter, sortField, sortOrder]);

  // Highlight matching search text
  const renderHighlightedTitle = (title: string) => {
    const cleanTitle = getCleanDocTitle(title);
    if (!searchQuery.trim()) return cleanTitle;

    const query = searchQuery.trim();
    const parts = cleanTitle.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-amber-400/30 text-amber-200 rounded px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full w-full bg-zinc-950 text-zinc-100 flex flex-col relative overflow-y-auto overflow-x-hidden selection:bg-blue-600/30"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-40 bg-blue-600/15 border-2 border-dashed border-blue-400/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="bg-zinc-900/90 border border-blue-500/40 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <FileUp className="w-16 h-16 text-blue-400 animate-bounce mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">Drop PDF to Upload</h3>
            <p className="text-sm text-zinc-400">Add document directly to your study library</p>
          </div>
        </div>
      )}

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-zinc-400 hover:text-white transition ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  StudyPDF Library
                </h1>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Organize your materials, track study milestones, and resume listening where you left off.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchDocuments}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition"
              title="Refresh library"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInputChange}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                title="Upload PDF document"
              />
              <button
                disabled={isUploading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-blue-900/40 border border-blue-500/30 transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Toolbar: Search, Status Filter, Sorting & View Toggle */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title... (press '/' to focus)"
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-9 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Controls & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pills */}
            <div className="inline-flex p-1 bg-zinc-950/90 border border-zinc-800/80 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({documents.length})
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'in_progress'
                    ? 'bg-zinc-800 text-amber-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                onClick={() => setStatusFilter('unread')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'unread'
                    ? 'bg-zinc-800 text-blue-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Sort Dropdown & Order Toggle */}
            <div className="flex items-center space-x-1 bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-1 text-xs">
              <span className="text-zinc-500 pl-2 pr-1 font-medium hidden sm:inline">Sort:</span>
              <select
                value={sortField}
                onChange={(e) => handleSortChange(e.target.value as SortField)}
                className="bg-transparent text-zinc-200 py-1.5 px-2 rounded-lg font-medium focus:outline-none cursor-pointer"
              >
                <option value="uploaded_at" className="bg-zinc-900 text-zinc-100">
                  Date Added
                </option>
                <option value="original_name" className="bg-zinc-900 text-zinc-100">
                  Title (A–Z)
                </option>
                <option value="last_read_page" className="bg-zinc-900 text-zinc-100">
                  Progress
                </option>
                <option value="file_size" className="bg-zinc-900 text-zinc-100">
                  File Size
                </option>
              </select>
              <button
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition"
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />}
              </button>
            </div>

            {/* View Mode Switcher (Grid / List) */}
            <div className="inline-flex p-1 bg-zinc-950/90 border border-zinc-800/80 rounded-xl text-xs">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results summary when filtered or searching */}
        {(searchQuery || statusFilter !== 'all') && (
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 px-1">
            <div>
              Showing <span className="font-semibold text-zinc-200">{filteredDocuments.length}</span> of{' '}
              <span className="font-semibold text-zinc-200">{documents.length}</span> documents
              {searchQuery && (
                <span>
                  {' '}
                  matching <span className="text-blue-400 font-medium">"{searchQuery}"</span>
                </span>
              )}
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* Document Presentation */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 bg-zinc-900/50 border border-zinc-800/60 rounded-2xl animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-zinc-800/40 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          /* Empty States */
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800/80 rounded-2xl bg-zinc-900/20 p-8">
            {documents.length === 0 ? (
              <>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl mb-4 shadow-inner">
                  <BookOpen className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Your library is currently empty</h3>
                <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
                  Drag and drop any PDF document anywhere into this window, or upload a textbook chapter to start reading with synchronized voice narration.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileInputChange}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-900/40 transition">
                      <Upload className="w-4 h-4" />
                      <span>Upload Your First PDF</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-zinc-800/50 text-zinc-400 rounded-2xl mb-3">
                  <Search className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">No matching documents found</h3>
                <p className="text-sm text-zinc-400 mb-4 max-w-sm">
                  We couldn't find any PDF matching "{searchQuery}" under the selected filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-xl transition"
                >
                  Clear search & filters
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocuments.map((doc) => {
              const inProgress = (doc.last_read_page || 1) > 1;

              return (
                <div
                  key={doc.id}
                  onClick={() => onDocumentSelect(doc)}
                  className="group relative bg-zinc-900/80 hover:bg-zinc-850/90 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between overflow-hidden"
                >
                  {/* Top card bar */}
                  <div>
                    <div className="flex items-start justify-between mb-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2.5 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/70 rounded-xl text-blue-400 shadow-sm group-hover:text-blue-300 transition">
                          <FileText className="w-5 h-5" />
                        </div>
                        {inProgress ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <Clock className="w-3 h-3 mr-0.5" />
                            <span>Page {doc.last_read_page}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            New
                          </span>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div
                        className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setRenameDoc(doc)}
                          className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition"
                          title="Rename document title"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteDoc(doc)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Document Title */}
                    <h3
                      className="font-bold text-base text-zinc-100 group-hover:text-white transition line-clamp-2 mb-2 leading-snug"
                      title={doc.original_name}
                    >
                      {renderHighlightedTitle(doc.original_name)}
                    </h3>
                  </div>

                  {/* Card Footer: Metadata and Resume Button */}
                  <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center space-x-3">
                      <span>{formatDate(doc.uploaded_at)}</span>
                      {doc.file_size ? <span>• {formatBytes(doc.file_size)}</span> : null}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocumentSelect(doc);
                      }}
                      className="flex items-center space-x-1 font-semibold text-blue-400 group-hover:text-blue-300 group-hover:underline transition"
                    >
                      <span>{inProgress ? 'Resume' : 'Read'}</span>
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List / Table View */
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800 select-none">
                  <tr>
                    <th
                      scope="col"
                      onClick={() => handleSortChange('original_name')}
                      className="px-6 py-3.5 cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Document Title</span>
                        {sortField === 'original_name' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSortChange('last_read_page')}
                      className="px-6 py-3.5 cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Progress</span>
                        {sortField === 'last_read_page' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSortChange('file_size')}
                      className="px-6 py-3.5 cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Size</span>
                        {sortField === 'file_size' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSortChange('uploaded_at')}
                      className="px-6 py-3.5 cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Date Added</span>
                        {sortField === 'uploaded_at' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredDocuments.map((doc) => {
                    const inProgress = (doc.last_read_page || 1) > 1;

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => onDocumentSelect(doc)}
                        className="group hover:bg-zinc-800/40 cursor-pointer transition"
                      >
                        <td className="px-6 py-4 font-medium text-zinc-100 max-w-sm">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="truncate group-hover:text-blue-300 transition" title={doc.original_name}>
                              {renderHighlightedTitle(doc.original_name)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {inProgress ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <Clock className="w-3 h-3 mr-0.5" />
                              <span>Page {doc.last_read_page}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              New
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-zinc-400 text-xs">
                          {formatBytes(doc.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-zinc-400 text-xs">
                          {formatDate(doc.uploaded_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => onDocumentSelect(doc)}
                              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-300 rounded-lg font-medium transition"
                            >
                              {inProgress ? 'Resume' : 'Read'}
                            </button>
                            <button
                              onClick={() => setRenameDoc(doc)}
                              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition"
                              title="Rename document"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteDoc(doc)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        document={deleteDoc}
        isOpen={Boolean(deleteDoc)}
        onClose={() => setDeleteDoc(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />

      {/* Rename Document Modal */}
      <RenameDocModal
        document={renameDoc}
        isOpen={Boolean(renameDoc)}
        onClose={() => setRenameDoc(null)}
        onRename={confirmRename}
        isSaving={isRenaming}
      />
    </div>
  );
};
