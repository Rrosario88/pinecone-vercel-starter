/**
 * Shared TypeScript interfaces for the PDF RAG application
 */

// Re-export ICard from Context/Card for convenience
export type { ICard } from '@/components/Context/Card';

/**
 * AutoGen agent configuration
 */
export interface AutoGenConfig {
  use_researcher: boolean;
  use_critic: boolean;
  use_summarizer: boolean;
  context_strategy: 'comprehensive' | 'focused' | 'quick';
}

/**
 * Context result from Pinecone query
 */
export interface ContextResult {
  id: string;
  score: number;
  metadata: {
    filename?: string;
    pageNumber?: number;
    url?: string;
    chunk: string;
    text: string;
    hash?: string;
    type?: string;
  };
}

/**
 * Document card for display in the UI
 * This is the shape used in state management
 */
export interface DocumentCard {
  pageContent: string;
  metadata: {
    hash: string;
    url?: string;
    filename?: string;
    pageNumber?: number;
    type?: string;
    uploadId?: string;
  };
}

/**
 * Uploaded file tracking state
 */
export interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  uploading?: boolean;
  status?: 'uploading' | 'processing' | 'extracting' | 'embedding' | 'indexing' | 'completed' | 'failed';
  statusMessage?: string;
  progress?: number;
}

/**
 * API response for context retrieval
 */
export interface ContextResponse {
  context: ContextResult[];
}

/**
 * Chat request body sent to API
 */
export interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  use_autogen?: boolean;
  agent_config?: AutoGenConfig;
}

/**
 * PDF upload response from API
 */
export interface PDFUploadResponse {
  success: boolean;
  documents: DocumentCard[];
  filename: string;
  chunks: number;
}

/**
 * Default AutoGen configuration
 */
export const DEFAULT_AUTOGEN_CONFIG: AutoGenConfig = {
  use_researcher: true,
  use_critic: true,
  use_summarizer: false,
  context_strategy: 'comprehensive',
};
