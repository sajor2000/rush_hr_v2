'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

interface ResumeDropzoneProps {
  files: File[];
  setFiles: (files: File[]) => void;
  disabled?: boolean;
}

export default function ResumeDropzone({ files, setFiles, disabled = false }: ResumeDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;
      if (files.length + acceptedFiles.length > 100) {
        alert('You can upload a maximum of 100 resumes.');
        return;
      }
      setFiles([...files, ...acceptedFiles]);
    },
    [files, setFiles, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    disabled,
  });

  const removeFile = (fileToRemove: File) => {
    if (disabled) return;
    setFiles(files.filter((file) => file !== fileToRemove));
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          disabled
            ? 'bg-neutral-gray-light border-neutral-gray cursor-not-allowed'
            : isDragActive
            ? 'border-rush-green bg-rush-green-lightest cursor-pointer'
            : 'border-neutral-gray hover:border-rush-green cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`mx-auto h-12 w-12 ${disabled ? 'text-neutral-gray' : 'text-rush-green'}`} />
        {isDragActive && !disabled ? (
          <p className="mt-2 text-rush-blue-dark">Drop the files here ...</p>
        ) : (
          <p className="mt-2 text-neutral-gray-dark">{disabled ? 'Evaluation in progress...' : 'Drag & drop resumes here, or click to select files'}</p>
        )}
        <p className="text-xs text-neutral-gray mt-1">Supports: .pdf, .docx (Max 100 files)</p>
      </div>
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-rush-blue-dark">Selected Files:</h4>
          <ul className="mt-2 space-y-2 max-h-48 overflow-y-auto p-1">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-2 bg-neutral-gray-lightest rounded-md">
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="h-5 w-5 text-rush-blue flex-shrink-0" />
                  <span className="text-sm font-medium text-neutral-gray-dark truncate">{file.name}</span>
                </div>
                <button onClick={() => removeFile(file)} disabled={disabled} className="p-1 rounded-full hover:bg-neutral-gray-light disabled:cursor-not-allowed disabled:opacity-50">
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
