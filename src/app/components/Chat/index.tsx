// Chat.tsx - Multiline Chat Input Component

import React, { FormEvent, ChangeEvent, useState, useRef, useEffect, useCallback } from "react";
import Messages from "./Messages";
import { Message } from "ai/react";
import { Paperclip, X, Globe, Plus, Trash2, Bot, Send } from "lucide-react";
import { PDFUpload } from "../Context/PDFUpload";
import { ICard } from "../Context/Card";
import { IUrlEntry } from "../Context/UrlButton";
import { useToast } from "../Toast";
import { crawlDocument } from "../Context/utils";
import { useAppConfig } from "@/context/AppConfigContext";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  uploading?: boolean;
  status?: 'uploading' | 'processing' | 'extracting' | 'embedding' | 'indexing' | 'completed' | 'failed';
  statusMessage?: string;
  progress?: number;
}

interface ChatProps {
  onPDFUpload?: (documents: ICard[]) => void;
  onWebCrawl?: (documents: ICard[]) => void;
  urlEntries: IUrlEntry[];
  setUrlEntries: React.Dispatch<React.SetStateAction<IUrlEntry[]>>;
  setDocumentCards: React.Dispatch<React.SetStateAction<ICard[]>>;
  // Chat state props
  messages: Message[];
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  reload: () => void;
  isLoading: boolean;
}

