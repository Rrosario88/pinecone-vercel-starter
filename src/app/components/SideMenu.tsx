'use client';

import React, { useState } from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface SideMenuProps {
  splittingMethod?: string;
  chunkSize?: number;
  overlap?: number;
  onSplittingMethodChange?: (method: string) => void;
  onChunkSizeChange?: (size: number) => void;
  onOverlapChange?: (overlap: number) => void;
  useAutoGen?: boolean;
  onUseAutoGenChange?: (use: boolean) => void;
  autoGenConfig?: {
    use_researcher: boolean;
    use_critic: boolean;
    use_summarizer: boolean;
    context_strategy: 'comprehensive' | 'focused' | 'quick';
  };
  onAutoGenConfigChange?: (config: any) => void;
}

export function SideMenu({
  splittingMethod = 'markdown',
  chunkSize = 256,
  overlap = 1,
  onSplittingMethodChange,
  onChunkSizeChange,
  onOverlapChange,
  useAutoGen = false,
  onUseAutoGenChange,
  autoGenConfig = {
    use_researcher: true,
    use_critic: true,
    use_summarizer: false,
    context_strategy: 'comprehensive'
  },
  onAutoGenConfigChange,
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
        className="group fixed top-4 right-4 z-50 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
        title="Settings"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-full"></div>
        <svg className="relative w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
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
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md"></div>
              
              {/* Icon without background circle */}
              {(() => {
                const currentTheme = themes.find(t => t.value === theme) || themes[0];
                const CurrentIcon = currentTheme.icon;
                return <CurrentIcon size={18} className="relative text-gray-600 dark:text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-all duration-200" />;
              })()}
            </button>
            
            <button
              onClick={toggleMenu}
              className="group relative transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
              <X size={20} className="relative text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 transition-colors" />
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
                  className="p-3 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-gray-100 w-full appearance-none hover:cursor-pointer transition-colors focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="recursive">Recursive Text Splitting</option>
                  <option value="markdown">Markdown Splitting</option>
                </select>
              </div>
              
              {splittingMethod === "recursive" && (
                <div className="space-y-4">
                  <div className="flex flex-col group/slider">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Chunk Size: {chunkSize} characters
                    </label>
                    <input
                      type="range"
                      min={200}
                      max={2048}
                      step={8}
                      value={chunkSize}
                      onChange={(e) => onChunkSizeChange?.(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-orange"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 opacity-0 group-hover/slider:opacity-100 transition-all duration-500 ease-in-out transform group-hover/slider:translate-y-0 translate-y-1">
                      <span className="transition-all duration-500 ease-in-out delay-75">200 chars</span>
                      <span className="transition-all duration-500 ease-in-out delay-150">2048 chars</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col group/overlap">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Overlap: {overlap}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={200}
                      value={overlap}
                      onChange={(e) => onOverlapChange?.(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-orange"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 opacity-0 group-hover/overlap:opacity-100 transition-all duration-500 ease-in-out transform group-hover/overlap:translate-y-0 translate-y-1">
                      <span className="transition-all duration-500 ease-in-out delay-75">1</span>
                      <span className="transition-all duration-500 ease-in-out delay-150">200</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AutoGen Settings */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Multi-Agent Intelligence
            </h3>
            
            <div className="space-y-4">
              {/* AutoGen Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="10" rx="2" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h.01M15 9h.01" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4M12 16v6M6 12H2M22 12h-4" />
                  </svg>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Enable AutoGen
                  </label>
                </div>
                <div 
                  className={`group relative w-4 h-4 rounded-full border-2 transition-all duration-300 cursor-pointer hover:scale-110 ${
                    useAutoGen 
                      ? 'bg-orange-500 border-orange-500' 
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                  onClick={() => onUseAutoGenChange?.(!useAutoGen)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-full"></div>
                  {useAutoGen && (
                    <div className="absolute inset-0.5 bg-white rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* AutoGen Configuration */}
              {useAutoGen && (
                <div className="space-y-3 pl-6 border-l-2 border-orange-300 dark:border-orange-600">
                  {/* Agent Toggles */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-gray-800 dark:text-gray-200">Context Explorer</span>
                      </div>
                      <div 
                        className={`group relative w-3 h-3 rounded-full border-2 transition-all duration-300 cursor-pointer hover:scale-110 ${
                          autoGenConfig.use_researcher 
                            ? 'bg-orange-500 border-orange-500' 
                            : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                        }`}
                        onClick={() => onAutoGenConfigChange?.({...autoGenConfig, use_researcher: !autoGenConfig.use_researcher})}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-full"></div>
                        {autoGenConfig.use_researcher && (
                          <div className="absolute inset-0.5 bg-white rounded-full flex items-center justify-center">
                            <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between text-sm cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-800 dark:text-gray-200">Quality Assurance</span>
                      </div>
                      <div 
                        className={`group relative w-3 h-3 rounded-full border-2 transition-all duration-300 cursor-pointer hover:scale-110 ${
                          autoGenConfig.use_critic 
                            ? 'bg-orange-500 border-orange-500' 
                            : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                        }`}
                        onClick={() => onAutoGenConfigChange?.({...autoGenConfig, use_critic: !autoGenConfig.use_critic})}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-full"></div>
                        {autoGenConfig.use_critic && (
                          <div className="absolute inset-0.5 bg-white rounded-full flex items-center justify-center">
                            <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between text-sm cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span className="text-gray-800 dark:text-gray-200">Content Optimizer</span>
                      </div>
                      <div 
                        className={`group relative w-3 h-3 rounded-full border-2 transition-all duration-300 cursor-pointer hover:scale-110 ${
                          autoGenConfig.use_summarizer 
                            ? 'bg-orange-500 border-orange-500' 
                            : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                        }`}
                        onClick={() => onAutoGenConfigChange?.({...autoGenConfig, use_summarizer: !autoGenConfig.use_summarizer})}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-full"></div>
                        {autoGenConfig.use_summarizer && (
                          <div className="absolute inset-0.5 bg-white rounded-full flex items-center justify-center">
                            <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Analysis Strategy */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Analysis Strategy
                    </label>
                    <select
                      value={autoGenConfig.context_strategy}
                      onChange={(e) => onAutoGenConfigChange?.({...autoGenConfig, context_strategy: e.target.value as any})}
                      className="text-xs p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="comprehensive">Comprehensive</option>
                      <option value="focused">Focused</option>
                      <option value="quick">Quick</option>
                    </select>
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