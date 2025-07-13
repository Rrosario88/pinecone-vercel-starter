import React, { FC } from "react";
import ReactMarkdown from "react-markdown";

export interface ICard {
  pageContent: string;
  metadata: {
    hash: string;
    url?: string;
    filename?: string;
    pageNumber?: number;
    type?: string;
  };
}

interface ICardProps {
  card: ICard;
  selected: string[] | null;
}

export const Card: FC<ICardProps> = ({ card, selected }) => {
  const isPDF = card.metadata.type === 'pdf';
  
  return (
    <div
      id={card.metadata.hash}
      className={`card w-full p-4 rounded-lg text-white transition-all duration-300 ease-in-out ${
        selected && selected.includes(card.metadata.hash)
          ? "bg-gray-600 border-2 border-sky-500 shadow-lg"
          : "bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:shadow-md"
      }`}
    >
      {/* Source Information */}
      <div className="mb-3 pb-2 border-b border-gray-600">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">
            {isPDF ? '📄' : '🌐'}
          </span>
          <div className="flex flex-col">
            {isPDF ? (
              <>
                <span className="text-blue-300 font-medium">
                  {card.metadata.filename}
                </span>
                {card.metadata.pageNumber && (
                  <span className="text-gray-400 text-xs">
                    Page {card.metadata.pageNumber}
                  </span>
                )}
              </>
            ) : (
              <span className="text-blue-300 font-medium">
                {card.metadata.url}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <ReactMarkdown>{card.pageContent}</ReactMarkdown>
      
      {/* Hash */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <b className="text-xs text-gray-500">{card.metadata.hash}</b>
      </div>
    </div>
  );
};
