"use client";

import React, { useEffect, useRef, useState, FormEvent } from "react";
import { Context } from "@/components/Context";
import Header from "@/components/Header";
import Chat from "@/components/Chat";
import { useChat } from "ai/react";
import InstructionModal from "./components/InstructionModal";
import { AiOutlineInfoCircle } from "react-icons/ai";
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

  const { messages, input, handleInputChange, handleSubmit } = useChat({
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
    <div className="flex flex-col justify-between h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 p-4 mx-auto max-w-full">
      <SideMenu 
        splittingMethod={splittingMethod}
        chunkSize={chunkSize}
        overlap={overlap}
        onSplittingMethodChange={setSplittingMethod}
        onChunkSizeChange={setChunkSize}
        onOverlapChange={setOverlap}
      />
      
      <Header className="my-6" />
      
      <button
        onClick={() => setModalOpen(true)}
        className="fixed left-4 top-4 text-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-30 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50"
        title="Help & Instructions"
      >
        <AiOutlineInfoCircle />
      </button>

      <InstructionModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
      
      <div className="flex w-full flex-grow overflow-hidden relative gap-4">
        <div className="flex-1 min-w-0">
          <Chat 
            splittingMethod={splittingMethod}
            chunkSize={chunkSize}
            overlap={overlap}
            onPDFUpload={(documents) => setUploadedDocuments(documents)}
            onWebCrawl={(documents) => setWebCrawlDocuments(documents)}
            urlEntries={urlEntries}
            setUrlEntries={setUrlEntries}
            setDocumentCards={setDocumentCards}
          />
        </div>
        
        <div className="hidden lg:flex w-96 bg-gray-200 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 transition-colors duration-200">
          <Context 
            className="w-full" 
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
          className="lg:hidden fixed bottom-20 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors"
          onClick={(e) => {
            const contextPanel = document.querySelector('.context-panel');
            contextPanel?.classList.toggle('translate-x-full');
          }}
        >
          ☰
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
  );
};

export default Page;
