import React, { useState, useRef } from 'react';
import { ICard } from './Card';

interface PDFUploadProps {
  onUploadSuccess: (documents: ICard[]) => void;
  onAllUploadsComplete?: () => void;
  splittingMethod: string;
  chunkSize: number;
  overlap: number;
  clearTrigger?: number;
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  uploading?: boolean;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({
  onUploadSuccess,
  onAllUploadsComplete,
  splittingMethod,
  chunkSize,
  overlap,
  clearTrigger,
  showToast,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [allUploadsComplete, setAllUploadsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear files when clearTrigger changes
  React.useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      setUploadedFiles([]);
      setAllUploadsComplete(false);
    }
  }, [clearTrigger]);

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      if (showToast) {
        showToast('Please upload only PDF files', 'warning');
      } else {
        alert('Please upload only PDF files');
      }
      return;
    }

    // Increment pending uploads at the start
    setPendingUploads(prev => prev + 1);
    setUploading(true);
    // Reset completion state when new uploads start
    setAllUploadsComplete(false);
    
    // Add file to uploaded files list with uploading status
    const newFile: UploadedFile = {
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploading: true,
    };
    setUploadedFiles(prev => [...prev, newFile]);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('options', JSON.stringify({
        splittingMethod,
        chunkSize,
        chunkOverlap: overlap,
        splitByPages: true,
      }));

      console.log('Starting upload for:', file.name, 'Size:', file.size);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);

      if (result.success) {
        // Update the uploaded file status
        setUploadedFiles(prev => 
          prev.map(f => 
            f.name === file.name && f.uploading 
              ? { ...f, uploading: false }
              : f
          )
        );
        
        // Call success callback with documents
        onUploadSuccess(result.documents);
        console.log('Upload successful:', result.chunks, 'chunks created');
        if (showToast) {
          showToast(`Successfully uploaded ${file.name} and created ${result.chunks} chunks`, 'success');
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Upload error details:', {
        error: errorMessage,
        file: file.name,
        size: file.size,
        type: file.type
      });
      
      // Provide more specific error messages
      let userErrorMessage = 'Upload failed';
      if (errorMessage.includes('Failed to fetch')) {
        userErrorMessage = 'Connection error - please check if the server is running';
      } else if (errorMessage.includes('413')) {
        userErrorMessage = 'File too large - please try a smaller PDF';
      } else if (errorMessage.includes('400')) {
        userErrorMessage = 'Invalid file format - please upload a valid PDF';
      } else if (errorMessage.includes('500')) {
        userErrorMessage = 'Server error - please try again in a moment';
      } else {
        userErrorMessage = `Upload failed: ${errorMessage}`;
      }
      
      if (showToast) {
        showToast(userErrorMessage, 'error');
      } else {
        alert(userErrorMessage);
      }
      
      // Remove the failed upload from the list
      setUploadedFiles(prev => 
        prev.filter(f => !(f.name === file.name && f.uploading))
      );
    } finally {
      // Decrement pending uploads and check if all are complete
      setPendingUploads(prev => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setUploading(false);
          setAllUploadsComplete(true);
          // All uploads complete, notify parent if callback provided
          if (onAllUploadsComplete) {
            setTimeout(() => onAllUploadsComplete(), 100);
          }
        }
        return newCount;
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(handleFileUpload);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(handleFileUpload);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full p-4 space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-400 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-500 bg-white dark:bg-gray-700/50'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <div className="space-y-2">
          <div className="text-2xl">
            {allUploadsComplete ? '✅' : '📄'}
          </div>
          <div className="text-gray-900 dark:text-gray-100 font-medium">
            {uploading 
              ? pendingUploads > 1 
                ? `Uploading ${pendingUploads} files...` 
                : 'Uploading...'
              : allUploadsComplete
                ? 'All uploads completed!'
                : 'Upload PDF Files'
            }
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            {allUploadsComplete 
              ? 'All files have been processed successfully. You can close this window or upload more files.'
              : 'Drag and drop PDF files here, or click to select'
            }
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-gray-900 dark:text-gray-100 font-medium">Uploaded Files:</div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-200 dark:bg-gray-700 rounded text-sm border border-gray-300 dark:border-gray-600"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600 dark:text-gray-300">📄</span>
                  <span className="text-gray-900 dark:text-gray-100 truncate max-w-32">{file.name}</span>
                  {file.uploading && (
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Uploading...</span>
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {formatFileSize(file.size)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="text-center">
          <div className="text-gray-700 dark:text-gray-300">Processing PDF...</div>
          <div className="text-gray-500 dark:text-gray-500 text-sm">
            Extracting text and creating embeddings
          </div>
        </div>
      )}
    </div>
  );
};