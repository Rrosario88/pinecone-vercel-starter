import React from "react";
import { AiFillGithub } from "react-icons/ai";

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionModal: React.FC<InstructionModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 z-50 rounded-2xl shadow-2xl relative w-full max-w-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">PDF RAG Assistant</h2>
        
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>
            This chatbot demonstrates a PDF-powered RAG (Retrieval-Augmented Generation) pattern using{" "}
            <a href="https://pinecone.io" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
              Pinecone
            </a>{" "}
            and OpenAI. Upload PDF documents and ask intelligent questions about their content.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">How to use:</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">📎 PDF Documents:</h4>
                <p>Click the paperclip icon in the chat to upload PDF files</p>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">🌐 Web Sources:</h4>
                <p>Click the earth icon in the chat to add website URLs to your list</p>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">📄 Document Sources Panel:</h4>
                <p>Use the buttons in the right panel to crawl added URLs and view document chunks</p>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">💬 Ask Questions:</h4>
                <p>Chat about your uploaded content and get intelligent responses with source citations</p>
              </div>
            </div>
          </div>
          
          <p className="text-sm">
            Use the settings menu (gear icon) to adjust themes and configure text splitting options for optimal performance.
          </p>
        </div>
      </div>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20"
        onClick={onClose}
      ></div>
    </div>
  );
};

export default InstructionModal;
