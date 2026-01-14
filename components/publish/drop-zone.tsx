'use client';

import { useCallback, useState } from 'react';

interface DropZoneProps {
  onFileSelect: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function DropZone({ onFileSelect, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) {
      document.getElementById('file-input')?.click();
    }
  }, [disabled]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-4 border-dashed rounded-2xl p-20 cursor-pointer
        transition-all duration-200
        ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        id="file-input"
        type="file"
        accept=".md,.mdx"
        onChange={handleFileInput}
        disabled={disabled}
        className="hidden"
      />
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <p className="text-2xl font-semibold text-gray-700">
          {isDragging ? 'Drop it here!' : 'Drop a Markdown file'}
        </p>
        <p className="text-gray-500 mt-2">or click to browse</p>
        <p className="text-sm text-gray-400 mt-4">
          Supports .md and .mdx files up to 100MB
        </p>
      </div>
    </div>
  );
}
