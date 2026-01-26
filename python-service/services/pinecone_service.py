import os
import asyncio
import logging
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec
import openai
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class PineconeService:
    def __init__(self):
        self.pinecone_client = None
        self.openai_client = None
        self.index = None
        self.index_name = os.getenv("PINECONE_INDEX", "")
        
    async def initialize(self):
        """Initialize Pinecone and OpenAI clients"""
        try:
            # Initialize Pinecone
            api_key = os.getenv("PINECONE_API_KEY")
            if not api_key:
                raise ValueError("PINECONE_API_KEY environment variable is required")
            
            self.pinecone_client = Pinecone(api_key=api_key)
            
            # Get or create index
            if self.index_name:
                try:
                    self.index = self.pinecone_client.Index(self.index_name)
                    logger.info(f"Connected to existing Pinecone index: {self.index_name}")
                except Exception as e:
                    logger.error(f"Failed to connect to Pinecone index {self.index_name}: {e}")
                    raise
            
            # Initialize OpenAI client for embeddings
            openai_key = os.getenv("OPENAI_API_KEY")
            if not openai_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
            
            self.openai_client = AsyncOpenAI(api_key=openai_key)
            
            logger.info("Pinecone service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone service: {e}")
            raise
    
    async def get_embeddings(self, text: str, model: str = "text-embedding-ada-002") -> List[float]:
        """Get embeddings for a text using OpenAI"""
        try:
            response = await self.openai_client.embeddings.create(
                input=text,
                model=model
            )
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Failed to get embeddings: {e}")
            raise
    
    async def search_context(
        self,
        query: str,
        namespace: str = "",
        top_k: int = 20,
        min_score: float = 0.2
    ) -> List[Dict[str, Any]]:
        """Search for relevant context in Pinecone"""
        try:
            if not self.index:
                raise ValueError("Pinecone index not initialized")
            
            # Get query embeddings
            query_embedding = await self.get_embeddings(query)
            
            # Query Pinecone
            def query_pinecone():
                return self.index.query(
                    vector=query_embedding,
                    top_k=top_k,
                    include_metadata=True,
                    namespace=namespace
                )
            
            query_result = await asyncio.get_event_loop().run_in_executor(None, query_pinecone)
            
            # Filter results by score and format
            results = []
            for match in query_result.get('matches', []):
                if match.get('score', 0) > min_score:
                    metadata = match.get('metadata', {})
                    result = {
                        "content": metadata.get("chunk", ""),
                        "score": match.get('score', 0),
                        "source": self._get_source_info(metadata),
                        "metadata": metadata
                    }
                    results.append(result)
            
            logger.info(f"Found {len(results)} relevant context items for query: {query[:100]}...")
            return results
            
        except Exception as e:
            logger.error(f"Failed to search context: {e}")
            return []
    
    async def search_multiple_strategies(
        self,
        query: str,
        strategies: List[Dict[str, Any]],
        namespace: str = ""
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Search using multiple strategies for comprehensive context retrieval"""
        results = {}
        
        for strategy in strategies:
            strategy_name = strategy.get("name", "default")
            top_k = strategy.get("top_k", 5)
            min_score = strategy.get("min_score", 0.3)
            query_modification = strategy.get("query_modification", "")
            
            # Modify query based on strategy
            modified_query = query
            if query_modification:
                modified_query = f"{query_modification} {query}"
            
            try:
                strategy_results = await self.search_context(
                    query=modified_query,
                    namespace=namespace,
                    top_k=top_k,
                    min_score=min_score
                )
                results[strategy_name] = strategy_results
                
            except Exception as e:
                logger.error(f"Strategy {strategy_name} failed: {e}")
                results[strategy_name] = []
        
        return results
    
    async def get_document_inventory(self, namespace: str = "") -> Dict[str, Any]:
        """Get inventory of documents in knowledge base using test-query approach"""
        try:
            if not self.index:
                raise ValueError("Pinecone index not initialized")
            
            # Use test-query API approach - create a generic query vector
            # This bypasses filter requirements by using a real embedding
            test_query = "document content information text data"
            query_embedding = await self.get_embeddings(test_query)
            
            # Query both namespaces to get all documents
            def query_pdf_inventory():
                return self.index.query(
                    vector=query_embedding,
                    top_k=10000,  # Get as many as possible
                    include_metadata=True,
                    namespace="pdf-documents"  # Always query PDF namespace
                )
            
            def query_web_inventory():
                return self.index.query(
                    vector=query_embedding,
                    top_k=10000,  # Get as many as possible
                    include_metadata=True,
                    namespace=""  # Default namespace for web docs
                )
            
            # Execute both queries
            pdf_query_result = await asyncio.get_event_loop().run_in_executor(None, query_pdf_inventory)
            web_query_result = await asyncio.get_event_loop().run_in_executor(None, query_web_inventory)
            
            # Combine results from both namespaces
            all_matches = []
            if pdf_query_result.get('matches'):
                all_matches.extend(pdf_query_result['matches'])
            if web_query_result.get('matches'):
                all_matches.extend(web_query_result['matches'])
            
            # Process results to get document inventory
            pdf_documents = []
            web_documents = {}
            total_chunks = 0
            
            for match in all_matches:
                metadata = match.get('metadata', {})
                if metadata:
                    total_chunks += 1
                    
                    # Extract document information
                    filename = metadata.get("filename")
                    url = metadata.get("url")
                    
                    if filename:
                        # Find existing PDF document entry
                        pdf_doc = next((doc for doc in pdf_documents if doc.get("filename") == filename), None)
                        if not pdf_doc:
                            pdf_doc = {
                                "filename": filename,
                                "chunks": 0,
                                "type": "pdf",
                                "uploadId": metadata.get("uploadId")
                            }
                            pdf_documents.append(pdf_doc)
                        pdf_doc["chunks"] += 1
                    
                    elif url:
                        # Find existing web document entry
                        if url not in web_documents:
                            web_documents[url] = {
                                "url": url,
                                "chunks": 0,
                                "type": "web"
                            }
                        web_documents[url]["chunks"] += 1
            
            return {
                "totalDocuments": len(pdf_documents) + len(web_documents),
                "totalChunks": total_chunks,
                "pdfDocuments": pdf_documents,
                "webDocuments": list(web_documents.values()),
                "namespace": namespace
            }
            
        except Exception as e:
            logger.error(f"Failed to get document inventory: {e}")
            return {
                "totalDocuments": 0,
                "totalChunks": 0,
                "pdfDocuments": [],
                "webDocuments": [],
                "namespace": namespace,
                "error": str(e)
            }
    
    def _get_source_info(self, metadata: Optional[Dict[str, Any]]) -> str:
        """Extract source information from metadata"""
        if not metadata:
            return "Unknown source"
        
        if metadata.get("filename"):
            page_info = f", Page {metadata.get('pageNumber', 'N/A')}" if metadata.get('pageNumber') else ""
            return f"{metadata['filename']}{page_info}"
        elif metadata.get("url"):
            return metadata["url"]
        else:
            return "Document"
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.openai_client:
            await self.openai_client.close()
        logger.info("Pinecone service cleaned up")