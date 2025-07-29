import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import UrlButton, { IUrlEntry } from "./UrlButton";
import { Card, ICard } from "./Card";
import { PDFDocument } from "./PDFDocument";
import { WebDocument } from "./WebDocument";
import { clearIndex, crawlDocument } from "./utils";
import { Button } from "./Button";
import { useToast } from "../Toast";
import { ConfirmDialog } from "../ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
interface ContextProps {
  className: string;
  selected: string[] | null;
  splittingMethod?: string;
  chunkSize?: number;
  overlap?: number;
  urlEntries: IUrlEntry[];
  setUrlEntries: React.Dispatch<React.SetStateAction<IUrlEntry[]>>;
  documentCards: ICard[];
  setDocumentCards: React.Dispatch<React.SetStateAction<ICard[]>>;
}

export const Context: React.FC<ContextProps> = ({ 
  className, 
  selected, 
  splittingMethod = "markdown",
  chunkSize = 256,
  overlap = 1,
  urlEntries,
  setUrlEntries,
  documentCards,
  setDocumentCards
}) => {
  const [clearTrigger, setClearTrigger] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showFireEffect, setShowFireEffect] = useState(false);
  const { showToast } = useToast();
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Delete individual documents
  const handleDeletePDF = async (filename: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete PDF Document',
      message: `Are you sure you want to delete "${filename}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Call API to delete from Pinecone
          const response = await fetch('/api/delete-document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename,
              type: 'pdf'
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Filter out the chunks for this specific PDF from UI
            const remainingCards = documentCards.filter(card => 
              !(card.metadata.type === 'pdf' && card.metadata.filename === filename)
            );
            setDocumentCards(remainingCards);
            showToast(`Deleted "${filename}" (${result.deletedCount} chunks)`, 'success');
          } else {
            throw new Error(result.error || 'Failed to delete from Pinecone');
          }
        } catch (error) {
          console.error('Error deleting PDF:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to delete PDF: ${errorMessage}`, 'error');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteWebDocument = async (url: string) => {
    // Extract domain name for display
    const getDisplayName = (url: string) => {
      try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
      } catch {
        return url;
      }
    };

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Web Document',
      message: `Are you sure you want to delete content from "${getDisplayName(url)}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Call API to delete from Pinecone
          const response = await fetch('/api/delete-document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              type: 'web'
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Filter out the chunks for this specific URL from UI
            const remainingCards = documentCards.filter(card => 
              card.metadata.url !== url
            );
            setDocumentCards(remainingCards);
            
            // Also remove from URL entries if it exists
            setUrlEntries(prev => prev.filter(entry => entry.url !== url));
            
            showToast(`Deleted content from "${getDisplayName(url)}" (${result.deletedCount} chunks)`, 'success');
          } else {
            throw new Error(result.error || 'Failed to delete from Pinecone');
          }
        } catch (error) {
          console.error('Error deleting web document:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          showToast(`Failed to delete web document: ${errorMessage}`, 'error');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Scroll to selected card
  useEffect(() => {
    const element = selected && document.getElementById(selected[0]);
    element?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  // Clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Sync with Pinecone database
  const syncWithPinecone = async () => {
    try {
      const response = await fetch('/api/sync-documents');
      const data = await response.json();
      
      if (data.success) {
        setDocumentCards(data.documentCards);
        console.log(`Synced ${data.stats.totalDocuments} document chunks from Pinecone`);
      } else {
        console.error('Failed to sync with Pinecone:', data.error);
      }
    } catch (error) {
      console.error('Error syncing with Pinecone:', error);
    }
  };

  // Sync on component mount and after changes
  useEffect(() => {
    // Initial sync when component mounts
    syncWithPinecone();
  }, []);

  // Auto-sync when URL entries change (after web crawling)
  useEffect(() => {
    // Only sync if there are seeded URL entries (not after clearing)
    const hasSeededEntries = urlEntries.some(entry => entry.seeded);
    if (hasSeededEntries) {
      // Small delay to allow Pinecone to index
      const timer = setTimeout(syncWithPinecone, 1000);
      return () => clearTimeout(timer);
    }
  }, [urlEntries]);

  const DropdownLabel: React.FC<
    React.PropsWithChildren<{ htmlFor: string }>
  > = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="text-gray-900 dark:text-gray-100 p-2 font-bold">
      {children}
    </label>
  );

  const buttons = urlEntries.map((entry, key) => (
    <div className="" key={`${key}-${entry.loading}`}>
      <UrlButton
        entry={entry}
        onClick={() =>
          crawlDocument(
            entry.url,
            setUrlEntries,
            setDocumentCards,
            splittingMethod,
            chunkSize,
            overlap,
            showToast
          )
        }
      />
    </div>
  ));


  return (
    <div
      className={`flex flex-col w-full h-full ${className} relative`}
    >
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-t-xl border-b border-gray-300 dark:border-gray-700">
        {/* Header */}
        <div className="w-full p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Document Sources</h3>
        </div>

        {/* Web Crawl Content */}
        <div className="flex flex-col items-start lg:flex-row w-full lg:flex-wrap px-4 pb-2">
          {buttons}
        </div>
        
        <div className="w-full px-4 pb-4">
          {/* Clear Button */}
          <div className="relative">
            <button
              className="group relative w-full py-2.5 px-4 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-700/80 border border-gray-300/50 dark:border-gray-600/50 backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 hover:bg-gray-200/80 dark:hover:bg-gray-600/80"
              onClick={async () => {
                setShowFireEffect(true);
                setTimeout(() => setShowFireEffect(false), 5500);
                
                // Delay clearing documents by 1 second to let fire start
                setTimeout(async () => {
                  await clearIndex(setUrlEntries, setDocumentCards, setStatusMessage, showToast);
                  setClearTrigger(prev => prev + 1); // Trigger clear in PDFUpload
                }, 1000);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-600/20 opacity-0 group-hover:opacity-50 transition-opacity duration-300 blur-md rounded-lg"></div>
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Documents
              </span>
            </button>
            
          </div>
          
          {/* Status Message */}
          {statusMessage && (
            <div className="mt-2 text-center">
              <span className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-700">
                {statusMessage}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Cards Section */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
          {(() => {
            // Group documents by type and filename+uploadId/URL
            const pdfGroups: { [groupKey: string]: ICard[] } = {};
            const webGroups: { [url: string]: ICard[] } = {};
            
            documentCards.forEach(card => {
              if (card.metadata.type === 'pdf' && card.metadata.filename) {
                // Create unique group key using filename and uploadId
                const groupKey = `${card.metadata.filename}_${card.metadata.uploadId || 'legacy'}`;
                if (!pdfGroups[groupKey]) {
                  pdfGroups[groupKey] = [];
                }
                pdfGroups[groupKey].push(card);
              } else if (card.metadata.url) {
                if (!webGroups[card.metadata.url]) {
                  webGroups[card.metadata.url] = [];
                }
                webGroups[card.metadata.url].push(card);
              }
            });

            return (
              <>
                {/* PDF Documents */}
                {Object.entries(pdfGroups).map(([groupKey, chunks]) => {
                  // Extract actual filename from groupKey (remove uploadId suffix)
                  const actualFilename = chunks[0]?.metadata?.filename || groupKey.split('_')[0];
                  return (
                    <PDFDocument
                      key={groupKey}
                      filename={actualFilename}
                      chunks={chunks}
                      selected={selected}
                      onDelete={handleDeletePDF}
                    />
                  );
                })}
                
                {/* Web Documents */}
                {Object.entries(webGroups).map(([url, chunks]) => (
                  <WebDocument
                    key={url}
                    url={url}
                    chunks={chunks}
                    selected={selected}
                    onDelete={handleDeleteWebDocument}
                  />
                ))}
              </>
            );
          })()}
          
          {documentCards.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                No documents crawled yet.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fire Effect - Over Document Pane */}
      <AnimatePresence>
        {showFireEffect && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
            style={{ mixBlendMode: 'normal' }}>
                  {/* Document area flames */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={`doc-flame-${i}`}
                      className="absolute"
                      style={{
                        left: `${5 + (i % 10) * 9}%`,
                        top: `${60 + Math.floor(i / 10) * 15 + Math.random() * 10}%`,
                        width: `${8 + Math.random() * 6}px`,
                        height: `${20 + Math.random() * 15}px`,
                      }}
                      initial={{ 
                        scaleY: 0, 
                        opacity: 0,
                        rotate: Math.random() * 20 - 10 
                      }}
                      animate={{ 
                        scaleY: [0, 2, 1.8, 2.2, 1.5, 1.0, 0.6, 0.3, 0.1, 0],
                        opacity: [0, 0.9, 0.8, 1, 0.8, 0.6, 0.4, 0.2, 0.1, 0],
                        rotate: [
                          Math.random() * 20 - 10,
                          Math.random() * 30 - 15,
                          Math.random() * 25 - 12.5,
                          Math.random() * 35 - 17.5,
                          Math.random() * 20 - 10,
                          Math.random() * 15 - 7.5,
                          Math.random() * 10 - 5,
                          Math.random() * 5 - 2.5,
                          Math.random() * 3 - 1.5,
                          0
                        ],
                        x: [0, Math.random() * 10 - 5, Math.random() * 15 - 7.5, Math.random() * 8 - 4, Math.random() * 5 - 2.5, 0]
                      }}
                      transition={{ 
                        duration: 5,
                        delay: i * 0.1,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    >
                      <div 
                        className="w-full h-full rounded-full blur-sm"
                        style={{
                          background: `linear-gradient(to top, 
                            rgb(220, 38, 38) 0%, 
                            rgb(234, 88, 12) 40%, 
                            rgb(245, 158, 11) 70%, 
                            rgb(253, 224, 71) 90%, 
                            transparent 100%)`
                        }}
                      />
                    </motion.div>
                  ))}

                  {/* Large document flames */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`large-flame-${i}`}
                      className="absolute"
                      style={{
                        left: `${10 + i * 11}%`,
                        top: `${65 + Math.random() * 25}%`,
                        width: `${15 + Math.random() * 10}px`,
                        height: `${35 + Math.random() * 20}px`,
                      }}
                      initial={{ 
                        scaleY: 0, 
                        opacity: 0,
                        rotate: Math.random() * 30 - 15 
                      }}
                      animate={{ 
                        scaleY: [0, 2.5, 2.2, 3, 2.5, 2.0, 1.5, 1.0, 0.6, 0.3, 0.1, 0],
                        opacity: [0, 1, 0.9, 1, 0.9, 0.8, 0.6, 0.4, 0.3, 0.15, 0.05, 0],
                        rotate: [
                          Math.random() * 30 - 15,
                          Math.random() * 40 - 20,
                          Math.random() * 35 - 17.5,
                          Math.random() * 45 - 22.5,
                          Math.random() * 30 - 15,
                          Math.random() * 25 - 12.5,
                          Math.random() * 15 - 7.5,
                          Math.random() * 10 - 5,
                          Math.random() * 5 - 2.5,
                          Math.random() * 3 - 1.5,
                          Math.random() * 2 - 1,
                          0
                        ],
                        x: [0, Math.random() * 20 - 10, Math.random() * 25 - 12.5, Math.random() * 15 - 7.5, Math.random() * 8 - 4, 0]
                      }}
                      transition={{ 
                        duration: 5.5,
                        delay: 0.5 + i * 0.15,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    >
                      <div 
                        className="w-full h-full rounded-full blur-md"
                        style={{
                          background: `linear-gradient(to top, 
                            rgb(220, 38, 38) 0%, 
                            rgb(234, 88, 12) 40%, 
                            rgb(245, 158, 11) 70%, 
                            rgb(250, 204, 21) 100%)`
                        }}
                      />
                    </motion.div>
                  ))}
                  
                  {/* Flying embers and sparks */}
                  {[...Array(25)].map((_, i) => (
                    <motion.div
                      key={`ember-${i}`}
                      className="absolute rounded-full"
                      style={{
                        left: `${Math.random() * 80 + 10}%`,
                        top: `${Math.random() * 40 + 50}%`,
                        width: `${2 + Math.random() * 3}px`,
                        height: `${2 + Math.random() * 3}px`,
                        background: Math.random() > 0.5 ? '#fb923c' : '#f59e0b'
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0.9, 0.7, 0.5, 0.3, 0.15, 0.05, 0],
                        scale: [0, 3, 2.8, 2.2, 1.5, 1.0, 0.6, 0.3, 0],
                        y: [0, -60 - Math.random() * 80, -80 - Math.random() * 60, -100 - Math.random() * 40],
                        x: [0, Math.random() * 60 - 30, Math.random() * 40 - 20, Math.random() * 20 - 10],
                        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1), 540 * (Math.random() > 0.5 ? 1 : -1), 720 * (Math.random() > 0.5 ? 1 : -1)]
                      }}
                      transition={{ 
                        duration: 4.5 + Math.random() * 1.5,
                        delay: Math.random() * 2,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    />
                  ))}
                  
                  {/* Smoke and ash */}
                  {[...Array(15)].map((_, i) => (
                    <motion.div
                      key={`smoke-${i}`}
                      className="absolute rounded-full opacity-30"
                      style={{
                        left: `${Math.random() * 70 + 15}%`,
                        top: `${Math.random() * 30 + 60}%`,
                        width: `${8 + Math.random() * 12}px`,
                        height: `${8 + Math.random() * 12}px`,
                        background: `rgba(${100 + Math.random() * 50}, ${100 + Math.random() * 50}, ${100 + Math.random() * 50}, 0.6)`
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.02, 0],
                        scale: [0, 3, 5, 7, 9, 11, 13, 15, 17, 20],
                        y: [0, -80 - Math.random() * 40, -120 - Math.random() * 60, -150 - Math.random() * 40],
                        x: [0, Math.random() * 30 - 15, Math.random() * 50 - 25, Math.random() * 70 - 35]
                      }}
                      transition={{ 
                        duration: 6 + Math.random() * 2,
                        delay: 1.5 + Math.random() * 1,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    />
                  ))}

                  {/* Screen overlay for burning effect */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at 50% 75%, rgba(234, 88, 12, 0.25) 0%, rgba(220, 38, 38, 0.15) 40%, transparent 60%)',
                      top: '50%'
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1, 0.05, 0] }}
                    transition={{ duration: 5, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              )}
            </AnimatePresence>
    </div>
  );
};
