import { Flame } from 'lucide-react';

export default function Header({ className }: { className?: string }) {
  return (
    <header
      className={`flex items-center justify-center text-gray-900 dark:text-gray-100 transition-colors duration-200 ${className}`}
    >
      <div className="flex items-center gap-4 group">
        {/* Genie Icon */}
        <div className="group-hover:scale-110 transition-transform duration-300 ease-in-out">
          <Flame 
            size={48} 
            className="text-purple-600 dark:text-purple-400 drop-shadow-lg" 
          />
        </div>
        
        {/* App Name */}
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 dark:from-purple-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent transition-all duration-300">
            RAGenie
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wider">
            AI Document Assistant
          </p>
        </div>
      </div>
    </header>
  );
}
