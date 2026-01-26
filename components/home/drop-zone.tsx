import React, { useRef, useState } from 'react';

const MAX_FILES = 5;

interface DropZoneProps {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  disabled,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMarkdownFile = (file: File): boolean => {
    return (
      file.name.endsWith('.md') ||
      file.name.endsWith('.mdx') ||
      file.name.endsWith('.markdown')
    );
  };

  const validateFiles = (
    files: FileList | null,
  ): { valid: File[]; error: string | null } => {
    if (!files || files.length === 0) {
      return { valid: [], error: null };
    }

    const allFiles = Array.from(files);

    if (allFiles.length > MAX_FILES) {
      return {
        valid: [],
        error: `Maximum ${MAX_FILES} files allowed. Sign in to publish more.`,
      };
    }

    const hasMarkdown = allFiles.some(isMarkdownFile);
    if (!hasMarkdown) {
      return {
        valid: [],
        error: 'At least one markdown file (.md, .mdx) is required',
      };
    }

    return { valid: allFiles, error: null };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    if (disabled) return;

    const { valid, error: validationError } = validateFiles(
      e.dataTransfer.files,
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    if (valid.length === 0) return;
    onFileSelect(valid);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const { valid, error: validationError } = validateFiles(e.target.files);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (valid.length === 0) return;
    onFileSelect(valid);
    // Reset input so the same files can be selected again
    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group cursor-pointer transition-all duration-300 rounded-3xl border-2 border-dashed
        ${
          isDragging
            ? 'border-orange-500 bg-orange-50/50'
            : 'border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
      />

      <div className="py-12 px-6 text-center space-y-4">
        <div
          className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 ${isDragging ? 'scale-110 bg-orange-600 text-white' : 'bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Drop your files here
          </h3>
          <p className="mt-1 text-slate-500 max-w-sm mx-auto">
            Markdown files with images and assets.
            <br /> Up to {MAX_FILES} files when not signed in.
          </p>
          {error && <p className="mt-2 text-sm text-indigo-600">{error}</p>}
        </div>

        <div className="pt-4 flex items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            .md
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            .mdx
          </span>
        </div>
      </div>
    </div>
  );
};
