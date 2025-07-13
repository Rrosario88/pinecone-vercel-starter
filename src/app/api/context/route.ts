import { NextResponse } from "next/server";
import { getContext } from "@/utils/context";
import { ScoredPineconeRecord } from "@pinecone-database/pinecone";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const lastMessage = messages.length > 1 ? messages[messages.length - 1] : messages[0]
    
    // Use PDF namespace and improved parameters for context panel
    const context = await getContext(
      lastMessage.content, 
      'pdf-documents', // PDF namespace
      10000, // Max tokens for context panel
      0.4,   // Even lower threshold for display
      false, // Return full objects for display
      10     // More results for context panel
    ) as ScoredPineconeRecord[]
    
    return NextResponse.json({ context })
  } catch (e) {
    console.log('Context API error:', e)
    return NextResponse.error()
  }
}
