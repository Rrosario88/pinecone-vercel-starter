import { Message } from "ai";
import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function Messages({ messages }: { messages: Message[] }) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            
            <div className={`max-w-[80%] ${
              msg.role === "assistant" 
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm" 
                : "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
            } p-4 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-200`}>
              {msg.role === "assistant" ? (
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
