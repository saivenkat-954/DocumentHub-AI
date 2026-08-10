# DocumentHub AI

DocumentHub AI is a full-stack document question-answering application that allows users to upload PDF documents and ask questions about their contents using Retrieval-Augmented Generation (RAG).

The application extracts text from uploaded PDFs, splits the text into smaller chunks, generates embeddings, stores them in ChromaDB, retrieves the most relevant chunks for a question, and uses Gemini to generate an answer based only on the retrieved document context.

## Live Demo

Frontend:
https://document-hub-ai.vercel.app

Backend API:
https://documenthub-ai-backend.onrender.com

## Features

- Upload PDF documents
- Extract text from PDFs
- Split documents into overlapping chunks
- Generate document embeddings
- Store embeddings in ChromaDB
- Retrieve relevant document chunks
- Ask questions about uploaded documents
- Generate context-based answers using Gemini
- Display document sources and chunk information
- Delete indexed documents
- React-based responsive user interface
- Deployed frontend and backend

## How It Works

The application follows a Retrieval-Augmented Generation pipeline:

```text
                 PDF Upload
                     |
                     v
              PDF Text Extraction
                     |
                     v
                Text Chunking
                     |
                     v
             Generate Embeddings
                     |
                     v
                 ChromaDB
                     |
                     |
User Question ------+
                     |
                     v
             Query Embedding
                     |
                     v
           Similarity Search
                     |
                     v
          Relevant Document Chunks
                     |
                     v
                  Gemini
                     |
                     v
               Final Answer
Tech Stack
Frontend
React
Vite
JavaScript
CSS
Backend
Python
FastAPI
Uvicorn
AI
Google Gemini API
Gemini Embeddings
Vector Database
ChromaDB
Document Processing
PyMuPDF
LangChain Text Splitters
Deployment
Vercel - Frontend
Render - Backend
GitHub - Source Control
Project Structure
DocumentHub-AI/
│
├── backend/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── chunker.py
│   │   ├── embeddings.py
│   │   ├── ingest.py
│   │   ├── llm.py
│   │   ├── pdf_processor.py
│   │   ├── rag.py
│   │   └── vector_store.py
│   │
│   ├── uploads/
│   ├── main.py
│   ├── requirements.txt
│   └── .gitignore
│
├── frontend-react/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── .gitignore
│
├── .gitignore
└── README.md
RAG Pipeline
1. PDF Processing

When a PDF is uploaded, PyMuPDF extracts the text from each page.

document = fitz.open(file_path)

text = ""

for page in document:
    text += page.get_text()
2. Text Chunking

The extracted text is divided into smaller chunks using a recursive text splitter.

Current configuration:

Chunk size: 1000 characters
Chunk overlap: 200 characters

The overlap helps preserve context between neighboring chunks.

3. Embeddings

Each document chunk is converted into a vector embedding using Google's embedding model.

The embeddings allow the application to perform semantic similarity searches instead of relying only on keyword matching.

4. Vector Storage

The generated embeddings and document metadata are stored in ChromaDB.

Each chunk stores information such as:

source
chunk_index
5. Question Retrieval

When the user asks a question, the question is converted into a query embedding.

The application searches ChromaDB for the most relevant document chunks.

The current retrieval configuration returns the top 3 chunks.

6. Answer Generation

The retrieved chunks are combined into a context and passed to Gemini.

The model is instructed to answer using only the supplied document context and avoid inventing information.

If the answer cannot be found in the retrieved context, the application responds:

I could not find the answer in the document.
Environment Variables

Create a .env file inside the backend directory.

GEMINI_API_KEY=your_gemini_api_key

Never commit your API key to GitHub.

The .gitignore file should contain:

.env
venv/
__pycache__/
*.pyc
uploads/
chroma_db/
Backend Setup

Clone the repository:

git clone https://github.com/saivenkat-954/DocumentHub-AI.git

Move into the backend directory:

cd DocumentHub-AI/backend

Create a virtual environment:

python -m venv venv

Activate it on Windows:

venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Create your .env file:

GEMINI_API_KEY=your_gemini_api_key

Start the FastAPI server:

uvicorn main:app --reload

The backend will run locally at:

http://127.0.0.1:8000
Frontend Setup

Open another terminal and move into the frontend directory:

cd DocumentHub-AI/frontend-react

Install dependencies:

npm install

Start the development server:

npm run dev

The frontend will normally run at:

http://localhost:5173
API

The backend provides endpoints for interacting with documents and the RAG system.

Upload Document
POST /upload

Uploads a PDF, extracts its contents, creates chunks, generates embeddings, and indexes the document.

List Documents
GET /documents

Returns the indexed documents.

Ask Question
POST /ask

Accepts a question and returns an answer generated from the relevant document context.

Delete Document
DELETE /documents

Removes an indexed document.

Deployment
Backend

The FastAPI backend is deployed using Render.

Production backend:

https://documenthub-ai-backend.onrender.com

The Render service uses:

uvicorn main:app --host 0.0.0.0 --port $PORT
Frontend

The React frontend is deployed using Vercel.

Production frontend:

https://document-hub-ai.vercel.app

The frontend communicates with the deployed FastAPI backend through the production API URL.

Security

Sensitive configuration should never be committed to the repository.

The following should remain private:

Gemini API keys
.env files
Local virtual environments
Uploaded documents
Local ChromaDB data
Build artifacts
node_modules

These files and directories are excluded through .gitignore.

Future Improvements

Possible future improvements include:

User authentication
Multiple document collections
Persistent cloud vector database
Streaming AI responses
Document preview
Page-level source citations
Better document metadata
Support for additional file formats
Conversation history
Rate-limit handling
Improved error handling
Production database integration
Background document processing
Project Goal

The goal of DocumentHub AI is to demonstrate how modern AI applications can combine document processing, embeddings, vector search, and large language models to create a practical Retrieval-Augmented Generation system.

Author

Bommidi Poorna Chandra Sai Venkat

GitHub:

https://github.com/saivenkat-954


### One thing I'd change before committing

Your README currently mentions **Gemini 2.5 Flash** only indirectly through the implementation. Since we just changed your model from the exhausted `gemini-3.5-flash`, make sure your actual `backend/core/llm.py` matches the model you're going to use before you publish the README.

Also, keep the README at the **repository root**:

```text
DocumentHub-AI/
├── README.md        ← main project README
├── backend/
└── frontend-react/
