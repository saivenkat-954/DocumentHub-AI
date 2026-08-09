import chromadb


# =========================================================
# CHROMADB CLIENT
# =========================================================

client = chromadb.PersistentClient(
    path="./chroma_db"
)


collection = client.get_or_create_collection(
    name="documents"
)


# =========================================================
# ADD DOCUMENT CHUNK
# =========================================================

def add_document(
    chunk_id: str,
    text: str,
    embedding: list[float],
    metadata: dict
):
    collection.add(
        ids=[chunk_id],
        documents=[text],
        embeddings=[embedding],
        metadatas=[metadata]
    )


# =========================================================
# SEARCH DOCUMENTS
# =========================================================

def search_documents(
    query_embedding: list[float],
    top_k: int = 3
):
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )

    return results


# =========================================================
# DELETE DOCUMENT
# =========================================================

def delete_document(filename: str):
    """
    Delete every indexed chunk belonging
    to the specified PDF.
    """

    collection.delete(
        where={
            "source": filename
        }
    )


# =========================================================
# GET ALL DOCUMENTS
# =========================================================

def get_all_documents():
    """
    Return metadata for all indexed chunks.
    """

    results = collection.get(
        include=["metadatas"]
    )

    return results