const Chat: React.FC<ChatProps> = ({
  onPDFUpload,
  onWebCrawl,
  urlEntries,
  setUrlEntries,
  setDocumentCards,
  // Chat state props
  messages,
  input,
  handleInputChange,
  handleSubmit,
  reload,
  isLoading
}) => {
  // Get config from context
  const { splittingMethod, chunkSize, overlap, useAutoGen, toggleAutoGen } = useAppConfig();
  // Chat state passed as props instead of using useChat hook
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [showWebCrawl, setShowWebCrawl] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(0);
  const { showToast, ToastContainer } = useToast();

  // Multiline textarea specific state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shadowTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [textareaHeight, setTextareaHeight] = useState('auto');
  const [isComposing, setIsComposing] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea functionality
  const adjustTextareaHeight = useCallback(() => {
    if (!textareaRef.current || !shadowTextareaRef.current) return;
    
    const textarea = textareaRef.current;
    const shadow = shadowTextareaRef.current;
    
    // Copy styles and content to shadow element
    const computedStyle = window.getComputedStyle(textarea);
    shadow.style.width = computedStyle.width;
    shadow.style.padding = computedStyle.padding;
    shadow.style.border = computedStyle.border;
    shadow.style.fontSize = computedStyle.fontSize;
    shadow.style.fontFamily = computedStyle.fontFamily;
    shadow.style.lineHeight = computedStyle.lineHeight;
    shadow.style.whiteSpace = 'pre-wrap';
    shadow.style.wordWrap = 'break-word';
    shadow.value = textarea.value;
    
    // Calculate new height
    const scrollHeight = shadow.scrollHeight;
    const minHeight = 24; // Minimum height for single line
    const maxHeight = 200; // Maximum height before scrolling
    
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = `${newHeight}px`;
        setTextareaHeight(`${newHeight}px`);
      }
    });
  }, []);
  
  // Debounced resize function
  const debouncedResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      adjustTextareaHeight();
    }, 16); // ~60fps
  }, [adjustTextareaHeight]);
  
  // Handle input changes with auto-resize
  const handleTextareaChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {

    handleInputChange(e);
    debouncedResize();
  }, [handleInputChange, debouncedResize]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      // Create a synthetic form event for submission
      const form = e.currentTarget.closest('form');
      if (form) {
        const syntheticEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(syntheticEvent);
      }
    }
  }, [isComposing]);
  
  // Handle IME composition events
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);
  
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
    // Trigger resize after composition ends
    setTimeout(adjustTextareaHeight, 0);
  }, [adjustTextareaHeight]);
  
  // Auto-focus textarea when component mounts or messages change
  useEffect(() => {
    if (textareaRef.current && !isLoading) {
      textareaRef.current.focus();
    }
  }, [isLoading]);
  
  // Initial height adjustment
  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);
  
  // Persistent upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Stable references for state setters
  const updateUploadedFiles = useCallback((files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => {
    setUploadedFiles(files);
  }, []);

  const updateUploading = useCallback((loading: boolean | ((prev: boolean) => boolean)) => {
    setUploading(loading);
  }, []);

  const handlePDFUploadSuccess = useCallback((documents: ICard[]) => {
    onPDFUpload?.(documents);
    setTimeout(() => {
      setDocumentCards(prev => [...prev]);
    }, 2000);
  }, [onPDFUpload, setDocumentCards]);

  // No-op callback - modal stays open for user control after upload
  const handleAllUploadsComplete = useCallback((): void => undefined, []);

  // Clear upload state when clearTrigger changes
  useEffect(() => {
    if (clearTrigger > 0) {
      updateUploadedFiles([]);
      updateUploading(false);
    }
  }, [clearTrigger, updateUploadedFiles, updateUploading]);

  const handleWebCrawlSuccess = (documents: ICard[]) => {
    onWebCrawl?.(documents);
  };

  const handleAddUrl = (url: string, title?: string) => {
    if (!url || urlEntries.some(entry => entry.url === url)) return;

    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      showToast('Invalid URL format', 'error');
      return;
    }

    const newEntry: IUrlEntry = {
      url,
      title: title || hostname,
      seeded: false,
      loading: false,
    };
    setUrlEntries(prev => [...prev, newEntry]);
  };

  const handleRemoveUrl = (index: number) => {
    setUrlEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleCrawlUrl = async (url: string) => {
    await crawlDocument(
      url,
      setUrlEntries,
      setDocumentCards,
      splittingMethod,
      chunkSize,
      overlap,
      showToast
    );
    // crawlDocument sets seeded=true internally on success
    handleWebCrawlSuccess([]);
  };

  // Note: messageIndex is ignored - useChat's reload() only regenerates the last response
  const handleRegenerate = useCallback((_messageIndex: number) => {
    reload();
  }, [reload]);

  return (
    <div id="chat" className="flex flex-col h-full w-full max-h-full overflow-hidden">
      <ToastContainer />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Messages messages={messages} onRegenerate={handleRegenerate} />
      </div>
      
      {/* PDF Upload Modal */}
      {showPDFUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-300 dark:border-gray-700 relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload PDF Documents</h3>
              <button
                onClick={() => setShowPDFUpload(false)}
                className="group relative transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
                <X size={20} className="relative text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 transition-colors" />
              </button>
            </div>
            <PDFUpload
              onUploadSuccess={handlePDFUploadSuccess}
              onAllUploadsComplete={handleAllUploadsComplete}
              splittingMethod={splittingMethod}
              chunkSize={chunkSize}
              overlap={overlap}
              clearTrigger={clearTrigger}
              showToast={showToast}
              uploadedFiles={uploadedFiles}
              setUploadedFiles={updateUploadedFiles}
              uploading={uploading}
              setUploading={updateUploading}
            />
          </div>
        </div>
      )}

      {/* Web Crawl Modal */}
      {showWebCrawl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-300 dark:border-gray-700 relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Web Sources</h3>
              <button
                onClick={() => setShowWebCrawl(false)}
                className="group relative transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
                <X size={20} className="relative text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 transition-colors" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Add Website URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    defaultValue="https://"
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim() !== 'https://') {
                          handleAddUrl(input.value);
                          input.value = 'https://';
                        }
                      }
                    }}
                    onFocus={(e) => {
                      const input = e.target as HTMLInputElement;
                      if (input.value === 'https://') {
                        input.setSelectionRange(input.value.length, input.value.length);
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value.trim() !== 'https://') {
                        handleAddUrl(input.value);
                        input.value = 'https://';
                      }
                    }}
                    className="group relative px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg rounded-lg"></div>
                    <Plus size={16} className="relative" />
                  </button>
                </div>
              </div>

              {urlEntries.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Saved URLs ({urlEntries.length})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {urlEntries.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {entry.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {entry.url}
                          </div>
                        </div>
                        <div className="flex gap-1 items-center">
                          {entry.seeded && (
                            <span className="w-2 h-2 bg-green-500 rounded-full" title="Content crawled"></span>
                          )}
                          {entry.loading ? (
                            <div className="px-2 py-1 text-xs bg-yellow-600 text-white rounded animate-pulse">
                              Crawling...
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCrawlUrl(entry.url)}
                              className={`group relative px-2 py-1 text-xs rounded transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 ${
                                entry.seeded 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              title={entry.seeded ? "Re-crawl this URL" : "Crawl this URL"}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg rounded"></div>
                              <span className="relative">{entry.seeded ? 'Re-crawl' : 'Crawl'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveUrl(index)}
                            className="group relative p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
                            title="Remove URL"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg rounded"></div>
                            <Trash2 size={14} className="relative" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {urlEntries.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    No URLs added yet. Add a website URL above to get started.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multiline Chat Input Form */}
      <form
        onSubmit={handleSubmit}
        className={`flex-shrink-0 mt-4 relative bg-white dark:bg-gray-800 rounded-xl border shadow-sm transition-all duration-300 ${
          useAutoGen
            ? 'border-orange-400 dark:border-orange-500 shadow-orange-500/20 shadow-lg hover:shadow-orange-500/30 hover:shadow-xl'
            : 'border-gray-300 dark:border-gray-700'
        }`}
      >
        {/* Fire glow effect when AutoGen is active */}
        {useAutoGen && (
          <>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 rounded-xl opacity-30 blur-sm animate-pulse"></div>
          </>
        )}
        
        <div className="flex items-end">
          {/* Main textarea container */}
          <div className="flex-1 relative min-h-[44px]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={useAutoGen ? "Ask your AI agent team..." : "Ask about your uploaded PDFs..."}
              rows={1}
              className="relative w-full py-3 pl-4 pr-4 text-gray-900 dark:text-gray-100 bg-transparent resize-none rounded-tl-xl rounded-bl-xl leading-tight focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all duration-300 overflow-y-auto"
              style={{ height: textareaHeight, outline: 'none', boxShadow: 'none' }}
              aria-label="Chat message input"
              aria-describedby="chat-input-help"
              disabled={false}
            />
            
            {/* Shadow textarea for height calculation */}
            <textarea
              ref={shadowTextareaRef}
              className="absolute top-0 left-0 w-full h-auto opacity-0 pointer-events-none overflow-hidden"
              aria-hidden="true"
              tabIndex={-1}
              readOnly
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center px-2 pb-2 gap-1">
            {/* AutoGen Toggle Button */}
            <button
              type="button"
              onClick={toggleAutoGen}
              className={`group relative p-2 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 rounded-lg ${
                useAutoGen ? 'bg-orange-500/10' : ''
              }`}
              title={useAutoGen ? "Multi-Agent Team: ON" : "Single Agent Mode: OFF"}
              aria-label={useAutoGen ? "Disable multi-agent mode" : "Enable multi-agent mode"}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 transition-opacity duration-300 blur-md rounded-lg ${(!input || typeof input !== "string" || input.trim().length === 0) || isLoading ? "opacity-0" : "opacity-0 group-hover:opacity-70"}`}></div>
              <div className={`relative transition-colors ${
                useAutoGen
                  ? 'text-orange-500 dark:text-orange-400'
                  : 'text-gray-500 group-hover:text-orange-500 dark:text-gray-400 dark:group-hover:text-orange-400'
              }`}>
                <Bot size={18} />
              </div>
            </button>

            {/* Web Crawl Button */}
            <button
              type="button"
              onClick={() => setShowWebCrawl(true)}
              className="group relative p-2 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 rounded-lg"
              title="Web Sources"
              aria-label="Open web sources"
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 transition-opacity duration-300 blur-md rounded-lg ${(!input || typeof input !== "string" || input.trim().length === 0) || isLoading ? "opacity-0" : "opacity-0 group-hover:opacity-70"}`}></div>
              <Globe size={18} className="relative text-gray-500 group-hover:text-orange-500 dark:text-gray-400 dark:group-hover:text-orange-400 transition-colors" />
            </button>
            
            {/* PDF Upload Button */}
            <button
              type="button"
              onClick={() => setShowPDFUpload(true)}
              className="group relative p-2 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 rounded-lg"
              title="Upload PDF"
              aria-label="Upload PDF documents"
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 transition-opacity duration-300 blur-md rounded-lg ${(!input || typeof input !== "string" || input.trim().length === 0) || isLoading ? "opacity-0" : "opacity-0 group-hover:opacity-70"}`}></div>
              <Paperclip size={18} className="relative text-gray-500 group-hover:text-orange-500 dark:text-gray-400 dark:group-hover:text-orange-400 transition-colors" />
            </button>
            
            {/* Send Button */}
            <button
              type="submit"
              className={`group relative p-2 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 rounded-lg ${
                useAutoGen ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-blue-500 text-white hover:bg-blue-600"
              } ${(!input || typeof input !== "string" || input.trim().length === 0) || isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Send message"
              aria-label="Send message"
              disabled={(!input || typeof input !== "string" || input.trim().length === 0) || isLoading}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 transition-opacity duration-300 blur-md rounded-lg ${(!input || typeof input !== "string" || input.trim().length === 0) || isLoading ? "opacity-0" : "opacity-0 group-hover:opacity-70"}`}></div>
              <Send size={18} className={`relative transition-colors ${(!input || typeof input !== "string" || input.trim().length === 0) || isLoading ? "opacity-70" : ""}`} />
            </button>
          </div>
        </div>
        
        {/* Screen reader announcements */}
        <div id="chat-input-help" className="sr-only">
          Press Enter to send, Shift+Enter for new line. Use Tab to navigate to action buttons.
        </div>
      </form>
    </div>
  );
};

export default Chat;
