import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_URL = "https://documenthub-ai-backend.onrender.com";

function Logo({ size = 48 }) {
  return (
    <svg
      className="brand-logo"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c6cff" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill="#10152f" />
      <rect
        x="14"
        y="13"
        width="25"
        height="32"
        rx="3"
        fill="url(#logoGradient)"
      />
      <rect
        x="25"
        y="20"
        width="25"
        height="32"
        rx="3"
        fill="#55d6be"
      />
      <rect
        x="19"
        y="27"
        width="25"
        height="32"
        rx="3"
        fill="#6366f1"
      />

      <path
        d="M27 36h13M27 41h10M27 46h7"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [deletingFile, setDeletingFile] = useState("");
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState([]);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("documenthub-theme") || "light";
  });

  const [showIntro, setShowIntro] = useState(true);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("documenthub-theme", theme);
  }, [theme]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch(`${API_URL}/documents`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load documents.");
        }

        setDocuments(data.documents || []);
      } catch (error) {
        setUploadStatus(`Error: ${error.message}`);
      }
    };

    loadDocuments();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, asking]);

  const handleFile = (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setUploadStatus("Please select a PDF file.");
      return;
    }

    setFile(selectedFile);
    setUploadStatus(`Selected: ${selectedFile.name}`);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus("Please select a PDF first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setUploadStatus("Processing your document...");

    try {
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setDocuments((previousDocuments) => {
        const exists = previousDocuments.some(
          (document) => document.filename === data.filename
        );

        if (exists) {
          return previousDocuments.map((document) =>
            document.filename === data.filename
              ? {
                ...document,
                chunks: data.chunks,
              }
              : document
          );
        }

        return [
          ...previousDocuments,
          {
            filename: data.filename,
            chunks: data.chunks,
          },
        ];
      });

      setUploadStatus(
        `✓ ${data.filename} uploaded successfully — ${data.chunks} chunks indexed.`
      );

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (filename) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${filename}"?\n\nThis will remove the PDF and all of its indexed chunks from the RAG system.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingFile(filename);

    try {
      const response = await fetch(
        `${API_URL}/documents?filename=${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to delete document.");
      }

      setDocuments((previousDocuments) =>
        previousDocuments.filter(
          (document) => document.filename !== filename
        )
      );

      if (file && file.name === filename) {
        setFile(null);
      }

      setUploadStatus(`✓ ${filename} deleted successfully.`);
    } catch (error) {
      setUploadStatus(`Error deleting document: ${error.message}`);
    } finally {
      setDeletingFile("");
    }
  };

  const handleAsk = async (customQuestion) => {
    const trimmedQuestion = (customQuestion ?? question).trim();

    if (!trimmedQuestion || asking) {
      return;
    }

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        role: "user",
        content: trimmedQuestion,
      },
    ]);

    setQuestion("");
    setAsking(true);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Question failed.");
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content: data.answer || "No answer was returned.",
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${error.message}`,
          sources: [],
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleQuestionKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleAsk();
    }
  };

  const suggestedQuestions = [
    "What is this document about?",
    "What are the main projects mentioned?",
    "Summarize the key points",
    "What technologies are used?",
  ];

  const totalChunks = documents.reduce(
    (total, document) => total + Number(document.chunks || 0),
    0
  );

  if (showIntro) {
    return (
      <div className="intro-page">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <header className="intro-topbar">
          <div className="brand">
            <Logo size={50} />

            <div className="brand-copy">
              <div className="brand-name">
                DocumentHub <span>AI</span>
              </div>

              <div className="brand-subtitle">
                Intelligent document assistant
              </div>
            </div>
          </div>

          <button
            className="theme-toggle"
            onClick={() =>
              setTheme((current) =>
                current === "dark" ? "light" : "dark"
              )
            }
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </header>

        <main className="intro-content">
          <section className="intro-hero">
            <motion.div
              className="intro-copy"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="hero-badge">
                <span>✦</span>
                AI DOCUMENT INTELLIGENCE
              </div>

              <h1>
                Your documents.
                <br />
                <span>Smarter answers.</span>
              </h1>

              <p>
                Welcome to DocumentHub AI — an intelligent workspace
                that turns your PDFs into searchable knowledge. Upload
                a document, ask questions naturally, and discover
                answers grounded in its content.
              </p>

              <div className="intro-actions">
                <button
                  className="intro-primary-button"
                  onClick={() => setShowIntro(false)}
                >
                  Get Started
                  <span>→</span>
                </button>
              </div>

              <div className="intro-trust">
                <span>✓</span>
                RAG-powered answers
                <span>✓</span>
                Source-aware responses
                <span>✓</span>
                PDF processing
              </div>
            </motion.div>

            <motion.div
              className="intro-visual"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
            >
              <div className="intro-orbit intro-orbit-one" />
              <div className="intro-orbit intro-orbit-two" />
              <div className="intro-logo-glow" />

              <Logo size={250} />

              <div className="intro-floating-card intro-card-top">
                <span className="intro-card-icon purple">✦</span>

                <div>
                  <strong>Ask anything</strong>
                  <span>Natural language Q&A</span>
                </div>
              </div>

              <div className="intro-floating-card intro-card-bottom">
                <span className="intro-card-icon teal">✓</span>

                <div>
                  <strong>Grounded answers</strong>
                  <span>Powered by your documents</span>
                </div>
              </div>
            </motion.div>
          </section>

          <motion.section
            className="intro-features"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="intro-feature-card">
              <div className="intro-feature-icon purple">↑</div>

              <div>
                <h3>Upload</h3>
                <p>
                  Add your PDF and let DocumentHub AI process it.
                </p>
              </div>
            </div>

            <div className="intro-feature-card">
              <div className="intro-feature-icon teal">✦</div>

              <div>
                <h3>Ask AI</h3>
                <p>
                  Ask questions in natural language and get concise
                  answers.
                </p>
              </div>
            </div>

            <div className="intro-feature-card">
              <div className="intro-feature-icon blue">▤</div>

              <div>
                <h3>Explore Sources</h3>
                <p>
                  See the document chunks behind each generated answer.
                </p>
              </div>
            </div>
          </motion.section>
        </main>

        <footer className="intro-footer">
          <span>DocumentHub AI</span>
          <span>React</span>
          <span>FastAPI</span>
          <span>ChromaDB</span>
          <span>Gemini</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand">
          <Logo size={50} />

          <div className="brand-copy">
            <div className="brand-name">
              DocumentHub <span>AI</span>
            </div>

            <div className="brand-subtitle">
              Intelligent document assistant
            </div>
          </div>
        </div>

        <div className="header-actions">
          <div className="status-pill">
            <span className="status-dot" />
            Online
          </div>

          <button
            className="theme-toggle"
            onClick={() =>
              setTheme((current) =>
                current === "dark" ? "light" : "dark"
              )
            }
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <div className="ai-pill">
            <span>✦</span>
            RAG Assistant
          </div>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span>✦</span>
              AI DOCUMENT INTELLIGENCE
            </div>

            <h1>
              Your documents.
              <br />
              <span>Smarter answers.</span>
            </h1>

            <p>
              Upload PDFs, search their content, and ask questions
              with retrieval-augmented generation.
            </p>

            <div className="hero-stats">
              <div className="stat-card">
                <div className="stat-icon purple">▤</div>

                <div>
                  <strong>{documents.length}</strong>
                  <span>Documents</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon teal">◇</div>

                <div>
                  <strong>{totalChunks}</strong>
                  <span>Chunks indexed</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">✦</div>

                <div>
                  <strong>
                    {messages.filter((m) => m.role === "user").length}
                  </strong>
                  <span>Questions asked</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-logo-wrap">
            <div className="hero-glow" />
            <Logo size={220} />

            <div className="floating-card floating-card-one">
              <span>AI</span>
              Intelligent
            </div>

            <div className="floating-card floating-card-two">
              <span>✓</span>
              RAG Ready
            </div>
          </div>
        </section>

        {documents.length > 0 && (
          <motion.section
            className="documents-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="section-heading">
              <div>
                <div className="section-eyebrow">LIBRARY</div>

                <h2>Your Documents</h2>

                <p>
                  {documents.length}{" "}
                  {documents.length === 1
                    ? "document"
                    : "documents"}{" "}
                  ready for intelligent search
                </p>
              </div>

              <div className="indexed-badge">
                <span>✓</span>
                All indexed
              </div>
            </div>

            <div className="documents-grid">
              {documents.map((document, index) => (
                <motion.div
                  className="document-card"
                  key={document.filename}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="document-top">
                    <div className="pdf-icon">PDF</div>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDeleteDocument(document.filename)
                      }
                      disabled={
                        deletingFile === document.filename
                      }
                      title="Delete document"
                    >
                      {deletingFile === document.filename ? (
                        <span className="mini-spinner" />
                      ) : (
                        "×"
                      )}
                    </button>
                  </div>

                  <div
                    className="document-name"
                    title={document.filename}
                  >
                    {document.filename}
                  </div>

                  <div className="document-meta">
                    <span>{document.chunks || 0} chunks</span>

                    <span className="indexed-dot">
                      <span />
                      Indexed
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        <div className="main-grid">
          <motion.section
            className="panel upload-panel"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="panel-heading">
              <div className="panel-icon upload-icon">↑</div>

              <div>
                <div className="section-eyebrow">
                  DOCUMENT PROCESSING
                </div>

                <h2>Upload Document</h2>

                <p>
                  Add a PDF and let DocumentHub AI extract, chunk,
                  and index it.
                </p>
              </div>
            </div>

            <div
              className={`drop-zone ${dragging ? "dragging" : ""
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={(event) =>
                  handleFile(event.target.files[0])
                }
              />

              <div className="upload-cloud">↑</div>

              <h3>
                {dragging
                  ? "Drop your PDF here"
                  : "Drag & drop your PDF"}
              </h3>

              <p>or click to browse your files</p>

              <button
                type="button"
                className="browse-button"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choose PDF File
              </button>

              <span className="upload-hint">
                PDF files only · Secure document processing
              </span>
            </div>

            <AnimatePresence>
              {file && (
                <motion.div
                  className="selected-file"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="selected-file-icon">
                    PDF
                  </div>

                  <div className="selected-file-info">
                    <strong>{file.name}</strong>

                    <span>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setFile(null);

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    ×
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              className="primary-button upload-button"
              onClick={handleUpload}
              disabled={uploading || !file}
            >
              {uploading ? (
                <>
                  <span className="spinner" />
                  Processing document...
                </>
              ) : (
                <>
                  ↑
                  Upload & Process
                </>
              )}
            </button>

            {uploadStatus && (
              <motion.div
                className={`upload-status ${uploadStatus.startsWith("Error")
                    ? "error"
                    : "success"
                  }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span>
                  {uploadStatus.startsWith("Error") ? "!" : "✓"}
                </span>

                {uploadStatus.replace(/^[✓!]\s*/, "")}
              </motion.div>
            )}
          </motion.section>

          <motion.section
            className="panel chat-panel"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="chat-header">
              <div className="panel-heading">
                <div className="panel-icon chat-icon">✦</div>

                <div>
                  <div className="section-eyebrow">
                    AI ASSISTANT
                  </div>

                  <h2>Ask your document</h2>

                  <p>
                    Get grounded answers from your indexed
                    documents.
                  </p>
                </div>
              </div>

              {messages.length > 0 && (
                <button
                  className="clear-chat"
                  onClick={() => setMessages([])}
                >
                  Clear chat
                </button>
              )}
            </div>

            <div className="chat-body">
              {messages.length === 0 && !asking ? (
                <div className="empty-chat">
                  <div className="empty-logo">
                    <Logo size={70} />
                  </div>

                  <h3>Ready to answer</h3>

                  <p>
                    Upload a document and ask anything about its
                    contents.
                  </p>

                  {documents.length > 0 && (
                    <div className="suggestions">
                      {suggestedQuestions.map((item) => (
                        <button
                          key={item}
                          onClick={() => handleAsk(item)}
                        >
                          <span>✦</span>
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <motion.div
                      className={`message-row ${message.role}`}
                      key={`${message.role}-${index}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="message-avatar">
                        {message.role === "user" ? (
                          "You"
                        ) : (
                          <Logo size={30} />
                        )}
                      </div>

                      <div className="message-wrapper">
                        <div className="message-name">
                          {message.role === "user"
                            ? "You"
                            : "DocumentHub AI"}
                        </div>

                        <div className="message-bubble">
                          {message.role === "assistant" ? (
                            <ReactMarkdown>
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p>{message.content}</p>
                          )}

                          {message.sources &&
                            message.sources.length > 0 && (
                              <div className="sources">
                                <div className="sources-heading">
                                  <span>▤</span>
                                  Sources
                                </div>

                                <div className="sources-grid">
                                  {message.sources.map(
                                    (source, sourceIndex) => (
                                      <div
                                        className="source-card"
                                        key={sourceIndex}
                                      >
                                        <div className="source-file-icon">
                                          PDF
                                        </div>

                                        <div>
                                          <strong>
                                            {source.filename}
                                          </strong>

                                          <span>
                                            Chunk {source.chunk}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {asking && (
                    <motion.div
                      className="message-row assistant"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="message-avatar">
                        <Logo size={30} />
                      </div>

                      <div className="message-wrapper">
                        <div className="message-name">
                          DocumentHub AI
                        </div>

                        <div className="thinking-bubble">
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />

                          <span className="thinking-text">
                            Searching your documents...
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              <div ref={chatEndRef} />
            </div>

            {documents.length > 0 && (
              <div className="chat-suggestions">
                {suggestedQuestions.slice(0, 3).map((item) => (
                  <button
                    key={item}
                    onClick={() => handleAsk(item)}
                    disabled={asking}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            <div className="question-box">
              <textarea
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={handleQuestionKeyDown}
                placeholder="Ask anything about your documents..."
                rows={2}
                disabled={asking}
              />

              <button
                className="send-button"
                onClick={() => handleAsk()}
                disabled={asking || !question.trim()}
                aria-label="Ask question"
              >
                {asking ? (
                  <span className="spinner" />
                ) : (
                  "➤"
                )}
              </button>
            </div>

            <div className="chat-footer">
              <span>Enter to send</span>
              <span>Shift + Enter for new line</span>
            </div>
          </motion.section>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <Logo size={32} />

          <span>
            DocumentHub <strong>AI</strong>
          </span>
        </div>

        <div className="footer-tech">
          <span>React</span>
          <span>FastAPI</span>
          <span>ChromaDB</span>
          <span>Gemini</span>
        </div>

        <span className="footer-copy">
          Intelligent document understanding
        </span>
      </footer>
    </div>
  );
}

export default App;
