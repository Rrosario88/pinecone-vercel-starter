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
  uploadedFiles: UploadedFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  uploading: boolean;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  uploading?: boolean;
  status?: 'uploading' | 'processing' | 'extracting' | 'embedding' | 'indexing' | 'completed' | 'failed';
  statusMessage?: string;
  progress?: number;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({
  onUploadSuccess,
  onAllUploadsComplete,
  splittingMethod,
  chunkSize,
  overlap,
  clearTrigger,
  showToast,
  uploadedFiles,
  setUploadedFiles,
  uploading,
  setUploading,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear files when clearTrigger changes
  React.useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      setUploadedFiles([]);
      setUploading(false);
    }
  }, [clearTrigger, setUploadedFiles, setUploading]);

  // Check if uploads are complete whenever uploadedFiles changes
  React.useEffect(() => {
    const stillUploading = uploadedFiles.some(f => 
      f.status === 'uploading' || 
      f.status === 'processing' || 
      f.status === 'extracting' || 
      f.status === 'embedding' || 
      f.status === 'indexing'
    );
    
    if (uploadedFiles.length > 0 && !stillUploading && uploading) {
      setUploading(false);
      if (onAllUploadsComplete) {
        onAllUploadsComplete();
      }
    }
  }, [uploadedFiles, uploading, setUploading, onAllUploadsComplete]);

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      if (showToast) {
        showToast('Please upload only PDF files', 'warning');
      } else {
        alert('Please upload only PDF files');
      }
      return;
    }

    // Start uploading state
    setUploading(true);
    
    // Add file to uploaded files list with initial status
    const newFile: UploadedFile = {
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploading: true,
      status: 'uploading',
      statusMessage: 'Preparing file...',
      progress: 0,
    };
    setUploadedFiles(prev => [...prev, newFile]);

    // Helper function to update file status
    const updateFileStatus = (status: UploadedFile['status'], statusMessage: string, progress?: number) => {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.name === file.name && f.uploading 
            ? { ...f, status, statusMessage, progress }
            : f
        )
      );
    };

    try {
      updateFileStatus('uploading', 'Uploading file...', 10);
      
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('options', JSON.stringify({
        splittingMethod,
        chunkSize,
        chunkOverlap: overlap,
        splitByPages: true,
      }));

      console.log('Starting upload for:', file.name, 'Size:', file.size);

      updateFileStatus('processing', 'Sending to server...', 20);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);
      updateFileStatus('processing', 'Processing PDF...', 40);

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      updateFileStatus('extracting', 'Extracting text content...', 60);
      
      const result = await response.json();
      console.log('Upload result:', result);

      if (result.success) {
        updateFileStatus('embedding', 'Generating embeddings...', 80);
        
        // Simulate embedding/indexing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateFileStatus('indexing', 'Storing in vector database...', 90);
        
        // Simulate indexing time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update the uploaded file status to completed
        setUploadedFiles(prev => 
          prev.map(f => 
            f.name === file.name && f.uploading 
              ? { 
                  ...f, 
                  uploading: false, 
                  status: 'completed', 
                  statusMessage: `Completed • ${result.chunks} chunks created`,
                  progress: 100 
                }
              : f
          )
        );
        
        // Call success callback with documents
        onUploadSuccess(result.documents);
        console.log('Upload successful:', result.chunks, 'chunks created');
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
      
      // Update the failed upload status instead of removing it
      setUploadedFiles(prev => 
        prev.map(f => 
          f.name === file.name && f.uploading 
            ? { 
                ...f, 
                uploading: false, 
                status: 'failed', 
                statusMessage: `Failed: ${userErrorMessage}`,
                progress: 0 
              }
            : f
        )
      );
    }
    // Upload completion is now handled by useEffect
  
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    // Process files sequentially to avoid state update conflicts
    processFilesSequentially(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Process files sequentially to avoid state update conflicts
    processFilesSequentially(files);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFilesSequentially = async (files: File[]) => {
    for (const file of files) {
      await handleFileUpload(file);
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
          <div className="text-2xl">📄</div>
          <div className="text-gray-900 dark:text-gray-100 font-medium">
            Upload PDF Files
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            Drag and drop PDF files here, or click to select
          </div>
          {(() => {
            const pendingCount = uploadedFiles.filter(f => 
              f.status === 'uploading' || 
              f.status === 'processing' || 
              f.status === 'extracting' || 
              f.status === 'embedding' || 
              f.status === 'indexing'
            ).length;
            
            return pendingCount > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Processing {pendingCount} file{pendingCount > 1 ? 's' : ''}...
              </div>
            );
          })()}
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-gray-900 dark:text-gray-100 font-medium">Uploaded Files:</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm border transition-all duration-200 ${
                  file.status === 'completed' 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                    : file.status === 'failed'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg ${
                      file.status === 'completed' ? '✅' 
                      : file.status === 'failed' ? '❌'
                      : file.uploading ? '⏳' : '📄'
                    }`}>
                      {file.status === 'completed' ? '✅' 
                       : file.status === 'failed' ? '❌'
                       : file.uploading ? '⏳' : '📄'}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-40">{file.name}</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                
                {/* Status and Progress */}
                <div className="space-y-1">
                  <div className={`text-xs ${
                    file.status === 'completed' ? 'text-green-600 dark:text-green-400'
                    : file.status === 'failed' ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {file.statusMessage || 'Ready'}
                  </div>
                  
                  {file.uploading && file.progress !== undefined && (
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};