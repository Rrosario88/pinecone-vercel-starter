'use client';

import React, { useState } from 'react';
import { Settings, X, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface SideMenuProps {
  splittingMethod?: string;
  chunkSize?: number;
  overlap?: number;
  onSplittingMethodChange?: (method: string) => void;
  onChunkSizeChange?: (size: number) => void;
  onOverlapChange?: (overlap: number) => void;
}

export function SideMenu({
  splittingMethod = 'markdown',
  chunkSize = 256,
  overlap = 1,
  onSplittingMethodChange,
  onChunkSizeChange,
  onOverlapChange,
}: SideMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light', icon: Sun, label: 'Light Mode', description: 'Clean white interface' },
    { value: 'dark', icon: Moon, label: 'Dark Mode', description: 'Dark professional theme' },
    { value: 'system', icon: Monitor, label: 'System', description: 'Follow OS preference' },
  ] as const;

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 right-4 z-50 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
        title="Settings"
      >
        <Settings size={20} className="transition-transform duration-200" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={toggleMenu}
        />
      )}

      {/* Side Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-l border-gray-200 dark:border-gray-700 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button - in corner */}
            <button
              onClick={() => {
                const currentIndex = themes.findIndex(t => t.value === theme);
                const nextIndex = (currentIndex + 1) % themes.length;
                setTheme(themes[nextIndex].value);
              }}
              className="group relative transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
              title={`Current: ${themes.find(t => t.value === theme)?.label} (click to cycle)`}
            >
              {/* Background glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
              
              {/* Icon without background circle */}
              {(() => {
                const currentTheme = themes.find(t => t.value === theme) || themes[0];
                const CurrentIcon = currentTheme.icon;
                return <CurrentIcon size={18} className="relative text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-all duration-200" />;
              })()}
            </button>
            
            <button
              onClick={toggleMenu}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Document Processing Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Document Processing
            </h3>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Splitting Method
                </label>
                <select
                  value={splittingMethod}
                  onChange={(e) => onSplittingMethodChange?.(e.target.value)}
                  className="p-3 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-gray-100 w-full appearance-none hover:cursor-pointer transition-colors"
                >
                  <option value="recursive">Recursive Text Splitting</option>
                  <option value="markdown">Markdown Splitting</option>
                </select>
              </div>
              
              {splittingMethod === "recursive" && (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Chunk Size: {chunkSize}
                    </label>
                    <input
                      type="range"
                      min={200}
                      max={2048}
                      value={chunkSize}
                      onChange={(e) => onChunkSizeChange?.(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>200</span>
                      <span>2048</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Overlap: {overlap}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={200}
                      value={overlap}
                      onChange={(e) => onOverlapChange?.(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1</span>
                      <span>200</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              About
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>PDF RAG Assistant</p>
              <p>Powered by Pinecone & OpenAI</p>
              <p className="text-xs opacity-70">Built with Next.js</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}