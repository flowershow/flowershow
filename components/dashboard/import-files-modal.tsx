'use client';

import { FileIcon, ImageIcon, UploadIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Modal from '@/providers/modal';

const MAX_FILES = 100;

type State = 'selecting' | 'ready' | 'uploading' | 'error';

interface FileUploadInfo {
  fileName: string;
  uploadUrl: string;
}

interface PublishResult {
  siteId: string;
  projectName: string;
  files: FileUploadInfo[];
  liveUrl: string;
}

interface ImportFilesModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function ImportFilesModal({
  showModal,
  setShowModal,
}: ImportFilesModalProps) {
  const router = useRouter();
  const [state, setState] = useState<State>('selecting');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMarkdownOrHtmlFile = (file: File): boolean => {
    return (
      file.name.endsWith('.md') ||
      file.name.endsWith('.mdx') ||
      file.name.endsWith('.html')
    );
  };

  const validateFiles = (
    files: File[],
  ): { valid: boolean; error: string | null } => {
    if (files.length === 0) {
      return { valid: false, error: null };
    }

    if (files.length > MAX_FILES) {
      return {
        valid: false,
        error: `Maximum ${MAX_FILES} files allowed`,
      };
    }

    const hasMarkdownOrHtml = files.some(isMarkdownOrHtmlFile);
    if (!hasMarkdownOrHtml) {
      return {
        valid: false,
        error: 'At least one content file (.md, .mdx, or .html) is required',
      };
    }

    return { valid: true, error: null };
  };

  const calculateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();

    if (typeof crypto.subtle?.digest === 'function') {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    const bytes = new Uint8Array(buffer);
    let hash = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) {
      hash ^= bytes[i]!;
      hash = (hash * 0x01000193) >>> 0;
    }
    return (
      hash.toString(16).padStart(8, '0') +
      file.size.toString(16).padStart(16, '0')
    );
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allFiles = Array.from(files);
    const { valid, error: validationError } = validateFiles(allFiles);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (valid) {
      setSelectedFiles(allFiles);
      setState('ready');
      setError(null);
    }
  };

  const handleStartImport = async () => {
    setState('uploading');
    setError(null);

    try {
      const filesInfo = await Promise.all(
        selectedFiles.map(async (file) => ({
          fileName: file.name,
          fileSize: file.size,
          sha: await calculateSHA256(file),
        })),
      );

      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesInfo }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create site');
      }

      const result: PublishResult = await response.json();

      await Promise.all(
        result.files.map(async (fileInfo) => {
          const file = selectedFiles.find((f) => f.name === fileInfo.fileName);
          if (!file) {
            throw new Error(`File not found: ${fileInfo.fileName}`);
          }

          const uploadResponse = await fetch(fileInfo.uploadUrl, {
            method: 'PUT',
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${fileInfo.fileName}`);
          }
        }),
      );

      await waitForProcessing(result.siteId);

      // Redirect immediately to site settings
      setShowModal(false);
      router.push(`/site/${result.siteId}/settings`);
      router.refresh();
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import');
      setState('error');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleClose = () => {
    if (state === 'uploading') return;
    setShowModal(false);
    // Reset state after modal closes
    setTimeout(() => {
      setState('selecting');
      setSelectedFiles([]);
      setError(null);
    }, 200);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    if (newFiles.length === 0) {
      setState('selecting');
      setSelectedFiles([]);
    } else {
      const { valid, error: validationError } = validateFiles(newFiles);
      if (!valid && validationError) {
        setError(validationError);
      } else {
        setError(null);
      }
      setSelectedFiles(newFiles);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={handleClose}
      closeOnClickOutside={state !== 'uploading'}
    >
      <div className="w-full max-w-lg bg-white rounded-md md:border md:border-stone-200 md:shadow overflow-hidden">
        {/* Header */}
        <div className="relative flex flex-col space-y-2 p-5 md:p-10 md:pb-0">
          <h2 className="font-dashboard-heading text-2xl">Import Files</h2>
          <p className="text-sm text-stone-500">
            Drop your Markdown, HTML, and media files, to publish them
            Flowershow
          </p>
        </div>

        {/* Content */}
        <div className="p-5 md:px-10 md:py-6">
          {state === 'selecting' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-md p-8 text-center cursor-pointer transition-colors
                ${isDragging ? 'border-black bg-stone-100' : 'border-stone-300 hover:border-stone-400'}
              `}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFilesSelected(e.target.files)}
                multiple
                className="hidden"
              />
              <UploadIcon className="mx-auto" />
              <p className="mt-2 text-sm text-stone-600">
                Drop your Markdown, HTML, and media files or browse
              </p>
            </div>
          )}

          {(state === 'ready' || state === 'error') && (
            <div>
              <div className="max-h-64 overflow-y-auto border border-stone-200 rounded-md divide-y divide-stone-100">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between px-3 py-2 hover:bg-stone-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isMarkdownOrHtmlFile(file) ? (
                        <FileIcon className="size-4 text-stone-600" />
                      ) : (
                        <ImageIcon className="size-4 text-stone-600" />
                      )}
                      <span className="text-sm text-stone-600 truncate">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {/* <span className="text-xs text-stone-500">
                        {formatFileSize(file.size)}
                      </span> */}
                      <button
                        onClick={() => removeFile(index)}
                        className="text-stone-400 hover:text-red-500 p-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {selectedFiles.length} file{selectedFiles.length !== 1 && 's'}{' '}
                selected
              </p>
            </div>
          )}

          {state === 'uploading' && (
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-10 w-10 animate-spin text-stone-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="mt-3 text-sm text-stone-600">
                Creating your site and uploading files...
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 md:px-10 gap-3">
          {state === 'selecting' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
          )}

          {(state === 'ready' || state === 'error') && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleStartImport}
                disabled={!!error}
                className="flex h-10 items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
              >
                Start import
              </button>
            </>
          )}

          {state === 'uploading' && (
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-stone-400 cursor-not-allowed"
            >
              Importing...
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

async function waitForProcessing(siteId: string): Promise<void> {
  const maxAttempts = 60;
  const pollInterval = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/site/status/${siteId}`);

    if (!response.ok) {
      throw new Error('Failed to check processing status');
    }

    const status = await response.json();

    if (status.ready) {
      return;
    }

    if (status.status === 'error') {
      throw new Error(status.error || 'Processing failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Processing timeout - please refresh to check your site');
}
