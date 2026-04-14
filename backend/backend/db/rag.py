"""RAG (Retrieval-Augmented Generation) utilities for trade reasoning embeddings"""

import numpy as np
import struct
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from .models import TradeEmbedding, Trade


class EmbeddingManager:
    """Manages embedding generation and RAG retrieval using Ollama"""

    def __init__(self, ollama_host: Optional[str] = None, model: str = "nomic-embed-text"):
        """
        Initialize embedding manager

        Args:
            ollama_host: Ollama server endpoint (optional, required for generate_embedding)
            model: Embedding model (default: nomic-embed-text 384-dim)
        """
        self.ollama_host = ollama_host
        self.model = model
        self.embedding_dim = 384
        self.client = None

        if ollama_host:
            try:
                from ollama import Client
                self.client = Client(host=ollama_host)
            except ImportError:
                pass  # Ollama optional for testing

    def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for text using Ollama

        Args:
            text: Text to embed

        Returns:
            384-dim numpy array (float32)

        Raises:
            RuntimeError: If Ollama client not initialized
        """
        if not self.client:
            raise RuntimeError(
                "Ollama client not initialized. Pass ollama_host to EmbeddingManager.__init__()"
            )

        response = self.client.embeddings(
            model=self.model,
            prompt=text,
        )
        embedding = np.array(response["embedding"], dtype=np.float32)
        return embedding

    def embedding_to_bytes(self, embedding: np.ndarray) -> bytes:
        """Convert embedding array to bytes for storage"""
        return embedding.astype(np.float32).tobytes()

    def bytes_to_embedding(self, data: bytes) -> np.ndarray:
        """Convert stored bytes back to embedding array"""
        return np.frombuffer(data, dtype=np.float32)

    def cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings

        Args:
            embedding1, embedding2: 384-dim vectors

        Returns:
            Cosine similarity score (0-1)
        """
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
        return float(np.clip(similarity, 0, 1))

    def store_embedding(
        self,
        db: Session,
        trade_id: int,
        reasoning_text: str,
        embedding: np.ndarray,
    ) -> TradeEmbedding:
        """
        Store trade embedding in database

        Args:
            db: SQLAlchemy session
            trade_id: Trade database ID
            reasoning_text: Full reasoning as text
            embedding: 384-dim numpy array

        Returns:
            TradeEmbedding record
        """
        embedding_bytes = self.embedding_to_bytes(embedding)

        trade_embedding = TradeEmbedding(
            trade_id=trade_id,
            reasoning_text=reasoning_text,
            embedding=embedding_bytes,
            embedding_model=self.model,
        )

        db.add(trade_embedding)
        db.commit()
        db.refresh(trade_embedding)
        return trade_embedding

    def retrieve_similar_trades(
        self,
        db: Session,
        query_embedding: np.ndarray,
        top_k: int = 5,
        min_similarity: float = 0.7,
    ) -> List[Tuple[TradeEmbedding, float]]:
        """
        Retrieve top-K similar past trades using cosine similarity

        Args:
            db: SQLAlchemy session
            query_embedding: Current opportunity embedding (384-dim)
            top_k: Number of similar trades to return
            min_similarity: Minimum cosine similarity threshold (default 0.7)

        Returns:
            List of (TradeEmbedding, similarity_score) tuples
        """
        # Get all stored embeddings
        all_embeddings = db.query(TradeEmbedding).all()

        similarities = []
        for trade_emb in all_embeddings:
            stored_embedding = self.bytes_to_embedding(trade_emb.embedding)
            similarity = self.cosine_similarity(query_embedding, stored_embedding)

            if similarity >= min_similarity:
                similarities.append((trade_emb, similarity))

        # Sort by similarity (descending) and return top-K
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

    def rag_context(
        self,
        db: Session,
        query_embedding: np.ndarray,
        top_k: int = 5,
    ) -> str:
        """
        Generate RAG context: similar past trades for prompt injection

        Args:
            db: SQLAlchemy session
            query_embedding: Current opportunity embedding
            top_k: Number of similar trades to retrieve

        Returns:
            Formatted context string for LLM prompt
        """
        similar = self.retrieve_similar_trades(db, query_embedding, top_k=top_k)

        if not similar:
            return "No similar historical trades found."

        context_lines = ["Similar historical trades (ranked by relevance):"]
        for i, (trade_emb, similarity) in enumerate(similar, 1):
            trade = db.query(Trade).filter(Trade.id == trade_emb.trade_id).first()
            if trade:
                context_lines.append(
                    f"\n{i}. Trade #{trade.trade_id} (similarity: {similarity:.2%})"
                )
                context_lines.append(f"   Edge: {trade.actual_edge_bps} bps")
                context_lines.append(f"   PnL: {trade.pnl_lamports / 1e9:.6f} SOL")
                context_lines.append(f"   Reasoning: {trade_emb.reasoning_text[:200]}...")

        return "\n".join(context_lines)

