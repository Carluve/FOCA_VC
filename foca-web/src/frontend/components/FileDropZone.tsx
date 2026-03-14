// =============================================================================
// Drag & Drop file upload - hacker terminal style
// =============================================================================

import { useDropzone } from "react-dropzone";
import { useCallback } from "react";

interface Props {
  onFileDrop: (file: File) => void;
  uploading: boolean;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
};

export function FileDropZone({ onFileDrop, uploading }: Props) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && !uploading) {
        onFileDrop(acceptedFiles[0]);
      }
    },
    [onFileDrop, uploading],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxFiles: 1,
      maxSize: 25 * 1024 * 1024,
      disabled: uploading,
    });

  return (
    <div
      {...getRootProps()}
      className={`
        relative border border-dashed rounded-lg p-10 text-center cursor-pointer
        transition-all duration-200 font-mono
        ${uploading
          ? "border-foca-900/40 bg-[#0d0d0d] cursor-wait"
          : isDragReject
            ? "border-red-700 bg-red-950/10"
            : isDragActive
              ? "border-foca-500 bg-foca-950/20 border-glow"
              : "border-foca-900/40 bg-[#0d0d0d] hover:border-foca-700/50 hover:bg-foca-950/10"
        }
      `}
    >
      <input {...getInputProps()} />

      {uploading ? (
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-foca-950/50 border border-foca-900/30">
            <svg className="w-5 h-5 text-foca-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
          <p className="text-foca-400 text-sm">Uploading & extracting metadata...</p>
          <p className="text-foca-800 text-xs">Processing target document</p>
        </div>
      ) : isDragActive ? (
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-foca-950/50 border border-foca-600/40">
            <svg className="w-5 h-5 text-foca-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12" />
            </svg>
          </div>
          <p className="text-foca-300 text-sm text-glow">DROP TARGET ACQUIRED</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#111] border border-foca-900/30">
            <svg className="w-5 h-5 text-foca-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-foca-500 text-sm">
              Drop target document here
            </p>
            <p className="text-foca-800 text-xs mt-1">
              Supported: PDF, DOCX, XLSX, PPTX (max 25 MB)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
