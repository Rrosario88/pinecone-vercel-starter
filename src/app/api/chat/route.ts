
import { Message } from 'ai'
import { getContext } from '@/utils/context'
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Pinecone } from '@pinecone-database/pinecone';

// Use nodejs runtime for better compatibility with Pinecone SDK
export const runtime = 'nodejs'

// Helper function to get complete document inventory
async function getDocumentInventory() {
  try {
    const pinecone = new Pinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    console.log('Getting complete document inventory...');
    
    // Query for all PDF documents
    const pdfNamespace = index.namespace('pdf-documents');
    let pdfQuery;
    try {
      const { getEmbeddings } = await import('@/utils/embeddings');
      const docEmbedding = await getEmbeddings("document content text");
      
      pdfQuery = await pdfNamespace.query({
        vector: docEmbedding,
        topK: 10000,
        includeMetadata: true,
        filter: { filename: { "$exists": true } }
      });
    } catch (error) {
      console.log('PDF semantic query failed, trying zero vector:', error);
      pdfQuery = await pdfNamespace.query({
        vector: new Array(1536).fill(0),
        topK: 10000,
        includeMetadata: true,
        filter: { filename: { "$exists": true } }
      });
    }

    // Query for all web documents  
    const webNamespace = index.namespace('');
    let webQuery;
    try {
      const { getEmbeddings } = await import('@/utils/embeddings');
      const webEmbedding = await getEmbeddings("webpage content text");
      
      webQuery = await webNamespace.query({
        vector: webEmbedding,
        topK: 10000,
        includeMetadata: true,
        filter: { url: { "$exists": true } }
      });
    } catch (error) {
      console.log('Web semantic query failed, trying zero vector:', error);
      webQuery = await webNamespace.query({
        vector: new Array(1536).fill(0),
        topK: 10000,
        includeMetadata: true,
        filter: { url: { "$exists": true } }
      });
    }

    // Process documents
    const pdfDocuments = new Map();
    const webDocuments = new Map();
    
    pdfQuery.matches?.forEach(match => {
      if (match.metadata?.filename) {
        if (!pdfDocuments.has(match.metadata.filename)) {
          pdfDocuments.set(match.metadata.filename, {
            filename: match.metadata.filename,
            chunks: 0,
            uploadId: match.metadata.uploadId,
            type: 'pdf'
          });
        }
        pdfDocuments.get(match.metadata.filename).chunks++;
      }
    });

    webQuery.matches?.forEach(match => {
      if (match.metadata?.url) {
        if (!webDocuments.has(match.metadata.url)) {
          webDocuments.set(match.metadata.url, {
            url: match.metadata.url,
            chunks: 0,
            type: 'web'
          });
        }
        webDocuments.get(match.metadata.url).chunks++;
      }
    });

    const inventory = {
      totalDocuments: pdfDocuments.size + webDocuments.size,
      totalChunks: (pdfQuery.matches?.length || 0) + (webQuery.matches?.length || 0),
      pdfDocuments: Array.from(pdfDocuments.values()),
      webDocuments: Array.from(webDocuments.values())
    };
    
    console.log(`Document inventory: ${inventory.totalDocuments} documents, ${inventory.totalChunks} chunks`);
    return inventory;
    
  } catch (error) {
    console.error('Error getting document inventory:', error);
    return {
      totalDocuments: 0,
      totalChunks: 0,
      pdfDocuments: [],
      webDocuments: []
    };
  }
}

