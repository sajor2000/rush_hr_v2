'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

interface JobDescriptionUploaderProps {
  onFileAccepted: (file: File) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  disabled?: boolean;
}

export default function JobDescriptionUploader({ onFileAccepted, file, setFile, disabled = false }: JobDescriptionUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled || acceptedFiles.length === 0) return;
      const acceptedFile = acceptedFiles[0];
      setFile(acceptedFile);
      onFileAccepted(acceptedFile);
    },
    [onFileAccepted, setFile, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: false,
    disabled,
  });

  const removeFile = () => {
    if (disabled) return;
    setFile(null);
  };

  return (
    <div className="w-full">
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            disabled
              ? 'bg-neutral-gray-light border-neutral-gray cursor-not-allowed'
              : isDragActive
              ? 'border-rush-green bg-rush-green-lightest cursor-pointer'
              : 'border-neutral-gray hover:border-rush-green cursor-pointer'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`mx-auto h-10 w-10 ${disabled ? 'text-neutral-gray' : 'text-rush-green'}`} />
          <p className="mt-2 text-sm text-neutral-gray-dark">{
            isDragActive 
              ? 'Drop the file here...'
              : 'Drag & drop a job description file or click to select'
          }</p>
          <p className="text-xs text-neutral-gray mt-1">Supports: .pdf, .docx, .txt</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-neutral-gray-lightest rounded-md border border-neutral-gray">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon className="h-6 w-6 text-rush-blue flex-shrink-0" />
            <span className="text-sm font-medium text-neutral-gray-dark truncate">{file.name}</span>
          </div>
          <button onClick={removeFile} disabled={disabled} className="p-1 rounded-full hover:bg-neutral-gray-light disabled:cursor-not-allowed disabled:opacity-50">
            <X className="h-5 w-5 text-red-600" />
          </button>
        </div>
      )}
    </div>
  );
}
