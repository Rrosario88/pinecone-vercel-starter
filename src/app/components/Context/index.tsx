import React, { useEffect, useState } from "react";
import UrlButton, { IUrlEntry } from "./UrlButton";
import { Card, ICard } from "./Card";
import { PDFDocument } from "./PDFDocument";
import { WebDocument } from "./WebDocument";
import { clearIndex, crawlDocument } from "./utils";
import { Button } from "./Button";
import { useToast } from "../Toast";
import { ConfirmDialog } from "../ConfirmDialog";
import { useAppConfig } from "@/context/AppConfigContext";

interface ContextProps {
  className: string;
  selected: string[] | null;
  urlEntries: IUrlEntry[];
  setUrlEntries: React.Dispatch<React.SetStateAction<IUrlEntry[]>>;
  documentCards: ICard[];
  setDocumentCards: React.Dispatch<React.SetStateAction<ICard[]>>;
}

export const Context: React.FC<ContextProps> = ({
  className,
  selected,
  urlEntries,
  setUrlEntries,
  documentCards,
  setDocumentCards
}) => {
  // Get config from context
  const { splittingMethod, chunkSize, overlap } = useAppConfig();
  const [clearTrigger, setClearTrigger] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
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
      }
      // Silently handle sync failures - UI will show current state
    } catch {
      // Sync failed - UI will show current cached state
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
                await clearIndex(setUrlEntries, setDocumentCards, setStatusMessage, showToast);
                setClearTrigger(prev => prev + 1); // Trigger clear in PDFUpload
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
    </div>
  );
};
