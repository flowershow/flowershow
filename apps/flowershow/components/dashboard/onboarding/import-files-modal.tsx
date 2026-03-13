'use client';

import { CheckCircleIcon, FileIcon, ImageIcon, UploadIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Modal from '@/providers/modal';
import { api } from '@/trpc/react';

const MAX_FILES = 100;

type State = 'selecting' | 'ready' | 'uploading' | 'success' | 'error';

interface ImportFilesOnboardingModalProps {
  siteId: string;
  siteUrl: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export default function ImportFilesOnboardingModal({
  siteId,
  siteUrl,
  showModal,
  setShowModal,
}: ImportFilesOnboardingModalProps) {
  const router = useRouter();
  const [state, setState] = useState<State>('selecting');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isContentFile = (file: File): boolean => {
    return (
      file.name.endsWith('.md') ||
      file.name.endsWith('.mdx') ||
      file.name.endsWith('.html')
    );
  };

  const validateFiles = (
    files: File[],
  ): { valid: boolean; error: string | null } => {
    if (files.length === 0) return { valid: false, error: null };
    if (files.length > MAX_FILES)
      return { valid: false, error: `Maximum ${MAX_FILES} files allowed` };
    if (!files.some(isContentFile))
      return {
        valid: false,
        error: 'At least one content file (.md, .mdx, or .html) is required',
      };
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

  const publishFiles = api.site.publishFiles.useMutation();

  const handleStartImport = async () => {
    setState('uploading');
    setError(null);

    try {
      const filesInfo = await Promise.all(
        selectedFiles.map(async (file) => ({
          path: file.name,
          size: file.size,
          sha: await calculateSHA256(file),
        })),
      );

      const { files: uploadTargets } = await publishFiles.mutateAsync({
        siteId,
        files: filesInfo,
      });

      await Promise.all(
        uploadTargets.map(
          async (target: { path: string; uploadUrl: string }) => {
            const file = selectedFiles.find((f) => f.name === target.path);
            if (!file) throw new Error(`File not found: ${target.path}`);
            const uploadResponse = await fetch(target.uploadUrl, {
              method: 'PUT',
              body: file,
            });
            if (!uploadResponse.ok)
              throw new Error(`Failed to upload: ${target.path}`);
          },
        ),
      );

      setState('success');
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import');
      setState('error');
    }
  };

  const handleClose = () => {
    if (state === 'uploading') return;
    if (state === 'success') {
      router.push(`/site/${siteId}/settings`);
      router.refresh();
    }
    setShowModal(false);
    setTimeout(() => {
      setState('selecting');
      setSelectedFiles([]);
      setError(null);
    }, 200);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    if (newFiles.length === 0) {
      setState('selecting');
      setSelectedFiles([]);
    } else {
      const { error: validationError } = validateFiles(newFiles);
      setError(validationError);
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
        <div className="relative flex flex-col space-y-2 p-5 md:p-10 md:pb-0">
          <h2 className="font-dashboard-heading text-2xl">Import Files</h2>
          <p className="text-sm text-stone-500">
            Drop your Markdown, HTML, and media files to publish them.
          </p>
        </div>

        <div className="p-5 md:px-10 md:py-6">
          {state === 'selecting' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-md p-8 text-center cursor-pointer transition-colors
                ${isDragging ? 'border-black bg-stone-100' : 'border-stone-300 hover:border-stone-400'}`}
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
                    key={file.name + file.size}
                    className="flex items-center justify-between px-3 py-2 hover:bg-stone-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isContentFile(file) ? (
                        <FileIcon className="size-4 text-stone-600" />
                      ) : (
                        <ImageIcon className="size-4 text-stone-600" />
                      )}
                      <span className="text-sm text-stone-600 truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-stone-400 hover:text-red-500 p-1 flex-shrink-0 ml-2"
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
                ))}
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {selectedFiles.length} file
                {selectedFiles.length !== 1 && 's'} selected
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
              <p className="mt-3 text-sm text-stone-600">Uploading files...</p>
            </div>
          )}

          {state === 'success' && (
            <div className="py-8 text-center">
              <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500" />
              <p className="mt-3 text-sm font-medium text-stone-900">
                Files uploaded successfully!
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Your site is ready to go.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

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

          {state === 'success' && (
            <>
              <a
                href={siteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition-all hover:bg-stone-50"
              >
                View site
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white transition-all hover:bg-white hover:text-black"
              >
                Go to site settings
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
