import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import UrlButton, { IUrlEntry } from "./UrlButton";
import { Card, ICard } from "./Card";
import { PDFDocument } from "./PDFDocument";
import { WebDocument } from "./WebDocument";
import { clearIndex, crawlDocument } from "./utils";
import { Button } from "./Button";
import { useToast } from "../Toast";
import { ConfirmDialog } from "../ConfirmDialog";
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
  const { showToast, ToastContainer } = useToast();
  
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
          // Filter out the chunks for this specific PDF
          const remainingCards = documentCards.filter(card => 
            !(card.metadata.type === 'pdf' && card.metadata.filename === filename)
          );
          setDocumentCards(remainingCards);
          showToast(`Deleted "${filename}"`, 'success');
        } catch (error) {
          console.error('Error deleting PDF:', error);
          showToast('Failed to delete PDF', 'error');
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
          // Filter out the chunks for this specific URL
          const remainingCards = documentCards.filter(card => 
            card.metadata.url !== url
          );
          setDocumentCards(remainingCards);
          
          // Also remove from URL entries if it exists
          setUrlEntries(prev => prev.filter(entry => entry.url !== url));
          
          showToast(`Deleted content from "${getDisplayName(url)}"`, 'success');
        } catch (error) {
          console.error('Error deleting web document:', error);
          showToast('Failed to delete web document', 'error');
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
      className={`flex flex-col rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 w-full transition-colors duration-200 h-full ${className}`}
    >
      <ToastContainer />
      
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-t-xl border-b border-gray-300 dark:border-gray-700">
        {/* Header */}
        <div className="w-full p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Document Sources</h3>
        </div>

        {/* Web Crawl Content */}
        <div className="flex flex-col items-start lg:flex-row w-full lg:flex-wrap px-4 pb-2">
          {buttons}
        </div>
        
        <div className="w-full px-4 pb-4">
          <Button
            className="w-full py-2 px-4 rounded-lg font-medium"
            onClick={async () => {
              await clearIndex(setUrlEntries, setDocumentCards, setStatusMessage);
              setClearTrigger(prev => prev + 1); // Trigger clear in PDFUpload
            }}
          >
            Clear Documents
          </Button>
          
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
      <div className="flex-1 overflow-y-auto">
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
