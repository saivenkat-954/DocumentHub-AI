import {
  useEffect,
  useRef,
  useState,
} from "react";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

import "./App.css";

const API_URL = "https://documenthub-ai-backend.onrender.com";

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

  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch(
          `${API_URL}/documents`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
            "Failed to load documents."
          );
        }

        setDocuments(data.documents || []);
      } catch (error) {
        console.error(
          "Failed to load documents:",
          error
        );
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
      selectedFile.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setUploadStatus(
        "Please select a PDF file."
      );
      return;
    }

    setFile(selectedFile);

    setUploadStatus(
      `Selected: ${selectedFile.name}`
    );
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

    const droppedFile =
      event.dataTransfer.files[0];

    handleFile(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus(
        "Please select a PDF first."
      );
      return;
    }

    const formData = new FormData();

    formData.append("file", file);

    setUploading(true);

    setUploadStatus(
      "Processing your document..."
    );

    try {
      const response = await fetch(
        `${API_URL}/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Upload failed."
        );
      }

      setDocuments(
        (previousDocuments) => {
          const exists =
            previousDocuments.some(
              (document) =>
                document.filename ===
                data.filename
            );

          if (exists) {
            return previousDocuments.map(
              (document) =>
                document.filename ===
                  data.filename
                  ? {
                    ...document,
                    chunks:
                      data.chunks,
                  }
                  : document
            );
          }

          return [
            ...previousDocuments,
            {
              filename:
                data.filename,
              chunks:
                data.chunks,
            },
          ];
        }
      );

      setUploadStatus(
        `✓ ${data.filename} uploaded successfully — ${data.chunks} chunks indexed.`
      );

      setFile(null);
    } catch (error) {
      setUploadStatus(
        `Error: ${error.message}`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (
    filename
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${filename}"?\n\nThis will remove the PDF and all of its indexed chunks from the RAG system.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingFile(filename);

    try {
      const response = await fetch(
        `${API_URL}/documents?filename=${encodeURIComponent(
          filename
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Failed to delete document."
        );
      }

      setDocuments(
        (previousDocuments) =>
          previousDocuments.filter(
            (document) =>
              document.filename !==
              filename
          )
      );

      if (
        file &&
        file.name === filename
      ) {
        setFile(null);
      }

      setUploadStatus(
        `✓ ${filename} deleted successfully.`
      );
    } catch (error) {
      setUploadStatus(
        `Error deleting document: ${error.message}`
      );
    } finally {
      setDeletingFile("");
    }
  };

  const handleAsk = async () => {
    const trimmedQuestion =
      question.trim();

    if (!trimmedQuestion) {
      return;
    }

    setMessages(
      (previousMessages) => [
        ...previousMessages,
        {
          role: "user",
          content:
            trimmedQuestion,
        },
      ]
    );

    setQuestion("");
    setAsking(true);

    try {
      const response = await fetch(
        `${API_URL}/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            question:
              trimmedQuestion,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Question failed."
        );
      }

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            role: "assistant",
            content:
              data.answer ||
              "No answer was returned.",
            sources:
              data.sources || [],
          },
        ]
      );
    } catch (error) {
      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            role: "assistant",
            content:
              `Sorry, something went wrong: ${error.message}`,
            sources: [],
          },
        ]
      );
    } finally {
      setAsking(false);
    }
  };

  const handleQuestionKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="app">
      <motion.header
        className="hero"
        initial={{
          opacity: 0,
          y: -25,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.7,
        }}
      >
        <div className="hero-badge">
          AI DOCUMENT INTELLIGENCE
        </div>

        <h1>
          DocumentHub{" "}
          <span>AI</span>
        </h1>

        <p>
          Upload your documents and ask
          questions using
          retrieval-augmented generation.
        </p>
      </motion.header>

      <main className="dashboard">
        {documents.length > 0 && (
          <motion.section
            className="document-library"
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
          >
            <div className="library-header">
              <div className="library-title">
                <span className="library-icon">
                  📚
                </span>

                <div>
                  <h2>
                    Your Documents
                  </h2>

                  <p>
                    {documents.length}{" "}
                    {documents.length ===
                      1
                      ? "document"
                      : "documents"}{" "}
                    indexed
                  </p>
                </div>
              </div>
            </div>

            <div className="document-list">
              {documents.map(
                (
                  document,
                  index
                ) => (
                  <motion.div
                    className="document-item"
                    key={
                      document.filename
                    }
                    initial={{
                      opacity: 0,
                      x: -15,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay:
                        index * 0.05,
                    }}
                  >
                    <div className="document-file-icon">
                      📄
                    </div>

                    <div className="document-details">
                      <strong
                        title={
                          document.filename
                        }
                      >
                        {
                          document.filename
                        }
                      </strong>

                      <span>
                        ✓{" "}
                        {
                          document.chunks
                        }{" "}
                        chunks indexed
                      </span>
                    </div>

                    <div className="document-status">
                      ✓
                    </div>

                    <button
                      className="delete-document-button"
                      onClick={() =>
                        handleDeleteDocument(
                          document.filename
                        )
                      }
                      disabled={
                        deletingFile ===
                        document.filename
                      }
                      title={`Delete ${document.filename}`}
                    >
                      {deletingFile ===
                        document.filename ? (
                        <span className="delete-spinner" />
                      ) : (
                        "×"
                      )}
                    </button>
                  </motion.div>
                )
              )}
            </div>
          </motion.section>
        )}

        <div className="content-grid">
          <motion.section
            className="card upload-card"
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.15,
              duration: 0.6,
            }}
            whileHover={{
              y: -3,
            }}
          >
            <div className="card-icon">
              📄
            </div>

            <h2>
              Upload a document
            </h2>

            <p className="card-description">
              Upload a PDF and let
              DocumentHub AI extract,
              chunk, and index its
              contents.
            </p>

            <div
              className={`drop-zone ${dragging
                  ? "dragging"
                  : ""
                }`}
              onDragOver={
                handleDragOver
              }
              onDragLeave={
                handleDragLeave
              }
              onDrop={handleDrop}
            >
              <div className="drop-icon">
                📄
              </div>

              <h3>
                {dragging
                  ? "Drop your PDF here"
                  : "Drag & drop your PDF"}
              </h3>

              <p>
                or
              </p>

              <label className="choose-button">
                Choose PDF

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  hidden
                  onChange={(
                    event
                  ) =>
                    handleFile(
                      event.target
                        .files[0]
                    )
                  }
                />
              </label>

              {file && (
                <motion.div
                  className="selected-file"
                  initial={{
                    opacity: 0,
                    scale: 0.95,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                >
                  <span>
                    📎
                  </span>

                  <span>
                    {file.name}
                  </span>
                </motion.div>
              )}
            </div>

            <button
              className="primary-button upload-button"
              onClick={
                handleUpload
              }
              disabled={
                uploading ||
                !file
              }
            >
              {uploading ? (
                <>
                  <span className="spinner" />
                  Processing...
                </>
              ) : (
                "Upload PDF"
              )}
            </button>

            {uploadStatus && (
              <motion.div
                className={`upload-status ${uploadStatus.startsWith(
                  "Error"
                )
                    ? "error"
                    : "success"
                  }`}
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                {uploadStatus}
              </motion.div>
            )}
          </motion.section>

          <motion.section
            className="card chat-card"
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.25,
              duration: 0.6,
            }}
          >
            <div className="card-icon">
              💬
            </div>

            <h2>
              Ask your document
            </h2>

            <p className="card-description">
              Ask questions and get
              answers based on the
              information inside your
              documents.
            </p>

            <div className="chat-messages">
              {messages.length === 0 &&
                !asking && (
                  <div className="empty-chat">
                    <div className="empty-chat-icon">
                      ✨
                    </div>

                    <h3>
                      Ready to answer
                    </h3>

                    <p>
                      Upload one or more
                      documents, then ask
                      a question.
                    </p>
                  </div>
                )}

              {messages.map(
                (
                  message,
                  index
                ) => (
                  <motion.div
                    className={`message ${message.role}`}
                    key={index}
                    initial={{
                      opacity: 0,
                      y: 12,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                  >
                    <div className="message-label">
                      {message.role ===
                        "user" ? (
                        <>
                          <span>
                            👤
                          </span>
                          You
                        </>
                      ) : (
                        <>
                          <span>
                            ✨
                          </span>
                          DocumentHub AI
                        </>
                      )}
                    </div>

                    <div className="message-content">
                      {message.role ===
                        "assistant" ? (
                        <>
                          <ReactMarkdown>
                            {
                              message.content
                            }
                          </ReactMarkdown>

                          {message.sources &&
                            message.sources
                              .length >
                            0 && (
                              <div className="sources">
                                <div className="sources-title">
                                  📚 Sources
                                </div>

                                <div className="sources-list">
                                  {message.sources.map(
                                    (
                                      source,
                                      sourceIndex
                                    ) => (
                                      <div
                                        className="source-item"
                                        key={
                                          sourceIndex
                                        }
                                      >
                                        <span className="source-icon">
                                          📄
                                        </span>

                                        <span className="source-text">
                                          {
                                            source.filename
                                          }

                                          {" · "}

                                          Chunk{" "}

                                          {
                                            source.chunk
                                          }
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </>
                      ) : (
                        <p>
                          {
                            message.content
                          }
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              )}

              {asking && (
                <motion.div
                  className="message assistant thinking-message"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                >
                  <div className="message-label">
                    <span>
                      ✨
                    </span>

                    DocumentHub AI
                  </div>

                  <div className="thinking">
                    <div className="thinking-dots">
                      <span />
                      <span />
                      <span />
                    </div>

                    <span>
                      Searching your
                      documents...
                    </span>
                  </div>
                </motion.div>
              )}

              <div
                ref={chatEndRef}
              />
            </div>

            <div className="question-area">
              <textarea
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleQuestionKeyDown
                }
                placeholder="Ask something about your document..."
                rows={4}
              />

              <button
                className="primary-button ask-button"
                onClick={handleAsk}
                disabled={
                  asking ||
                  !question.trim()
                }
              >
                {asking ? (
                  <>
                    <span className="spinner" />
                    Thinking...
                  </>
                ) : (
                  "Ask Question →"
                )}
              </button>
            </div>
          </motion.section>
        </div>
      </main>

      <footer>
        <span>
          Built with
        </span>

        <strong>
          React
        </strong>

        <span>·</span>

        <strong>
          FastAPI
        </strong>

        <span>·</span>

        <strong>
          ChromaDB
        </strong>

        <span>·</span>

        <strong>
          Gemini
        </strong>
      </footer>
    </div>
  );
}

export default App;