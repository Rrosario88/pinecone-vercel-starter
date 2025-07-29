import React, { useState } from "react";
import { AiFillGithub } from "react-icons/ai";

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'documents' | 'management' | 'chat' | 'settings';

const InstructionModal: React.FC<InstructionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '🏠' },
    { id: 'documents' as TabType, label: 'Add Documents', icon: '📚' },
    { id: 'management' as TabType, label: 'Management', icon: '🔧' },
    { id: 'chat' as TabType, label: 'Chat', icon: '💬' },
    { id: 'settings' as TabType, label: 'Settings', icon: '⚙️' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              RAGenie is an intelligent document assistant powered by RAG (Retrieval-Augmented Generation) using{" "}
              <a href="https://pinecone.io" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                Pinecone
              </a>{" "}
              and OpenAI. Upload documents, crawl websites, and ask intelligent questions with accurate citations.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">🚀 Quick Start:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>Upload PDF documents or add website URLs</li>
                <li>Let RAGenie process and index your content</li>
                <li>Ask questions about your documents</li>
                <li>Get intelligent answers with source citations</li>
              </ol>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">📎 PDF Upload:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Click the paperclip icon in the chat input</li>
                <li>Select multiple PDF files for batch upload</li>
                <li>Watch real-time upload progress with detailed status</li>
                <li>Files are automatically chunked and indexed</li>
              </ul>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">🌐 Website Crawling:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Click the earth icon to add website URLs</li>
                <li>Use &quot;Crawl&quot; buttons in the Document Sources panel</li>
                <li>Web content is extracted and indexed automatically</li>
                <li>Supports most public websites and documentation</li>
              </ul>
            </div>
          </div>
        );

      case 'management':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">📋 Document Sources Panel:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>View all uploaded PDFs and crawled websites</li>
                <li>Click arrows to expand and view document chunks</li>
                <li>Each chunk is numbered and searchable</li>
                <li>Delete individual documents with trash icon</li>
              </ul>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-3">🗑️ Cleanup Options:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>&quot;Clear Documents&quot; removes all indexed content</li>
                <li>Individual delete buttons for specific documents</li>
                <li>Deletions are permanent and cannot be undone</li>
              </ul>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">🎯 Ask Questions:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Ask about content from any uploaded document</li>
                <li>Get responses with accurate source citations</li>
                <li>Questions can span multiple documents</li>
                <li>AI provides context-aware, detailed answers</li>
              </ul>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-3">📖 Response Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Source citations show which documents were used</li>
                <li>Click citations to highlight relevant chunks</li>
                <li>Markdown formatting for better readability</li>
                <li>Images from documents render properly</li>
              </ul>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-3">🎨 Appearance:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Toggle between light and dark themes</li>
                <li>Click gear icon to access settings menu</li>
                <li>Theme preference is saved automatically</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">📝 Text Processing:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Adjust chunk size (200-2048 characters)</li>
                <li>Set chunk overlap (1-200 characters)</li>
                <li>Choose splitting method (markdown/recursive)</li>
              </ul>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <p><strong>💡 Pro Tips:</strong> For best results, use descriptive questions, upload related documents together, and adjust chunk size based on your content type (smaller for detailed info, larger for contextual understanding).</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 z-50 rounded-2xl shadow-2xl relative w-full max-w-3xl border border-gray-200 dark:border-gray-700 transition-colors duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">RAGenie - AI Document Assistant</h2>
          <button
            onClick={onClose}
            className="group relative transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg rounded-full"></div>
            <span className="relative text-2xl text-gray-400 hover:text-orange-500 dark:text-gray-500 dark:hover:text-orange-400 transition-colors">&times;</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {renderTabContent()}
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
