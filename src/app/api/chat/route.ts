
import { Message } from 'ai'
import { getContext } from '@/utils/context'
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Pinecone } from '@pinecone-database/pinecone';

// Use nodejs runtime for better compatibility with Pinecone SDK
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {

    const { messages } = await req.json()

    // Get the last message
    const lastMessage = messages[messages.length - 1]

    // Check if this is a document count/inventory question
    const isInventoryQuestion = /how many|count|list.*document|what.*document.*have|document.*upload/i.test(lastMessage.content);
    
    let context = '';
    
    if (isInventoryQuestion) {
      // For inventory questions, get full document list directly
      try {
        const pinecone = new Pinecone();
        const index = pinecone.Index(process.env.PINECONE_INDEX!);
        
        // Query for all PDF documents
        const pdfNamespace = index.namespace('pdf-documents');
        let pdfQuery;
        try {
          pdfQuery = await pdfNamespace.query({
            vector: new Array(1536).fill(0), // Dummy vector
            topK: 10000, // Get all documents
            includeMetadata: true,
            filter: {
              filename: { "$exists": true }
            }
          });
        } catch (error) {
          console.log('PDF query failed:', error);
          pdfQuery = { matches: [] };
        }

        // Query for all web documents
        const webNamespace = index.namespace('');
        let webQuery;
        try {
          webQuery = await webNamespace.query({
            vector: new Array(1536).fill(0), // Dummy vector
            topK: 10000, // Get all documents
            includeMetadata: true,
            filter: {
              url: { "$exists": true }
            }
          });
        } catch (error) {
          console.log('Web query failed:', error);
          webQuery = { matches: [] };
        }

        // Count unique PDF documents by filename
        const pdfDocuments = new Set();
        if (pdfQuery.matches) {
          pdfQuery.matches.forEach(match => {
            if (match.metadata?.filename) {
              pdfDocuments.add(match.metadata.filename);
            }
          });
        }

        // Count unique web documents by URL
        const webDocuments = new Set();
        if (webQuery.matches) {
          webQuery.matches.forEach(match => {
            if (match.metadata?.url) {
              webDocuments.add(match.metadata.url);
            }
          });
        }

        // Get document details
        const pdfDetails = Array.from(pdfDocuments).map(filename => {
          const chunks = pdfQuery.matches?.filter(m => m.metadata?.filename === filename) || [];
          return `- ${filename} (${chunks.length} chunks)`;
        });

        const webDetails = Array.from(webDocuments).map(url => {
          const chunks = webQuery.matches?.filter(m => m.metadata?.url === url) || [];
          return `- ${url} (${chunks.length} chunks)`;
        });

        const totalDocs = pdfDocuments.size + webDocuments.size;
        const totalChunks = (pdfQuery.matches?.length || 0) + (webQuery.matches?.length || 0);

        if (totalDocs === 0) {
          context = `DOCUMENT INVENTORY: No documents currently uploaded.

The knowledge base is empty. To get started:
1. Upload PDF files using the paperclip icon in the chat
2. Add website URLs using the earth icon in the chat

Once you upload documents, I'll be able to answer questions about their content.`;
        } else {
          context = `DOCUMENT INVENTORY:

PDF Documents (${pdfDocuments.size} documents, ${pdfQuery.matches?.length || 0} chunks):
${pdfDetails.length > 0 ? pdfDetails.join('\n') : '- No PDF documents'}

Web Documents (${webDocuments.size} documents, ${webQuery.matches?.length || 0} chunks):
${webDetails.length > 0 ? webDetails.join('\n') : '- No web documents'}

TOTAL: ${totalDocs} documents, ${totalChunks} chunks total`;
        }

      } catch (error) {
        console.error('Error getting inventory:', error);
        context = 'Error retrieving document inventory.';
      }
    } else {
      // For content questions, use semantic search as before
      console.log(`Processing content question: "${lastMessage.content}"`);
      
      const [pdfContext, webContext] = await Promise.all([
        getContext(
          lastMessage.content, 
          'pdf-documents', // PDF namespace
          2000, // Half the tokens for PDFs
          0.3,  // Even lower threshold for better recall
          true, // Get text
          8     // More results from PDFs
        ),
        getContext(
          lastMessage.content, 
          '', // Default namespace for web documents
          2000, // Half the tokens for web content
          0.3,  // Even lower threshold for better recall
          true, // Get text
          8     // More results from web content
        )
      ]);

      // Combine contexts
      context = [pdfContext, webContext].filter(c => c && c.trim()).join('\n\n---\n\n');
      console.log(`Final combined context length: ${context.length} characters`);
      
      if (!context || context.trim().length === 0) {
        // If no semantic matches, try to get any documents as a fallback
        console.log("No semantic matches found, trying fallback retrieval...");
        try {
          const fallbackContext = await getContext(
            "document content", // Generic query
            'pdf-documents',
            1000,
            0.0, // No threshold - get anything
            true,
            3
          );
          
          if (fallbackContext && fallbackContext.trim().length > 0) {
            context = `I couldn't find content specifically matching your question, but I can see you have documents available. Here's a sample of what's in your documents:\n\n${fallbackContext}\n\nPlease try rephrasing your question to be more specific about what you're looking for.`;
          } else {
            context = "No documents found in the knowledge base. Please upload PDF files or crawl web content first.";
          }
        } catch (error) {
          console.error("Fallback retrieval error:", error);
          context = "Error accessing document content. Please try again.";
        }
      }
    }

    const prompt = [
      {
        role: 'system',
        content: `You are an intelligent document analysis assistant specialized in answering questions about documents and web content.

IMPORTANT INSTRUCTIONS:
- You have access to extracted content from uploaded PDF documents and crawled web content in the CONTEXT BLOCK below
- Always prioritize information from the provided context when answering questions
- Format your responses using clear markdown for excellent readability
- Use proper headings, bullet points, and numbered lists when appropriate
- When citing information, reference the specific document/page number or web URL
- If the context doesn't contain relevant information, clearly state that the information is not available in the uploaded documents or crawled web content
- Be precise and factual, only using information directly from the context

CONTEXT BLOCK:
${context}
END OF CONTEXT BLOCK

FORMATTING GUIDELINES:
- Use ## for main headings and ### for subheadings
- Use **bold** for emphasis on key points
- Use bullet points (-) or numbered lists (1.) for structured information
- Use > for important quotes or highlights
- Group related information logically
- End with a clean source citation section using ### Sources
- Keep paragraphs concise and scannable
- Use line breaks between major sections

RESPONSE STRUCTURE TEMPLATE:
## [Main Topic/Answer]

### Key Points
- **Point 1**: Description
- **Point 2**: Description

### Detailed Information
1. **Topic A** (Page X): Explanation
2. **Topic B** (Page Y): Explanation

> Important quote or highlight if relevant

### Sources
- Document: [filename], Pages: [X, Y, Z]
- Web Content: [URL]

Guidelines:
- Answer questions based ONLY on the provided context
- If no relevant information is found, say: "I don't find information about this topic in the uploaded documents or crawled web content."
- Be helpful, thorough, and well-formatted when the context provides relevant information`,
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