export async function POST(req: Request) {
  try {
    const { messages, use_autogen = false, agent_config } = await req.json()
    
    // Get complete document inventory for ALL requests
    const documentInventory = await getDocumentInventory();

    // If AutoGen is requested, try to use it first
    if (use_autogen && process.env.AUTOGEN_SERVICE_URL) {
      try {
        const autoGenResponse = await fetch(`${process.env.AUTOGEN_SERVICE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            use_multi_agent: true,
            document_inventory: documentInventory, // Pass complete document inventory to AutoGen
            agent_config: agent_config || {
              use_researcher: true,
              use_critic: true,
              use_summarizer: false,
              context_strategy: 'comprehensive'
            }
          })
        })

        if (autoGenResponse.ok) {
          const result = await autoGenResponse.json()
          // Return streaming response compatible with existing frontend
          return new Response(result.final_response, {
            headers: {
              'Content-Type': 'text/plain',
              'X-AutoGen-Used': 'true',
              'X-Agents-Involved': result.agents_involved.join(',')
            }
          })
        }
      } catch (error) {
        console.log('AutoGen unavailable, falling back to standard chat:', error)
      }
    }

    // Get the last message
    const lastMessage = messages[messages.length - 1]
    
    console.log(`Processing question: "${lastMessage.content}"`);
    
    // Always get semantic context for content questions
    const [pdfContext, webContext] = await Promise.all([
      getContext(
        lastMessage.content, 
        'pdf-documents', // PDF namespace
        3000, // More tokens for better context
        0.25, // Lower threshold for better recall
        true, // Get text
        12    // More results from PDFs
      ),
      getContext(
        lastMessage.content, 
        '', // Default namespace for web documents
        3000, // More tokens for better context
        0.25, // Lower threshold for better recall
        true, // Get text
        12    // More results from web content
      )
    ]);

    // Combine contexts
    let context = [pdfContext, webContext].filter(c => c && c.trim() && c !== "No relevant information found in the knowledge base.").join('\n\n---\n\n');
    console.log(`Semantic context length: ${context.length} characters`);
    
    // If no semantic matches found, provide fallback with document awareness
    if (!context || context.trim().length === 0) {
      console.log("No semantic matches found, providing document-aware fallback...");
      if (documentInventory.totalDocuments === 0) {
        context = "No documents found in the knowledge base. Please upload PDF files or crawl web content first.";
      } else {
        // Try broad context retrieval
        try {
          const fallbackContext = await getContext(
            "document content text information", // Generic query
            'pdf-documents',
            1500,
            0.0, // No threshold - get anything
            true,
            5
          );
          
          context = fallbackContext && fallbackContext.trim() ? fallbackContext : 
            `I have access to ${documentInventory.totalDocuments} documents (${documentInventory.pdfDocuments.length} PDFs, ${documentInventory.webDocuments.length} web sources) but couldn't find specific content matching your question. Please try rephrasing your question or ask about specific documents.`;
        } catch (error) {
          console.error("Fallback retrieval error:", error);
          context = "Error accessing document content. Please try again.";
        }
      }
    }

    // Create internal document awareness for the system (not exposed to user)
    const availableDocuments = documentInventory.totalDocuments > 0 ? 
      `AVAILABLE DOCUMENTS:
PDF Documents: ${documentInventory.pdfDocuments.map(d => d.filename).join(', ')}
Web Documents: ${documentInventory.webDocuments.map(d => d.url).join(', ')}
Total: ${documentInventory.totalDocuments} documents with ${documentInventory.totalChunks} content chunks` :
      `No documents currently available in the knowledge base.`;

    const prompt = [
      {
        role: 'system',
        content: `You are an intelligent document analysis assistant. You have access to uploaded PDFs and web content to answer questions accurately.

${availableDocuments}

CONTEXT FROM YOUR KNOWLEDGE BASE:
${context}

INSTRUCTIONS:
- Answer questions using ONLY the information from the provided context
- Write naturally and conversationally - avoid mentioning "document inventory" or technical system details
- When you know what documents are available, reference them naturally (e.g., "Based on your uploaded document [filename]...")
- For document list questions, provide clean, organized lists without technical jargon
- Use clear markdown formatting for better readability
- Always cite sources using document names or URLs
- If information isn't in your knowledge base, say so clearly
- Be helpful and suggest related information from available documents when relevant

FORMATTING:
- Use ## for main headings and ### for subheadings  
- Use **bold** for key points
- Use bullet points (-) or numbered lists (1.) for structure
- Use > for important quotes
- Always include a ### Sources section with document references

RESPONSE STYLE:
- Natural and conversational
- Professional but approachable  
- Focus on being helpful and informative
- Don't mention system mechanics or technical processes
- Reference documents naturally in context`,
      },
    ]

    const result = await streamText({
      model: openai("gpt-4o"),
      messages: [...prompt,...messages.filter((message: Message) => message.role === 'user')]
    });

    return result.toDataStreamResponse();
  } catch (e) {
    throw (e)
  }
}