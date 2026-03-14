import React, { useState, useRef, useCallback } from "react";

interface Props {
  onFileDrop: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}

export function FileDropZone({ onFileDrop, disabled, accept }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileDrop(files[0]);
      }
    },
    [disabled, onFileDrop]
  );

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileDrop(files[0]);
      e.target.value = ""; // Reset for re-upload
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl
        cursor-pointer transition-all duration-200
        ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}
        ${
          isDragging
            ? "border-foca-500 bg-foca-50 scale-[1.02]"
            : "border-gray-300 hover:border-foca-400 hover:bg-foca-50/50"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept || ".pdf,.docx,.xlsx,.pptx,.ppsx,.jpg,.jpeg,.png,.tiff,.tif"}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Upload icon */}
      <svg
        className={`w-12 h-12 mb-4 transition-colors ${
          isDragging ? "text-foca-500" : "text-gray-400"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>

      <p className="text-sm font-medium text-gray-700">
        {isDragging ? "Drop the file here" : "Drag & drop a file here"}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        or click to browse
      </p>
      <p className="text-xs text-gray-400 mt-3">
        Supported: PDF, DOCX, XLSX, PPTX, JPG, PNG, TIFF
      </p>
      <p className="text-xs text-gray-400">Max 25 MB</p>
    </div>
  );
}
