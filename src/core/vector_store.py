"""
SecondBrain Vector Store Module

This module provides interfaces for storing and retrieving content vectors
using Pinecone for semantic search capabilities. It manages embeddings creation,
storage, and vector search operations.
"""

import os
import json
import logging
import time
from typing import Dict, List, Optional, Union, Any, Tuple
import hashlib
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import optional dependencies - handle gracefully if not available
try:
    import pinecone
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False
    logger.warning("Pinecone not available. Install with: pip install pinecone-client")

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    logger.warning("NumPy not available. Install with: pip install numpy")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("Sentence Transformers not available. Install with: pip install sentence-transformers")


class EmbeddingGenerator:
    """
    Generates vector embeddings for text content.
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding generator.
        
        Args:
            model_name: Name of the sentence transformer model to use
        """
        self.model_name = model_name
        self.model = None
        
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.error("Sentence Transformers not available. Cannot create embeddings.")
            return
            
        try:
            logger.info(f"Loading embedding model: {model_name}")
            self.model = SentenceTransformer(model_name)
            logger.info(f"Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading embedding model: {str(e)}")
            raise
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for a text segment.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Vector embedding as a list of floats, or None if generation fails
        """
        if not self.model:
            logger.error("No embedding model available")
            return None
            
        try:
            # Generate embedding
            embedding = self.model.encode(text)
            
            # Convert to Python list if using NumPy
            if NUMPY_AVAILABLE and isinstance(embedding, np.ndarray):
                embedding = embedding.tolist()
                
            return embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return None
    
    def generate_embeddings(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple text segments.
        
        Args:
            texts: List of texts to generate embeddings for
            
        Returns:
            List of vector embeddings, with None for any that failed
        """
        if not self.model:
            logger.error("No embedding model available")
            return [None] * len(texts)
            
        try:
            # Generate embeddings in batch
            embeddings = self.model.encode(texts)
            
            # Convert to Python list if using NumPy
            if NUMPY_AVAILABLE and isinstance(embeddings, np.ndarray):
                embeddings = embeddings.tolist()
                
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            return [None] * len(texts)


