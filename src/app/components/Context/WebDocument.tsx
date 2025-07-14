import React, { FC, useState } from "react";
import { Globe, ChevronDown, ChevronRight } from "lucide-react";
import { Card, ICard } from "./Card";

interface IWebDocumentProps {
  url: string;
  chunks: ICard[];
  selected: string[] | null;
}

export const WebDocument: FC<IWebDocumentProps> = ({ url, chunks, selected }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleChunks = () => {
    setIsExpanded(!isExpanded);
  };

  // Extract domain name from URL for display
  const getDisplayName = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="w-full">
      {/* Web Document Header */}
      <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded">
          <Globe size={16} className="text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate select-text cursor-text">
            {getDisplayName(url)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 select-text cursor-text">
            {chunks.length} chunks
          </div>
        </div>
        
        <div 
          className="flex-shrink-0 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 p-1 rounded transition-colors"
          onClick={handleToggleChunks}
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Chunks */}
      {isExpanded && (
        <div className="mt-2 space-y-3 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
          {chunks.map((chunk, index) => (
            <div key={chunk.metadata.hash}>
              <Card card={chunk} selected={selected} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};