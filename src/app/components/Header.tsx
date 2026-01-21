import { Flame } from 'lucide-react';

export default function Header({ className }: { className?: string }) {
  return (
    <header
      className={`flex items-center justify-center text-gray-900 dark:text-gray-100 transition-colors duration-200 ${className}`}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Project Badge */}
        <span className="px-3 py-1 text-xs font-medium tracking-wide rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          PINECONE-VERCEL-STARTER
        </span>

        <div className="flex items-center gap-4 group">
          {/* Flame Icon */}
        <div className="relative group-hover:scale-110 transition-transform duration-300 ease-in-out">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-xl rounded-full"></div>
          <Flame
            size={48}
            className="relative text-orange-600 dark:text-orange-400 drop-shadow-lg"
          />
        </div>
        
        {/* App Name */}
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 dark:from-orange-400 dark:via-red-400 dark:to-amber-400 bg-clip-text text-transparent transition-all duration-300">
            RAG Chat
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wider">
            Igniting Document Intelligence
          </p>
        </div>
        </div>
      </div>
    </header>
  );
}