class PineconeClient:
    """
    Client for interacting with Pinecone vector database.
    """
    
    def __init__(self, api_key: Optional[str] = None, 
                 environment: Optional[str] = None,
                 index_name: Optional[str] = None,
                 embedding_generator: Optional[EmbeddingGenerator] = None):
        """
        Initialize the Pinecone client.
        
        Args:
            api_key: Pinecone API key (or from environment variable PINECONE_API_KEY)
            environment: Pinecone environment (or from environment variable PINECONE_ENVIRONMENT)
            index_name: Pinecone index name (or from environment variable PINECONE_INDEX)
            embedding_generator: Generator for creating embeddings (or creates default)
        """
        # Store configuration
        self.api_key = api_key or os.environ.get('PINECONE_API_KEY')
        self.environment = environment or os.environ.get('PINECONE_ENVIRONMENT')
        self.index_name = index_name or os.environ.get('PINECONE_INDEX')
        
        # Set up embedding generator
        self.embedding_generator = embedding_generator or EmbeddingGenerator()
        
        # Initialize client connection
        self.client = None
        self.index = None
        self.dimension = 384  # Default for all-MiniLM-L6-v2
        
        # Check dependencies
        if not PINECONE_AVAILABLE:
            logger.error("Pinecone not available. Cannot initialize client.")
            return
            
        # Validate configuration
        if not self.api_key or not self.environment or not self.index_name:
            logger.error("Pinecone configuration incomplete. Need API key, environment, and index name.")
            return
            
        # Initialize connection
        try:
            logger.info(f"Initializing Pinecone: {self.index_name} in {self.environment}")
            pinecone.init(api_key=self.api_key, environment=self.environment)
            
            # Check if index exists
            if self.index_name in pinecone.list_indexes():
                # Get existing index
                self.index = pinecone.Index(self.index_name)
                index_stats = self.index.describe_index_stats()
                logger.info(f"Connected to existing Pinecone index: {self.index_name}")
                logger.info(f"Index stats: {index_stats}")
                
                # Get dimension from index
                if 'dimension' in index_stats:
                    self.dimension = index_stats['dimension']
            else:
                # Create new index with appropriate dimension
                logger.info(f"Creating new Pinecone index: {self.index_name}")
                pinecone.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric="cosine"
                )
                self.index = pinecone.Index(self.index_name)
                logger.info(f"Created new Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"Error initializing Pinecone: {str(e)}")
            raise
    
    def index_content(self, content: Dict[str, Any], 
                     content_type: str = 'content',
                     namespace: Optional[str] = None) -> bool:
        """
        Index content in Pinecone.
        
        Args:
            content: Content to index
            content_type: Type of content (content, task, notion_page, etc.)
            namespace: Optional namespace for organizing vectors
            
        Returns:
            True if indexing succeeded, False otherwise
        """
        if not self.index:
            logger.error("No Pinecone index available")
            return False
            
        try:
            # Extract content segments
            segments = content.get('segments', [])
            if not segments:
                # If no segments, create a single segment from the content
                full_content = content.get('content', '')
                if full_content:
                    segments = [{'id': 'full', 'content': full_content, 'type': 'full'}]
                else:
                    logger.error("No content to index")
                    return False
            
            # Create vectors for each segment
            vectors = []
            for segment in segments:
                # Generate embedding
                segment_text = segment.get('content', '')
                if not segment_text:
                    continue
                    
                embedding = self.embedding_generator.generate_embedding(segment_text)
                if not embedding:
                    logger.warning(f"Failed to generate embedding for segment {segment.get('id')}")
                    continue
                
                # Create unique ID for this vector
                segment_id = segment.get('id', str(uuid.uuid4()))
                content_id = content.get('id', 'unknown')
                vector_id = f"{content_id}_{segment_id}"
                
                # Create metadata
                metadata = {
                    'content_id': content_id,
                    'segment_id': segment_id,
                    'segment_type': segment.get('type', 'unknown'),
                    'content_type': content_type,
                    'title': content.get('title', ''),
                    'text': segment_text[:1000]  # Truncate for metadata
                }
                
                # Add metadata from content if available
                if 'metadata' in content:
                    # Filter metadata to avoid overly large records
                    safe_metadata = {
                        k: v for k, v in content['metadata'].items() 
                        if k in ['date', 'author', 'topics', 'content_type']
                    }
                    metadata.update(safe_metadata)
                
                # Create vector record
                vector = {
                    'id': vector_id,
                    'values': embedding,
                    'metadata': metadata
                }
                
                vectors.append(vector)
            
            # Upsert vectors in batches
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i+batch_size]
                self.index.upsert(vectors=batch, namespace=namespace)
                logger.info(f"Indexed batch of {len(batch)} vectors")
            
            logger.info(f"Successfully indexed {len(vectors)} vectors for content {content.get('id')}")
            return True
        except Exception as e:
            logger.error(f"Error indexing content: {str(e)}")
            return False
    
    def search(self, query: str, 
              namespace: Optional[str] = None,
              filter: Optional[Dict[str, Any]] = None,
              top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for similar content.
        
        Args:
            query: Query text to search for
            namespace: Optional namespace to search in
            filter: Optional metadata filters
            top_k: Number of results to return
            
        Returns:
            List of search results with metadata
        """
        if not self.index:
            logger.error("No Pinecone index available")
            return []
            
        try:
            # Generate query embedding
            query_embedding = self.embedding_generator.generate_embedding(query)
            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return []
            
            # Execute search
            search_results = self.index.query(
                vector=query_embedding,
                namespace=namespace,
                filter=filter,
                top_k=top_k,
                include_metadata=True
            )
            
            # Format results
            results = []
            for match in search_results.get('matches', []):
                result = {
                    'score': match.get('score', 0),
                    'content_id': match.get('metadata', {}).get('content_id', ''),
                    'segment_id': match.get('metadata', {}).get('segment_id', ''),
                    'text': match.get('metadata', {}).get('text', ''),
                    'title': match.get('metadata', {}).get('title', ''),
                    'metadata': match.get('metadata', {})
                }
                results.append(result)
            
            logger.info(f"Search returned {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"Error searching: {str(e)}")
            return []
    
    def delete_content(self, content_id: str, namespace: Optional[str] = None) -> bool:
        """
        Delete all vectors for a specific content.
        
        Args:
            content_id: ID of content to delete vectors for
            namespace: Optional namespace to delete from
            
        Returns:
            True if deletion succeeded, False otherwise
        """
        if not self.index:
            logger.error("No Pinecone index available")
            return False
            
        try:
            # Create filter to match all vectors for this content
            filter = {'content_id': {'$eq': content_id}}
            
            # Delete matching vectors
            self.index.delete(filter=filter, namespace=namespace)
            
            logger.info(f"Deleted vectors for content {content_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting content: {str(e)}")
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get status information about the Pinecone index.
        
        Returns:
            Dictionary with status information
        """
        if not self.index:
            return {'status': 'unavailable', 'error': 'No Pinecone index available'}
            
        try:
            # Get index stats
            stats = self.index.describe_index_stats()
            
            status = {
                'status': 'available',
                'index_name': self.index_name,
                'environment': self.environment,
                'dimension': self.dimension,
                'vector_count': stats.get('total_vector_count', 0),
                'namespaces': list(stats.get('namespaces', {}).keys())
            }
            
            return status
        except Exception as e:
            logger.error(f"Error getting status: {str(e)}")
            return {'status': 'error', 'error': str(e)}


class FallbackVectorStore:
    """
    Simple in-memory vector store as a fallback when Pinecone is not available.
    Not suitable for production use with large datasets.
    """
    
    def __init__(self, embedding_generator: Optional[EmbeddingGenerator] = None):
        """
        Initialize the fallback vector store.
        
        Args:
            embedding_generator: Generator for creating embeddings (or creates default)
        """
        logger.warning("Using FallbackVectorStore - not suitable for production!")
        self.embedding_generator = embedding_generator or EmbeddingGenerator()
        self.vectors = []
    
    def index_content(self, content: Dict[str, Any], 
                     content_type: str = 'content',
                     namespace: Optional[str] = None) -> bool:
        """
        Index content in the fallback store.
        
        Args:
            content: Content to index
            content_type: Type of content (content, task, notion_page, etc.)
            namespace: Optional namespace for organizing vectors (ignored)
            
        Returns:
            True if indexing succeeded, False otherwise
        """
        try:
            # Extract content segments
            segments = content.get('segments', [])
            if not segments:
                # If no segments, create a single segment from the content
                full_content = content.get('content', '')
                if full_content:
                    segments = [{'id': 'full', 'content': full_content, 'type': 'full'}]
                else:
                    logger.error("No content to index")
                    return False
            
            # Create vectors for each segment
            for segment in segments:
                # Generate embedding
                segment_text = segment.get('content', '')
                if not segment_text:
                    continue
                    
                embedding = self.embedding_generator.generate_embedding(segment_text)
                if not embedding:
                    logger.warning(f"Failed to generate embedding for segment {segment.get('id')}")
                    continue
                
                # Create unique ID for this vector
                segment_id = segment.get('id', str(uuid.uuid4()))
                content_id = content.get('id', 'unknown')
                vector_id = f"{content_id}_{segment_id}"
                
                # Create metadata
                metadata = {
                    'content_id': content_id,
                    'segment_id': segment_id,
                    'segment_type': segment.get('type', 'unknown'),
                    'content_type': content_type,
                    'title': content.get('title', ''),
                    'text': segment_text[:1000],  # Truncate for metadata
                    'namespace': namespace
                }
                
                # Add metadata from content if available
                if 'metadata' in content:
                    # Filter metadata to avoid overly large records
                    safe_metadata = {
                        k: v for k, v in content['metadata'].items() 
                        if k in ['date', 'author', 'topics', 'content_type']
                    }
                    metadata.update(safe_metadata)
                
                # Store vector
                self.vectors.append({
                    'id': vector_id,
                    'values': embedding,
                    'metadata': metadata
                })
            
            logger.info(f"Successfully indexed {len(segments)} vectors for content {content.get('id')}")
            return True
        except Exception as e:
            logger.error(f"Error indexing content: {str(e)}")
            return False
    
    def search(self, query: str, 
              namespace: Optional[str] = None,
              filter: Optional[Dict[str, Any]] = None,
              top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for similar content.
        
        Args:
            query: Query text to search for
            namespace: Optional namespace to search in
            filter: Optional metadata filters
            top_k: Number of results to return
            
        Returns:
            List of search results with metadata
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_generator.generate_embedding(query)
            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return []
            
            # Calculate similarities and filter
            similarities = []
            for vector in self.vectors:
                # Check namespace filter
                if namespace and vector['metadata'].get('namespace') != namespace:
                    continue
                    
                # Check metadata filter (simplified)
                if filter and not self._check_filter(vector['metadata'], filter):
                    continue
                
                # Calculate cosine similarity
                similarity = self._cosine_similarity(query_embedding, vector['values'])
                
                similarities.append({
                    'vector': vector,
                    'score': similarity
                })
            
            # Sort by similarity score
            similarities.sort(key=lambda x: x['score'], reverse=True)
            
            # Format results
            results = []
            for i, item in enumerate(similarities[:top_k]):
                vector = item['vector']
                result = {
                    'score': item['score'],
                    'content_id': vector['metadata'].get('content_id', ''),
                    'segment_id': vector['metadata'].get('segment_id', ''),
                    'text': vector['metadata'].get('text', ''),
                    'title': vector['metadata'].get('title', ''),
                    'metadata': vector['metadata']
                }
                results.append(result)
            
            logger.info(f"Search returned {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"Error searching: {str(e)}")
            return []
    
    def delete_content(self, content_id: str, namespace: Optional[str] = None) -> bool:
        """
        Delete all vectors for a specific content.
        
        Args:
            content_id: ID of content to delete vectors for
            namespace: Optional namespace to delete from
            
        Returns:
            True if deletion succeeded, False otherwise
        """
        try:
            # Filter vectors
            self.vectors = [
                v for v in self.vectors 
                if v['metadata'].get('content_id') != content_id or 
                (namespace and v['metadata'].get('namespace') != namespace)
            ]
            
            logger.info(f"Deleted vectors for content {content_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting content: {str(e)}")
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get status information about the fallback store.
        
        Returns:
            Dictionary with status information
        """
        try:
            # Get namespaces
            namespaces = set()
            for vector in self.vectors:
                ns = vector['metadata'].get('namespace')
                if ns:
                    namespaces.add(ns)
            
            status = {
                'status': 'available',
                'type': 'fallback',
                'vector_count': len(self.vectors),
                'namespaces': list(namespaces)
            }
            
            return status
        except Exception as e:
            logger.error(f"Error getting status: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        if not NUMPY_AVAILABLE:
            # Simple implementation without NumPy
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            magnitude1 = sum(a * a for a in vec1) ** 0.5
            magnitude2 = sum(b * b for b in vec2) ** 0.5
            if magnitude1 * magnitude2 == 0:
                return 0
            return dot_product / (magnitude1 * magnitude2)
        else:
            # NumPy implementation (more efficient)
            vec1_np = np.array(vec1)
            vec2_np = np.array(vec2)
            
            norm1 = np.linalg.norm(vec1_np)
            norm2 = np.linalg.norm(vec2_np)
            
            if norm1 == 0 or norm2 == 0:
                return 0
                
            return np.dot(vec1_np, vec2_np) / (norm1 * norm2)
    
    def _check_filter(self, metadata: Dict[str, Any], filter: Dict[str, Any]) -> bool:
        """
        Check if metadata matches filter.
        A very simplified implementation of filter matching.
        """
        for key, value in filter.items():
            if isinstance(value, dict):
                # Handle operators
                if '$eq' in value:
                    if metadata.get(key) != value['$eq']:
                        return False
                elif '$in' in value:
                    if metadata.get(key) not in value['$in']:
                        return False
            else:
                # Simple equality
                if metadata.get(key) != value:
                    return False
        
        return True


def create_vector_store() -> Union[PineconeClient, FallbackVectorStore]:
    """
    Create the appropriate vector store based on available configurations.
    
    Returns:
        Vector store instance (Pinecone or Fallback)
    """
    # Check if Pinecone is available
    if PINECONE_AVAILABLE:
        # Try to create Pinecone client
        try:
            client = PineconeClient()
            if client.index:
                return client
        except Exception as e:
            logger.warning(f"Failed to create Pinecone client: {str(e)}")
    else:
        logger.warning("Pinecone not available")
    
    # Fall back to in-memory implementation
    logger.warning("Using fallback vector store (in-memory)")
    return FallbackVectorStore()


def main():
    """Example usage of the vector store module."""
    # Create vector store
    store = create_vector_store()
    
    # Check status
    status = store.get_status()
    logger.info(f"Vector store status: {status}")
    
    # Example content
    content = {
        'id': 'test_content_001',
        'title': 'Test Content',
        'content': """
        This is a test content document for vector store testing.
        It contains multiple paragraphs to test segmentation.
        
        This is the second paragraph that discusses a different topic.
        We want to see if the vector store can handle multiple segments.
        
        Finally, this is the third paragraph with yet another concept.
        """,
        'metadata': {
            'author': 'Test Author',
            'date': '2025-05-13',
            'content_type': 'test'
        },
        'segments': [
            {'id': 'seg_1', 'content': 'This is a test content document for vector store testing. It contains multiple paragraphs to test segmentation.', 'type': 'paragraph'},
            {'id': 'seg_2', 'content': 'This is the second paragraph that discusses a different topic. We want to see if the vector store can handle multiple segments.', 'type': 'paragraph'},
            {'id': 'seg_3', 'content': 'Finally, this is the third paragraph with yet another concept.', 'type': 'paragraph'}
        ]
    }
    
    # Index content
    success = store.index_content(content, content_type='test')
    logger.info(f"Indexing success: {success}")
    
    # Search test
    query = "paragraph with multiple segments"
    results = store.search(query, top_k=2)
    
    logger.info(f"Search results for '{query}':")
    for i, result in enumerate(results):
        logger.info(f"  {i+1}. Score: {result['score']:.3f}, Text: {result['text'][:50]}...")
    
    # Delete test
    success = store.delete_content('test_content_001')
    logger.info(f"Delete success: {success}")


if __name__ == "__main__":
    main()