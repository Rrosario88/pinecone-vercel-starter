import React, { FC, useState } from "react";
import { FileText, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Card, ICard } from "./Card";

interface IPDFDocumentProps {
  filename: string;
  chunks: ICard[];
  selected: string[] | null;
  onDelete?: (filename: string) => void;
}

export const PDFDocument: FC<IPDFDocumentProps> = ({ filename, chunks, selected, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleChunks = () => {
    console.log('Toggle clicked, expanding:', !isExpanded);
    setIsExpanded(!isExpanded);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Delete clicked for:', filename);
    if (onDelete) {
      onDelete(filename);
    } else {
      console.log('No onDelete handler provided');
    }
  };

  return (
    <div className="w-full">
      {/* PDF Document Header */}
      <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors">
        <div className="flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded">
          <FileText size={16} className="text-red-600 dark:text-red-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate select-text cursor-text">
            {filename}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 select-text cursor-text">
            {chunks.length} chunks
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="group relative p-1 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
              title={`Delete ${filename}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md"></div>
              <Trash2 size={14} className="relative text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors" />
            </button>
          )}
          
          {/* Toggle Button */}
          <button 
            className="group relative flex-shrink-0 cursor-pointer p-1 rounded transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
            onClick={handleToggleChunks}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md"></div>
            {isExpanded ? (
              <ChevronDown size={16} className="relative text-gray-500 dark:text-gray-400 transition-colors" />
            ) : (
              <ChevronRight size={16} className="relative text-gray-500 dark:text-gray-400 transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Chunks */}
      {isExpanded && (
        <div className="mt-2 space-y-3 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
          {chunks.map((chunk, index) => (
            <div key={chunk.metadata.hash}>
              <Card card={chunk} selected={selected} chunkIndex={index} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};