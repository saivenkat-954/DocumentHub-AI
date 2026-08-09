from core.pdf_processor import extract_text_from_pdf
from core.chunker import split_text
from core.embeddings import create_embedding
from core.vector_store import add_document


def ingest_pdf(file_path: str, filename: str):
    # 1. Extract text
    text = extract_text_from_pdf(file_path)

    # 2. Split into chunks
    chunks = split_text(text)

    # 3. Process every chunk
    for index, chunk in enumerate(chunks):
        embedding = create_embedding(chunk)

        add_document(
            chunk_id=f"{filename}_chunk_{index}",
            text=chunk,
            embedding=embedding,
            metadata={
                "source": filename,
                "chunk_index": index
            }
        )

    return len(chunks)