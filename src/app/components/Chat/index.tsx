// Chat.tsx

import React, { FormEvent, ChangeEvent, useState, useRef, useEffect } from "react";
import Messages from "./Messages";
import { Message, useChat } from "ai/react";
import { Paperclip, X, Globe, Plus, Trash2 } from "lucide-react";
import { PDFUpload } from "../Context/PDFUpload";
import { ICard } from "../Context/Card";
import { IUrlEntry } from "../Context/UrlButton";
import { useToast } from "../Toast";

interface ChatProps {
  splittingMethod?: string;
  chunkSize?: number;
  overlap?: number;
  onPDFUpload?: (documents: ICard[]) => void;
  onWebCrawl?: (documents: ICard[]) => void;
  urlEntries: IUrlEntry[];
  setUrlEntries: React.Dispatch<React.SetStateAction<IUrlEntry[]>>;
  setDocumentCards: React.Dispatch<React.SetStateAction<ICard[]>>;
}

const Chat: React.FC<ChatProps> = ({ 
  splittingMethod = "markdown",
  chunkSize = 256,
  overlap = 1,
  onPDFUpload,
  onWebCrawl,
  urlEntries,
  setUrlEntries,
  setDocumentCards
}) => {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [showWebCrawl, setShowWebCrawl] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(0);
  const { showToast, ToastContainer } = useToast();

  const handlePDFUploadSuccess = (documents: ICard[]) => {
    onPDFUpload?.(documents);
    setShowPDFUpload(false);
  };

  const handleWebCrawlSuccess = (documents: ICard[]) => {
    onWebCrawl?.(documents);
    showToast(`Successfully crawled website content - ${documents.length} chunks extracted`, 'success');
  };

  const handleAddUrl = (url: string, title?: string) => {
    if (url && !urlEntries.some(entry => entry.url === url)) {
      const newEntry: IUrlEntry = {
        url,
        title: title || new URL(url).hostname,
        seeded: false,
        loading: false,
      };
      setUrlEntries(prev => [...prev, newEntry]);
      showToast('URL added successfully!', 'success');
    } else if (urlEntries.some(entry => entry.url === url)) {
      showToast('This URL is already added', 'warning');
    }
  };

  const handleRemoveUrl = (index: number) => {
    setUrlEntries(prev => prev.filter((_, i) => i !== index));
    showToast('URL removed', 'info');
  };

  const handleCrawlUrl = async (url: string) => {
    // Set loading state
    setUrlEntries(prev => 
      prev.map(entry => 
        entry.url === url ? { ...entry, loading: true } : entry
      )
    );

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          options: {
            splittingMethod,
            chunkSize,
            overlap,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const { documents } = await response.json();
      
      if (documents && documents.length > 0) {
        // Mark as seeded
        setUrlEntries(prev => 
          prev.map(entry => 
            entry.url === url ? { ...entry, seeded: true, loading: false } : entry
          )
        );
        // Update shared document cards so they appear in the document sources panel
        setDocumentCards(documents);
        handleWebCrawlSuccess(documents);
      } else {
        showToast('No content could be extracted from this URL. The website might be empty or blocked.', 'warning');
        // Reset loading state
        setUrlEntries(prev => 
          prev.map(entry => 
            entry.url === url ? { ...entry, loading: false } : entry
          )
        );
      }
    } catch (error) {
      console.error('Web crawl error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to crawl website. Please check the URL and try again.';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Website not found. Please check if the URL is correct.';
      } else if (error.message.includes('403') || error.message.includes('401')) {
        errorMessage = 'Access denied. The website may be protected or require authentication.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error occurred. Please try again in a moment.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The website may be slow to respond.';
      }
      
      showToast(errorMessage, 'error');
      
      // Reset loading state
      setUrlEntries(prev => 
        prev.map(entry => 
          entry.url === url ? { ...entry, loading: false } : entry
        )
      );
    }
  };


  return (
    <div id="chat" className="flex flex-col h-full w-full">
      <ToastContainer />
      <Messages messages={messages} />
      
      {/* PDF Upload Modal */}
      {showPDFUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-300 dark:border-gray-700 relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload PDF Documents</h3>
              <button
                onClick={() => setShowPDFUpload(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <PDFUpload
              onUploadSuccess={handlePDFUploadSuccess}
              splittingMethod={splittingMethod}
              chunkSize={chunkSize}
              overlap={overlap}
              clearTrigger={clearTrigger}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {/* Web Crawl Modal */}
      {showWebCrawl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-300 dark:border-gray-700 relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Web Sources</h3>
              <button
                onClick={() => setShowWebCrawl(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Add URL Section */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Add Website URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    defaultValue="https://"
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Saved URLs List */}
              {urlEntries.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Saved URLs ({urlEntries.length})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {urlEntries.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
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
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                entry.seeded 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              title={entry.seeded ? "Re-crawl this URL" : "Crawl this URL"}
                            >
                              {entry.seeded ? 'Re-crawl' : 'Crawl'}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveUrl(index)}
                            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Remove URL"
                          >
                            <Trash2 size={14} />
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

      <form
        onSubmit={handleSubmit}
        className="mt-6 relative bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 flex-shrink-0 shadow-sm transition-colors duration-200"
      >
        <input
          type="text"
          placeholder="Ask about your uploaded PDFs..."
          className="w-full py-4 pl-6 pr-20 text-gray-900 dark:text-gray-100 bg-transparent rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          value={input}
          onChange={handleInputChange}
        />
        
        {/* Action Buttons */}
        <div className="absolute right-12 top-1/2 -translate-y-1/2 flex gap-1">
          {/* Web Crawl Button */}
          <button
            type="button"
            onClick={() => setShowWebCrawl(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
            title="Web Sources"
          >
            <Globe size={18} />
          </button>
          
          {/* PDF Upload Button */}
          <button
            type="button"
            onClick={() => setShowPDFUpload(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
            title="Upload PDF"
          >
            <Paperclip size={18} />
          </button>
        </div>
        
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none">
          ⮐
        </span>
      </form>
    </div>
  );
};

export default Chat;
