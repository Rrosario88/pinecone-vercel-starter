import React, { FC, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface ICard {
  pageContent: string;
  metadata: {
    hash: string;
    url?: string;
    filename?: string;
    pageNumber?: number;
    type?: string;
    uploadId?: string;
  };
}

interface ICardProps {
  card: ICard;
  selected: string[] | null;
  chunkIndex?: number;
}

export const Card: FC<ICardProps> = ({ card, selected, chunkIndex }) => {
  const isPDF = card.metadata.type === 'pdf';
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Create a preview of the content (first 150 characters)
  const contentPreview = card.pageContent.length > 150 
    ? card.pageContent.substring(0, 150) + "..."
    : card.pageContent;
  
  return (
    <div
      id={card.metadata.hash}
      className={`card w-full rounded-lg transition-all duration-300 ease-in-out ${
        selected && selected.includes(card.metadata.hash)
          ? "bg-gray-300 dark:bg-gray-600 border-2 border-sky-500 shadow-lg text-gray-900 dark:text-white"
          : "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-md text-gray-900 dark:text-white"
      }`}
    >
      {/* Clickable Header with Source Information */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
            <span className="text-lg">
              {isPDF ? '📄' : '🌐'}
            </span>
            <div className="flex flex-col flex-1 min-w-0">
              {isPDF ? (
                <>
                  <span className="text-blue-600 dark:text-blue-300 font-medium select-text cursor-text truncate">
                    {card.metadata.filename}
                  </span>
                  {chunkIndex !== undefined && (
                    <span className="text-gray-600 dark:text-gray-400 text-xs select-text cursor-text">
                      Chunk {chunkIndex + 1}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-blue-600 dark:text-blue-300 font-medium select-text cursor-text truncate">
                    {card.metadata.url}
                  </span>
                  {chunkIndex !== undefined && (
                    <span className="text-gray-600 dark:text-gray-400 text-xs select-text cursor-text">
                      Chunk {chunkIndex + 1}
                    </span>
                  )}
                </>
              )}
              
              {/* Content Preview */}
              {!isExpanded && (
                <div className="text-gray-600 dark:text-gray-300 text-xs mt-1 select-text cursor-text break-words">
                  {contentPreview}
                </div>
              )}
            </div>
          </div>
          
          {/* Toggle Icon */}
          <div className="flex-shrink-0 ml-2">
            {isExpanded ? (
              <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
            {/* Full Content */}
            <div className="select-text cursor-text break-words overflow-hidden">
              <ReactMarkdown
                components={{
                  img: ({ src, alt, ...props }) => (
                    <img
                      src={src}
                      alt={alt}
                      className="max-w-full h-auto rounded-lg shadow-sm my-2"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                      {...props}
                    />
                  ),
                  p: ({ children }) => (
                    <p className="mb-2 leading-relaxed text-gray-700 dark:text-gray-300 break-words">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900 dark:text-gray-100">
                      {children}
                    </strong>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-gray-800 dark:text-gray-200 text-sm font-mono break-all">
                      {children}
                    </code>
                  )
                }}
              >
                {card.pageContent}
              </ReactMarkdown>
            </div>
            
            {/* Hash */}
            <div className="mt-3 pt-2 border-t border-gray-300 dark:border-gray-600">
              <b className="text-xs text-gray-500 dark:text-gray-500 select-text cursor-text">{card.metadata.hash}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
