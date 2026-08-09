from core.embeddings import create_embedding
from core.vector_store import search_documents
from core.llm import generate_answer


def ask_question(question: str):
    # 1. Convert the question into a query embedding
    query_embedding = create_embedding(
        question,
        task_type="RETRIEVAL_QUERY"
    )

    # 2. Search ChromaDB
    results = search_documents(
        query_embedding,
        top_k=3
    )

    # 3. Get retrieved document chunks
    documents = results["documents"][0]

    # 4. Get metadata for those chunks
    metadatas = results.get("metadatas", [[]])[0]

    # 5. Combine chunks into context
    context = "\n\n---\n\n".join(documents)

    # 6. Generate answer using Gemini
    answer = generate_answer(
        question=question,
        context=context
    )

    # 7. Build source information
    sources = []

    for metadata in metadatas:
        if metadata:
            sources.append({
                "filename": metadata.get("source", "Unknown document"),
                "chunk": metadata.get("chunk_index", "Unknown")
            })

    return {
        "answer": answer,
        "sources": sources
    }