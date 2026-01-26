"use client";

import { Message } from "ai";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MessagesProps {
  messages: Message[];
  onRegenerate?: (messageIndex: number) => void;
}

export default function Messages({ messages, onRegenerate }: MessagesProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const shouldAutoScrollRef = useRef(true);

  // Get the last message content for tracking streaming updates
  const lastMessageContent = messages[messages.length - 1]?.content || '';

  // Check if scrolled near bottom
  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (!shouldAutoScrollRef.current) return;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Handle scroll events - disable auto-scroll if user scrolls up
  const handleScroll = useCallback(() => {
    shouldAutoScrollRef.current = isNearBottom();
  }, [isNearBottom]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    shouldAutoScrollRef.current = true;
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [lastMessageContent, scrollToBottom]);

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard API failed - silently ignore
    }
  };

  const handleRegenerate = (index: number) => {
    if (onRegenerate) {
      onRegenerate(index);
    }
  };

  // Memoize ReactMarkdown components to prevent recreation on every render
  // Using smaller text sizes (text-sm base) to fit more content on screen
  const markdownComponents: Components = useMemo(() => ({
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
    h2: ({ children }) => (
      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1.5 border-b border-gray-300 dark:border-gray-600 pb-1">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2 mb-1">
        {children}
      </h3>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside space-y-0.5 my-1.5 ml-2 text-sm text-gray-700 dark:text-gray-300">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside space-y-0.5 my-1.5 ml-2 text-sm text-gray-700 dark:text-gray-300">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-snug text-sm">
        {children}
      </li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100">
        {children}
      </strong>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-3 border-blue-500 pl-3 my-2 italic bg-gray-100 dark:bg-gray-600 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300">
        {children}
      </blockquote>
    ),
    p: ({ children }) => (
      <p className="mb-1.5 leading-snug text-sm text-gray-700 dark:text-gray-300">
        {children}
      </p>
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 text-xs font-mono">
        {children}
      </code>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-2 -mx-1">
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-xs">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-100 dark:bg-gray-700">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="bg-white dark:bg-gray-800">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-left font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 text-xs">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-gray-700 dark:text-gray-300 text-xs">
        {children}
      </td>
    ),
    br: () => <br />,
    div: ({ children }) => <div>{children}</div>,
    span: ({ children }) => <span>{children}</span>
  }), []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 h-full max-h-full flex flex-col transition-colors duration-200 shadow-sm overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${
              msg.role === "assistant" ? "justify-start" : "justify-end"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                AI
              </div>
            )}

            <div className={`relative group max-w-[85%] ${
              msg.role === "assistant"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl rounded-tl-sm"
                : "bg-blue-600 text-white rounded-xl rounded-tr-sm"
            } px-3 py-2 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200`}>
              {msg.role === "assistant" ? (
                <>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {msg.content.replace(/<br\s*\/?>/gi, '\n\n')}
                  </ReactMarkdown>
                  
                  {/* Quick Actions Menu - Subtle floating menu */}
                  <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-80 transition-opacity duration-300">
                    <div className="flex gap-1.5">
                      {/* Copy Button */}
                      <button
                        onClick={() => copyToClipboard(msg.content, index)}
                        className="p-1.5 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
                        title="Copy to clipboard"
                      >
                        {copiedIndex === index ? (
                          // Check icon
                          <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          // Copy icon
                          <svg className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      
                      {/* Regenerate Button */}
                      <button
                        onClick={() => handleRegenerate(index)}
                        className="p-1.5 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
                        title="Regenerate response"
                      >
                        {/* Refresh icon */}
                        <svg className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white">{msg.content}</p>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-gray-600 dark:bg-gray-400 flex items-center justify-center text-white dark:text-gray-900 text-xs font-medium flex-shrink-0">
                U
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
