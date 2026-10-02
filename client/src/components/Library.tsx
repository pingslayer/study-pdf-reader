import React, { useEffect, useState } from 'react';
import { Upload, BookOpen, Trash2, Clock } from 'lucide-react';

export interface Document {
  id: string;
  filename: string;
  original_name: string;
  last_read_page: number;
  uploaded_at: string;
}

interface LibraryProps {
  onDocumentSelect: (doc: Document) => void;
}

export const Library: React.FC<LibraryProps> = ({ onDocumentSelect }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/library');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        onDocumentSelect(doc);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/library/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDocuments(docs => docs.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Library</h1>
            <p className="text-neutral-400">Continue reading or upload a new PDF.</p>
          </div>
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <Upload className="w-5 h-5" />
              <span>{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onDocumentSelect(doc)}
              className="bg-neutral-800 border border-neutral-700 hover:border-neutral-500 rounded-xl p-6 cursor-pointer transition-all hover:-translate-y-1 group relative flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-neutral-700 rounded-lg text-blue-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <button
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="p-2 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-lg mb-2 line-clamp-2" title={doc.original_name}>
                {doc.original_name.replace(/\.pdf$/i, '')}
              </h3>
              <div className="mt-auto pt-4 flex items-center text-sm text-neutral-400 space-x-4">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Page {doc.last_read_page}
                </span>
                <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {documents.length === 0 && !isUploading && (
            <div className="col-span-full py-12 text-center text-neutral-500 border-2 border-dashed border-neutral-700 rounded-xl">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-1">Your library is empty</h3>
              <p>Upload a PDF to start reading.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
