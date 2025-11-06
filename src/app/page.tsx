"use client";

import React, { useEffect, useRef, useState, FormEvent } from "react";
import { Context } from "@/components/Context";
import Header from "@/components/Header";
import Chat from "@/components/Chat";
import { useChat } from "ai/react";
import InstructionModal from "./components/InstructionModal";
import { HelpCircle } from "lucide-react";
import { SideMenu } from "@/components/SideMenu";
import { IUrlEntry } from "@/components/Context/UrlButton";

const Page: React.FC = () => {
  const [gotMessages, setGotMessages] = useState(false);
  const [context, setContext] = useState<string[] | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  
  // Splitting method state
  const [splittingMethod, setSplittingMethod] = useState("markdown");
  const [chunkSize, setChunkSize] = useState(256);
  const [overlap, setOverlap] = useState(1);
  
  // PDF upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [webCrawlDocuments, setWebCrawlDocuments] = useState<any[]>([]);
  
  // URL management state
  const [urlEntries, setUrlEntries] = useState<IUrlEntry[]>([]);
  
  // Shared document cards state
  const [documentCards, setDocumentCards] = useState<any[]>([]);
  
  // AutoGen state
  const [useAutoGen, setUseAutoGen] = useState(false);
  const [autoGenConfig, setAutoGenConfig] = useState({
    use_researcher: true,
    use_critic: true,
    use_summarizer: false,
    context_strategy: 'comprehensive' as 'comprehensive' | 'focused' | 'quick'
  });

  // Use the fixed chat endpoint that handles AutoGen properly
  const { messages, input, handleInputChange, handleSubmit, reload, isLoading } = useChat({
    api: "/api/chat-fixed",
    body: {
      use_autogen: useAutoGen,
      agent_config: autoGenConfig
    },
    onFinish: async () => {
      setGotMessages(true);
    },
  });

  const prevMessagesLengthRef = useRef(messages.length);

  const handleMessageSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(e);
    setContext(null);
    setGotMessages(false);
  };

  useEffect(() => {
    const getContext = async () => {
      const response = await fetch("/api/context", {
        method: "POST",
        body: JSON.stringify({
          messages,
        }),
      });
      const { context } = await response.json();
      setContext(context.map((c: any) => c.id));
    };
    if (gotMessages && messages.length >= prevMessagesLengthRef.current) {
      getContext();
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, gotMessages]);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="group fixed left-4 top-4 z-50 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
        title="Help & Instructions"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-full"></div>
        <svg className="relative w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <SideMenu 
        splittingMethod={splittingMethod}
        chunkSize={chunkSize}
        overlap={overlap}
        onSplittingMethodChange={setSplittingMethod}
        onChunkSizeChange={setChunkSize}
        onOverlapChange={setOverlap}
        useAutoGen={useAutoGen}
        onUseAutoGenChange={setUseAutoGen}
        autoGenConfig={autoGenConfig}
        onAutoGenConfigChange={setAutoGenConfig}
      />
      
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-200">
        
        <Header className="flex-shrink-0 py-4 px-6" />

        <InstructionModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
        />
      
      <div className="flex flex-1 overflow-hidden relative gap-4 px-4 pb-4">
        <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-200px)]">
          <Chat 
            splittingMethod={splittingMethod}
            chunkSize={chunkSize}
            overlap={overlap}
            onPDFUpload={(documents) => {
              console.log('PDF Upload Success - Documents received:', documents.length, 'chunks');
              setUploadedDocuments(documents);
              setDocumentCards(prev => {
                const newCards = [...prev, ...documents];
                console.log('Updated document cards total:', newCards.length);
                return newCards;
              });
            }}
            onWebCrawl={(documents) => {
              console.log('Web Crawl Success - Documents received:', documents.length, 'chunks');
              setWebCrawlDocuments(documents);
              setDocumentCards(prev => {
                const newCards = [...prev, ...documents];
                console.log('Updated document cards total:', newCards.length);
                return newCards;
              });
            }}
            urlEntries={urlEntries}
            setUrlEntries={setUrlEntries}
            setDocumentCards={setDocumentCards}
            useAutoGen={useAutoGen}
            onToggleAutoGen={() => setUseAutoGen(!useAutoGen)}
            autoGenConfig={autoGenConfig}
            // Pass chat state as props
            messages={messages}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleMessageSubmit}
            reload={reload}
            isLoading={isLoading}
          />
        </div>
        
        <div className="hidden lg:flex w-96 flex-col bg-gray-200 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 transition-colors duration-200 h-[calc(100vh-200px)]">
          <Context 
            className="w-full h-full" 
            selected={context}
            splittingMethod={splittingMethod}
            chunkSize={chunkSize}
            overlap={overlap}
            urlEntries={urlEntries}
            setUrlEntries={setUrlEntries}
            documentCards={documentCards}
            setDocumentCards={setDocumentCards}
          />
        </div>
        
        <button
          type="button"
          className="group relative lg:hidden fixed bottom-20 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
          onClick={(e) => {
            const contextPanel = document.querySelector('.context-panel');
            contextPanel?.classList.toggle('translate-x-full');
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg rounded-full"></div>
          <span className="relative">☰</span>
        </button>
        
        <div className="context-panel lg:hidden fixed inset-y-0 right-0 w-80 bg-gray-200 dark:bg-gray-800 shadow-xl transform translate-x-full transition-transform duration-300 ease-in-out border-l border-gray-300 dark:border-gray-700 z-40">
          <Context 
            className="h-full" 
            selected={context}
            splittingMethod={splittingMethod}
            chunkSize={chunkSize}
            overlap={overlap}
            urlEntries={urlEntries}
            setUrlEntries={setUrlEntries}
            documentCards={documentCards}
            setDocumentCards={setDocumentCards}
          />
        </div>
      </div>
      </div>
    </>
  );
};

export default Page;
