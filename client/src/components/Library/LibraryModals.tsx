import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Edit3, Trash2, X, Check } from 'lucide-react';
import { Document, getCleanDocTitle } from './libraryUtils';

interface DeleteModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteModalProps> = ({
  document,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="delete-modal-title" className="text-lg font-semibold text-zinc-100">
              Delete Document
            </h3>
            <p className="text-xs text-zinc-400">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-white">"{getCleanDocTitle(document.original_name)}"</span>?
          This will permanently remove the file, reading progress, and all associated bookmarks.
        </p>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-xl border border-zinc-700/60 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 active:scale-95 rounded-xl shadow-lg shadow-rose-950 transition disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface RenameModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  isSaving: boolean;
}

export const RenameDocModal: React.FC<RenameModalProps> = ({
  document,
  isOpen,
  onClose,
  onRename,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document) {
      setName(getCleanDocTitle(document.original_name));
    }
  }, [document]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen || !document) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRename(name.trim());
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h3 id="rename-modal-title" className="text-lg font-semibold text-zinc-100">
              Rename Document
            </h3>
            <p className="text-xs text-zinc-400">Change how this PDF appears in your library.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="doc-title-input" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Document Title
            </label>
            <input
              id="doc-title-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
              placeholder="e.g. Operating Systems: Chapter 4"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-xl border border-zinc-700/60 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl shadow-lg shadow-blue-950 transition disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Title'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
