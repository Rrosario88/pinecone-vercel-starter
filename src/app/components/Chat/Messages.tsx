import { Message } from "ai";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface MessagesProps {
  messages: Message[];
  onRegenerate?: (messageIndex: number) => void;
}

export default function Messages({ messages, onRegenerate }: MessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleRegenerate = (index: number) => {
    if (onRegenerate) {
      onRegenerate(index);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 overflow-y-auto flex-grow flex flex-col max-h-[70vh] min-h-[400px] transition-colors duration-200 shadow-sm">
      <div className="flex-1 space-y-6 p-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-4 ${
              msg.role === "assistant" ? "justify-start" : "justify-end"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                AI
              </div>
            )}
            
            <div className={`relative group max-w-[80%] ${
              msg.role === "assistant" 
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm" 
                : "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
            } p-4 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200`}>
              {msg.role === "assistant" ? (
                <>
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2 border-b border-gray-300 dark:border-gray-600 pb-1">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-2">
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 my-2 ml-2 text-gray-700 dark:text-gray-300">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 my-2 ml-2 text-gray-700 dark:text-gray-300">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900 dark:text-gray-100">
                          {children}
                        </strong>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 my-3 italic bg-gray-100 dark:bg-gray-600 py-2 rounded text-gray-700 dark:text-gray-300">
                          {children}
                        </blockquote>
                      ),
                      p: ({ children }) => (
                        <p className="mb-2 leading-relaxed text-gray-700 dark:text-gray-300">
                          {children}
                        </p>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-gray-800 dark:text-gray-200 text-sm font-mono">
                          {children}
                        </code>
                      )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  
                  {/* Quick Actions Menu - Subtle floating menu */}
                  <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-80 transition-opacity duration-300">
                    <div className="flex gap-1.5">
                      {/* Copy Button */}
                      <button
                        onClick={() => copyToClipboard(msg.content, index)}
                        className="group/btn relative p-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                        title="Copy to clipboard"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 opacity-0 group-hover/btn:opacity-80 transition-opacity duration-200 blur-sm rounded-full"></div>
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200/50 dark:border-gray-600/50"></div>
                        {copiedIndex === index ? (
                          // Check icon
                          <svg className="relative w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          // Copy icon
                          <svg className="relative w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      
                      {/* Regenerate Button */}
                      <button
                        onClick={() => handleRegenerate(index)}
                        className="group/btn relative p-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                        title="Regenerate response"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 opacity-0 group-hover/btn:opacity-80 transition-opacity duration-200 blur-sm rounded-full"></div>
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200/50 dark:border-gray-600/50"></div>
                        {/* Refresh icon */}
                        <svg className="relative w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-white">{msg.content}</p>
              )}
            </div>
            
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-400 flex items-center justify-center text-white dark:text-gray-900 text-sm font-medium flex-shrink-0">
                U
              </div>
            )}
          </div>
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}
