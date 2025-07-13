
import { Message } from 'ai'
import { getContext } from '@/utils/context'
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge'

export async function POST(req: Request) {
  try {

    const { messages } = await req.json()

    // Get the last message
    const lastMessage = messages[messages.length - 1]

    // Get context from PDF documents with enhanced retrieval
    const context = await getContext(
      lastMessage.content, 
      'pdf-documents', // Use PDF namespace
      4000, // More tokens
      0.5,  // Lower threshold for better recall
      true, // Get text
      8     // More results
    )

    const prompt = [
      {
        role: 'system',
        content: `You are an intelligent document analysis assistant specialized in answering questions about PDF documents.

IMPORTANT INSTRUCTIONS:
- You have access to extracted content from uploaded PDF documents in the CONTEXT BLOCK below
- Always prioritize information from the provided context when answering questions
- Format your responses using clear markdown for excellent readability
- Use proper headings, bullet points, and numbered lists when appropriate
- When citing information, reference the specific document and page number
- If the context doesn't contain relevant information, clearly state that the information is not available in the uploaded documents
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

Guidelines:
- Answer questions based ONLY on the provided context
- If no relevant information is found, say: "I don't find information about this topic in the uploaded documents."
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