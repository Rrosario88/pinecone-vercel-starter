import React, { useState, useRef } from 'react';
import { ICard } from './Card';
import { Flame } from 'lucide-react';

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

interface StagedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  addedAt: string;
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
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear files when clearTrigger changes
  React.useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      setStagedFiles([]);
      setUploadedFiles([]);
      setUploading(false);
    }
  }, [clearTrigger, setStagedFiles, setUploadedFiles, setUploading]);

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

  const handleFileUpload = async (file: File, fileId?: string, retryCount = 0) => {
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

    // Helper function to update file status
    const updateFileStatus = (status: UploadedFile['status'], statusMessage: string, progress?: number) => {
      setUploadedFiles(prev => 
        prev.map(f => 
          (fileId ? f.uploadedAt === fileId : f.name === file.name && f.uploading)
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

      // Create AbortController for timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`Upload timeout for file: ${file.name}`);
      }, 300000); // 5 minute timeout
      
      let response;
      try {
        response = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log('Upload response status:', response.status);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Fetch error for file:', file.name, fetchError);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timed out. The file may be too large or server is overloaded. Please try again.');
        }
        if (fetchError.message.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        throw new Error(`Upload failed: ${fetchError.message}`);
      }

      updateFileStatus('processing', 'Processing PDF...', 40);

      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Server error (${response.status}): ${response.statusText || 'Unknown error'}`;
        }
        console.error('Server error for file:', file.name, errorMessage);
        throw new Error(errorMessage);
      }

      updateFileStatus('extracting', 'Extracting text content...', 60);
      
      let result;
      try {
        result = await response.json();
        console.log('Upload result:', result);
      } catch (jsonError) {
        console.error('JSON parse error for file:', file.name, jsonError);
        throw new Error('Invalid response from server. Please try again.');
      }

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
        type: file.type,
        retryCount
      });
      
      // Check if we should retry
      const isRetryableError = 
        errorMessage.includes('Network error') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('timed out') ||
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504');
      
      if (isRetryableError && retryCount < 2) {
        console.log(`Retrying upload for ${file.name} (attempt ${retryCount + 1})`);
        updateFileStatus('uploading', `Retrying upload (${retryCount + 1}/2)...`, 5);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Retry the upload
        return handleFileUpload(file, fileId, retryCount + 1);
      }
      
      // Provide more specific error messages
      let userErrorMessage = 'Upload failed';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network error')) {
        userErrorMessage = 'Connection error - please check your internet connection and try again';
      } else if (errorMessage.includes('timed out')) {
        userErrorMessage = 'Upload timed out - file may be too large or server is busy';
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
          (fileId ? f.uploadedAt === fileId : f.name === file.name && f.uploading)
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
    stageFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    stageFiles(files);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const stageFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!file.type.includes('pdf')) {
        if (showToast) {
          showToast(`${file.name} is not a PDF file`, 'warning');
        }
        return false;
      }
      
      // Check for duplicates
      const isDuplicate = stagedFiles.some(staged => 
        staged.name === file.name && staged.size === file.size
      );
      if (isDuplicate) {
        if (showToast) {
          showToast(`${file.name} is already staged for upload`, 'info');
        }
        return false;
      }
      
      return true;
    });
    
    const newStagedFiles: StagedFile[] = validFiles.map(file => ({
      file,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      addedAt: new Date().toISOString()
    }));
    
    setStagedFiles(prev => [...prev, ...newStagedFiles]);
  };

  const removeStagedFile = (fileId: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadStagedFiles = async () => {
    if (stagedFiles.length === 0) {
      if (showToast) {
        showToast('No files to upload', 'warning');
      }
      return;
    }

    // Move staged files to uploading state
    const timestamp = new Date().toISOString();
    const newUploadFiles: UploadedFile[] = stagedFiles.map((stagedFile, index) => ({
      name: stagedFile.name,
      size: stagedFile.size,
      uploadedAt: `${timestamp}_${index}`,
      uploading: true,
      status: 'uploading' as const,
      statusMessage: 'Queued for upload...',
      progress: 0
    }));
    
    setUploadedFiles(prev => [...prev, ...newUploadFiles]);
    
    // Clear staged files
    const filesToUpload = [...stagedFiles];
    setStagedFiles([]);
    
    // Process them sequentially
    for (let i = 0; i < filesToUpload.length; i++) {
      await handleFileUpload(filesToUpload[i].file, `${timestamp}_${i}`);
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
        
        <div className="space-y-2 text-center">
          <div className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-gray-900 dark:text-gray-100 font-medium">
            Upload PDF Files
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            Drag and drop PDF files here, or click to select
          </div>
          {(() => {
            const processingCount = uploadedFiles.filter(f => 
              f.status === 'uploading' || 
              f.status === 'processing' || 
              f.status === 'extracting' || 
              f.status === 'embedding' || 
              f.status === 'indexing'
            ).length;
            
            const totalIncomplete = uploadedFiles.filter(f => 
              f.status !== 'completed' && f.status !== 'failed'
            ).length;
            
            const displayCount = Math.max(processingCount, totalIncomplete);
            
            return displayCount > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Processing {displayCount} file{displayCount > 1 ? 's' : ''}...
              </div>
            );
          })()}
        </div>
      </div>

      {/* Staged Files Section */}
      {stagedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-gray-900 dark:text-gray-100 font-medium">
              Files Ready for Upload ({stagedFiles.length})
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setStagedFiles([])}
                className="text-xs px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={uploadStagedFiles}
                disabled={uploading}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  uploading
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {uploading ? 'Uploading...' : `Upload ${stagedFiles.length} File${stagedFiles.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
          
          <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
            {stagedFiles.map((stagedFile) => (
              <div
                key={stagedFile.id}
                className="flex items-center px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded gap-2"
              >
                <div className="w-4 h-4 text-blue-500 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate min-w-0">
                    {stagedFile.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-16 text-right">
                    {formatFileSize(stagedFile.size)}
                  </span>
                </div>
                <button
                  onClick={() => removeStagedFile(stagedFile.id)}
                  className="flex-shrink-0 p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Remove from upload queue"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-gray-900 dark:text-gray-100 font-medium">Uploaded Files:</div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className={`px-3 py-2 rounded text-xs border transition-all duration-200 ${
                  file.status === 'completed' 
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700' 
                    : file.status === 'failed'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className={`${
                      file.status === 'completed' ? 'w-5 h-5 text-red-500' 
                      : file.status === 'failed' ? 'w-4 h-4 text-red-500'
                      : file.uploading ? 'w-4 h-4 text-blue-500' : 'w-4 h-4 text-gray-400'
                    } flex-shrink-0 mr-2`}>
                      {file.status === 'completed' ? (
                        <Flame size={20} className="text-red-500" />
                      ) : file.status === 'failed' ? (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : file.uploading ? (
                        <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium truncate min-w-0 flex-1">{file.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs flex-shrink-0 w-16 text-right ml-2">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  {file.status === 'failed' && (
                    <button
                      onClick={() => {
                        // Trigger file input to re-select the same file for retry
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = '.pdf';
                        fileInput.multiple = false;
                        
                        fileInput.onchange = async (e) => {
                          const target = e.target as HTMLInputElement;
                          const selectedFile = target.files?.[0];
                          if (selectedFile) {
                            // Reset the failed file status to uploading
                            setUploadedFiles(prev => 
                              prev.map(f => 
                                f.uploadedAt === file.uploadedAt
                                  ? { ...f, status: 'uploading', statusMessage: 'Retrying upload...', progress: 0, uploading: true }
                                  : f
                              )
                            );
                            
                            // Retry the upload with the newly selected file
                            await handleFileUpload(selectedFile, file.uploadedAt);
                          }
                        };
                        
                        fileInput.click();
                      }}
                      className="group relative text-xs px-2 py-1 text-white rounded transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 bg-orange-500 hover:bg-orange-600"
                      title="Retry upload - click to select file again"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded"></div>
                      <span className="relative">Retry</span>
                    </button>
                  )}
                </div>
                
                {/* Status and Progress - only show if uploading or has detailed status */}
                {(file.uploading || file.statusMessage) && (
                  <div className="mt-1 space-y-1">
                    <div className={`text-xs ${
                      file.status === 'completed' ? 'text-orange-600 dark:text-orange-400'
                      : file.status === 'failed' ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {file.statusMessage || 'Ready'}
                    </div>
                    
                    {file.uploading && file.progress !== undefined && (
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};