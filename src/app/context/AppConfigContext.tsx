'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AutoGenConfig, DEFAULT_AUTOGEN_CONFIG } from '@/types';

type SplittingMethod = 'markdown' | 'recursive';

interface AppConfigContextType {
  // Document processing settings
  splittingMethod: SplittingMethod;
  setSplittingMethod: (method: SplittingMethod) => void;
  chunkSize: number;
  setChunkSize: (size: number) => void;
  overlap: number;
  setOverlap: (overlap: number) => void;

  // AutoGen settings
  useAutoGen: boolean;
  setUseAutoGen: (use: boolean) => void;
  toggleAutoGen: () => void;
  autoGenConfig: AutoGenConfig;
  setAutoGenConfig: (config: AutoGenConfig) => void;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

interface AppConfigProviderProps {
  children: React.ReactNode;
  initialSplittingMethod?: SplittingMethod;
  initialChunkSize?: number;
  initialOverlap?: number;
  initialUseAutoGen?: boolean;
  initialAutoGenConfig?: AutoGenConfig;
}

export function AppConfigProvider({
  children,
  initialSplittingMethod = 'markdown',
  initialChunkSize = 256,
  initialOverlap = 1,
  initialUseAutoGen = false,
  initialAutoGenConfig = DEFAULT_AUTOGEN_CONFIG,
}: AppConfigProviderProps) {
  // Document processing state
  const [splittingMethod, setSplittingMethod] = useState<SplittingMethod>(initialSplittingMethod);
  const [chunkSize, setChunkSize] = useState(initialChunkSize);
  const [overlap, setOverlap] = useState(initialOverlap);

  // AutoGen state
  const [useAutoGen, setUseAutoGen] = useState(initialUseAutoGen);
  const [autoGenConfig, setAutoGenConfig] = useState<AutoGenConfig>(initialAutoGenConfig);

  const toggleAutoGen = useCallback(() => {
    setUseAutoGen(prev => !prev);
  }, []);

  const value: AppConfigContextType = {
    splittingMethod,
    setSplittingMethod,
    chunkSize,
    setChunkSize,
    overlap,
    setOverlap,
    useAutoGen,
    setUseAutoGen,
    toggleAutoGen,
    autoGenConfig,
    setAutoGenConfig,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}
