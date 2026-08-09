from pathlib import Path

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
)

from pydantic import BaseModel

from fastapi.middleware.cors import CORSMiddleware

from core.ingest import ingest_pdf
from core.rag import ask_question
from core.vector_store import (
    delete_document,
    get_all_documents,
)


app = FastAPI(
    title="DocumentHub AI"
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://document-hub-ai.vercel.app",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(
    exist_ok=True
)


class QuestionRequest(BaseModel):
    question: str


@app.get("/")
def home():

    return {
        "message":
            "DocumentHub AI backend is running!"
    }


@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is missing."
        )

    if not file.filename.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    file_path = (
        UPLOAD_DIR /
        file.filename
    )

    try:

        with open(
            file_path,
            "wb"
        ) as buffer:

            buffer.write(
                await file.read()
            )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save uploaded "
                f"file: {error}"
            )
        )

    try:

        total_chunks = ingest_pdf(
            str(file_path),
            file.filename
        )

    except Exception as error:

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to process document: "
                f"{error}"
            )
        )

    return {
        "filename":
            file.filename,

        "message":
            "Document uploaded and indexed successfully!",

        "chunks":
            total_chunks
    }


@app.get("/documents")
async def get_documents():

    try:

        results = get_all_documents()

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to read documents "
                f"from ChromaDB: {error}"
            )
        )

    metadatas = (
        results.get(
            "metadatas",
            []
        )
        or []
    )

    documents = {}

    for metadata in metadatas:

        if not metadata:
            continue

        filename = metadata.get(
            "source"
        )

        if not filename:
            continue

        if filename not in documents:

            documents[filename] = {
                "filename":
                    filename,

                "chunks":
                    0
            }

        documents[filename][
            "chunks"
        ] += 1

    return {
        "documents":
            list(
                documents.values()
            )
    }


@app.post("/ask")
async def ask(
    request: QuestionRequest
):

    if not request.question.strip():

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:

        result = ask_question(
            request.question
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to answer question: "
                f"{error}"
            )
        )

    return {
        "question":
            request.question,

        "answer":
            result.get(
                "answer",
                ""
            ),

        "sources":
            result.get(
                "sources",
                []
            )
    }


@app.delete("/documents")
async def remove_document(
    filename: str
):

    if not filename:

        raise HTTPException(
            status_code=400,
            detail="Filename is required."
        )

    safe_filename = Path(
        filename
    ).name

    if safe_filename != filename:

        raise HTTPException(
            status_code=400,
            detail="Invalid filename."
        )

    file_path = (
        UPLOAD_DIR /
        safe_filename
    )

    try:

        delete_document(
            safe_filename
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to remove document "
                f"from ChromaDB: {error}"
            )
        )

    if file_path.exists():

        try:

            file_path.unlink()

        except Exception as error:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Document was removed from "
                    "ChromaDB, but the PDF file "
                    f"could not be deleted: {error}"
                )
            )

    return {
        "filename":
            safe_filename,

        "message":
            "Document deleted successfully."
    }
