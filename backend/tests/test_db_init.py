"""Test database initialization and RAG functionality"""
import tempfile
import numpy as np
from sqlalchemy.orm import Session
from backend.db import init_db, get_db_status, reset_db, EmbeddingManager, SessionLocal
from backend.db.models import Trade, Vault, User, TradeEmbedding


def test_database_init():
    """Test that database initializes without errors"""
    init_db()
    assert True


def test_db_status():
    """Test database status reporting"""
    init_db()
    from backend.db import engine

    status = get_db_status(engine)
    assert status["initialized"] is True
    assert "users" in status["existing_tables"]
    assert "trades" in status["existing_tables"]
    assert "trade_embeddings" in status["existing_tables"]
    assert len(status["missing_tables"]) == 0


def test_trade_embedding_storage():
    """Test embedding generation and storage"""
    init_db()

    # Create test data
    db = SessionLocal()

    # Create test user
    user = User(wallet_address="test_wallet_123", username="test_user")
    db.add(user)
    db.commit()

    # Create test vault
    vault = Vault(
        user_id=user.id,
        vault_address="vault_pda_123",
        authority="test_authority",
        balance=1000000,
    )
    db.add(vault)
    db.commit()

    # Create test trade
    trade = Trade(
        vault_id=vault.id,
        trade_id=1,
        buy_market_id="market_a",
        sell_market_id="market_b",
        buy_amount=100000,
        sell_amount=105000,
        actual_edge_bps=500,
        pnl_lamports=5000,
        status="confirmed",
    )
    db.add(trade)
    db.commit()

    # Test embedding (mock for unit test)
    embedding = np.random.randn(384).astype(np.float32)
    embedding /= np.linalg.norm(embedding)  # Normalize

    manager = EmbeddingManager()

    # Test embedding conversion
    embedding_bytes = manager.embedding_to_bytes(embedding)
    restored_embedding = manager.bytes_to_embedding(embedding_bytes)

    np.testing.assert_array_almost_equal(embedding, restored_embedding)

    # Test cosine similarity
    sim = manager.cosine_similarity(embedding, embedding)
    assert np.isclose(sim, 1.0)  # Perfect similarity with itself

    # Test storage
    trade_emb = manager.store_embedding(
        db,
        trade.id,
        "Test reasoning for arbitrage trade",
        embedding,
    )
    assert trade_emb.trade_id == trade.id
    assert trade_emb.embedding_model == "nomic-embed-text"

    # Test retrieval
    similar = manager.retrieve_similar_trades(db, embedding, top_k=5)
    assert len(similar) > 0
    assert similar[0][0].trade_id == trade.id
    assert np.isclose(similar[0][1], 1.0)  # Perfect match

    # Test RAG context generation
    context = manager.rag_context(db, embedding, top_k=3)
    assert "Similar historical trades" in context
    assert "Trade #1" in context

    db.close()
