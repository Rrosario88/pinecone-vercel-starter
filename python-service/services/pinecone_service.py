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
    
    async def get_embeddings(self, text: str, model: str = "text-embedding-3-small") -> List[float]:
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
        top_k: int = 5,
        min_score: float = 0.3
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
        """Get inventory of documents in the knowledge base"""
        try:
            if not self.index:
                raise ValueError("Pinecone index not initialized")
            
            # Use dummy vector to get all documents
            dummy_vector = [0.0] * 1536  # Assuming 1536-dimensional embeddings
            
            def query_inventory():
                return self.index.query(
                    vector=dummy_vector,
                    top_k=10000,  # Get as many as possible
                    include_metadata=True,
                    namespace=namespace
                )
            
            query_result = await asyncio.get_event_loop().run_in_executor(None, query_inventory)
            
            # Process results to get document inventory
            documents = {}
            total_chunks = 0
            
            for match in query_result.get('matches', []):
                metadata = match.get('metadata', {})
                if metadata:
                    source = self._get_source_info(metadata)
                    if source not in documents:
                        documents[source] = {
                            "chunks": 0,
                            "metadata": metadata
                        }
                    documents[source]["chunks"] += 1
                    total_chunks += 1
            
            return {
                "total_documents": len(documents),
                "total_chunks": total_chunks,
                "documents": documents,
                "namespace": namespace
            }
            
        except Exception as e:
            logger.error(f"Failed to get document inventory: {e}")
            return {
                "total_documents": 0,
                "total_chunks": 0,
                "documents": {},
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