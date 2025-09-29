// src/components/QuestionGenerator.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../styles/QuestionGenerator.css";
import { useNavigate } from "react-router-dom";

export default function QuestionGenerator() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [subtopics, setSubtopics] = useState([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState("");
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  const [examBoard, setExamBoard] = useState("OCR");
  const [numberOfQuestions, setNumberOfQuestions] = useState("3");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState("");
  const [openIndexes, setOpenIndexes] = useState({});
  const [userAnswers, setUserAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [marking, setMarking] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [answered, setAnswered] = useState({});

  // One-at-a-time navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  // NEW: track furthest question the user has reached (inclusive)
  const [maxSeenIndex, setMaxSeenIndex] = useState(0);

  // Progress bar state + interval ref
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  const navigate = useNavigate();
  const API = "http://127.0.0.1:8000/api";

  // 1) Fetch topics on mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const { data } = await axios.get(`${API}/biology-topics/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        setTopics(data);
        setSelectedTopic("");
      } catch (err) {
        console.error("Failed to fetch topics:", err);
      }
    };
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Fetch subtopics when topic changes
  useEffect(() => {
    const run = async () => {
      if (!selectedTopic) {
        setSubtopics([]);
        setSelectedSubtopic("");
        setSubcategories([]);
        setSelectedSubcategory("");
        return;
      }
      try {
        const accessToken = localStorage.getItem("accessToken");
        const { data } = await axios.get(
          `${API}/biology-subtopics/?topic_id=${selectedTopic}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        setSubtopics(data);
        setSelectedSubtopic("");
        setSubcategories([]);
        setSelectedSubcategory("");
      } catch (e) {
        console.error("Failed to fetch subtopics:", e);
        setSubtopics([]);
        setSelectedSubtopic("");
        setSubcategories([]);
        setSelectedSubcategory("");
      }
    };
    run();
  }, [selectedTopic]);

  // 3) Fetch subcategories when subtopic changes
  useEffect(() => {
    const run = async () => {
      if (!selectedSubtopic) {
        setSubcategories([]);
        setSelectedSubcategory("");
        return;
      }
      try {
        const accessToken = localStorage.getItem("accessToken");
        const { data } = await axios.get(
          `${API}/biology-subcategories/?subtopic_id=${selectedSubtopic}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        setSubcategories(data);
        setSelectedSubcategory("");
      } catch (e) {
        console.error("Failed to fetch subcategories:", e);
        setSubcategories([]);
        setSelectedSubcategory("");
      }
    };
    run();
  }, [selectedSubtopic]);

  const startProgress = () => {
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress((old) => {
        if (old >= 95) return old;
        const increment = old < 40 ? 7 : old < 70 ? 5 : 3;
        return Math.min(95, old + increment);
      });
    }, 300);
  };

  const stopProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setQuestions(null);
    setOpenIndexes({});
    setUserAnswers({});
    setFeedback({});
    setMarking({});
    setFinalFeedback("");
    setAnswered({});
    setCurrentIndex(0);
    setMaxSeenIndex(0); // NEW: reset seen tracker

    startProgress();

    try {
      const accessToken = localStorage.getItem("accessToken");
      const payload = {
        topic_id: Number(selectedTopic),
        subtopic_id: selectedSubtopic ? Number(selectedSubtopic) : null,
        subcategory_id: selectedSubcategory ? Number(selectedSubcategory) : null,
        exam_board: examBoard,
        number_of_questions: parseInt(numberOfQuestions, 10),
      };

      const { data } = await axios.post(`${API}/generate-questions/`, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      setQuestions(data.questions);
      setSessionId(data.session_id);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || "Something went wrong. Please try again."
      );
    } finally {
      stopProgress();
    }
  };

  const handleAnswerChange = (index, value) => {
    setUserAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleMarkAnswer = async (index) => {
    const answer = userAnswers[index];
    const question = questions[index].question;
    const mark_scheme = questions[index].mark_scheme;

    if (!answer?.trim()) return;

    setAnswered((prev) => ({ ...prev, [index]: true }));
    setMarking((prev) => ({ ...prev, [index]: true }));

    try {
      const accessToken = localStorage.getItem("accessToken");
      const { data } = await axios.post(
        `${API}/mark-answer/`,
        {
          question,
          mark_scheme,
          user_answer: answer,
          exam_board: examBoard,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      setFeedback((prev) => ({ ...prev, [index]: data }));
    } catch (err) {
      console.error(err);
      setFeedback((prev) => ({
        ...prev,
        [index]: { error: "Marking failed. Please try again." },
      }));
    } finally {
      setMarking((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleSubmitAll = async () => {
    if (!sessionId) {
      alert("No session ID available.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to submit all answers?"
    );
    if (!confirmed) return;

    setIsSubmittingAll(true);
    const accessToken = localStorage.getItem("accessToken");

    const answers = questions.map((q, index) => ({
      question: q.question,
      user_answer: userAnswers[index] || "",
      mark_scheme: q.mark_scheme,
      score: feedback[index]?.score || 0,
    }));

    try {
      const { data } = await axios.post(
        `${API}/submit-question-session/`,
        {
          session_id: sessionId,
          answers,
          feedback: finalFeedback,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      setFinalFeedback(data.feedback);
      setHasSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit session.");
      setIsSubmittingAll(false);
    }
  };

  // Navigation helpers
  const canPrev = currentIndex > 0;
  const canNext = questions ? currentIndex < questions.length - 1 : false;

  const goPrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    // maxSeenIndex unchanged when moving back
  };

  const goNext = () => {
    if (!questions) return;
    setCurrentIndex((i) => {
      const next = Math.min(questions.length - 1, i + 1);
      setMaxSeenIndex((m) => Math.max(m, next)); // update seen furthest
      return next;
    });
  };

  const jumpTo = (i) => {
    // Only allow jumping to indices that are already seen
    setCurrentIndex((curr) => {
      if (i <= maxSeenIndex) return i;
      return curr; // ignore if trying to jump forward past seen
    });
  };

  return (
    <div className="question-generator-page">
      <h2>Generated Exam Questions</h2>

      {!questions && (
        <form onSubmit={handleSubmit}>
          {/* Topic */}
          <div>
            <label>Topic (Module):</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              style={{ width: "100%", marginBottom: "1rem" }}
              required
            >
              <option value="">-- Please Select --</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.topic}
                </option>
              ))}
            </select>
          </div>

          {/* SubTopic */}
          {subtopics.length > 0 && (
            <div>
              <label>SubTopic:</label>
              <select
                value={selectedSubtopic}
                onChange={(e) => setSelectedSubtopic(e.target.value)}
                style={{ width: "100%", marginBottom: "1rem" }}
                disabled={!subtopics.length}
              >
                <option value="">-- Please Select --</option>
                {subtopics.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SubCategory */}
          {subcategories.length > 0 && (
            <div>
              <label>SubCategory:</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                style={{ width: "100%", marginBottom: "1rem" }}
                disabled={!subcategories.length}
              >
                <option value="">-- optional --</option>
                {subcategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Exam board + number */}
          <div>
            <label>Exam Board:</label>
            <select
              value={examBoard}
              onChange={(e) => setExamBoard(e.target.value)}
              style={{ width: "100%", marginBottom: "1rem" }}
            >
              <option value="AQA" disabled>AQA - Specific spec coming soon</option>
              <option value="OCR">OCR</option>
            </select>
          </div>

          <div>
            <label>Number of Questions:</label>
            <select
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(e.target.value)}
              style={{ width: "100%", marginBottom: "1rem" }}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="10">10</option>
            </select>
          </div>

          <button
            className="qg-button qg-button-primary"
            type="submit"
            disabled={loading}
            style={{
              position: "relative",
              overflow: "hidden",
              width: "100%",
              display: "block",
            }}
          >
            {loading ? (
              <div style={{ width: "100%" }}>
                <div
                  style={{
                    height: "6px",
                    width: "100%",
                    background: "#e9ecef",
                    borderRadius: "4px",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      transition: "width 0.3s ease",
                      background: "#007bff",
                      borderRadius: "4px",
                    }}
                  />
                </div>
                <span style={{ fontSize: "0.9rem" }}>Generating...</span>
              </div>
            ) : (
              "Generate Questions"
            )}
          </button>

          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      )}

      {/* One-at-a-time question view */}
      {questions && (
        <div style={{ marginTop: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0 }}>
              Question {currentIndex + 1} of {questions.length}
            </h3>
            <div style={{ fontStyle: "italic" }}>
              {Math.round(((currentIndex + 1) / questions.length) * 100)}% viewed
            </div>
          </div>

          {/* Current question */}
          {(() => {
            const q = questions[currentIndex];
            const isOpen = openIndexes[currentIndex] || false;
            const toggle = () => {
              setOpenIndexes((prev) => ({
                ...prev,
                [currentIndex]: !prev[currentIndex],
              }));
            };

            return (
              <div
                key={currentIndex}
                style={{
                  marginBottom: "2rem",
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "1rem",
                }}
              >
                <p>
                  <strong>Q{currentIndex + 1}:</strong> {q.question}
                </p>

                <button
                  type="button"
                  onClick={toggle}
                  style={{
                    marginBottom: "0.5rem",
                    padding: "0.4rem 0.6rem",
                    cursor: "pointer",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                >
                  {isOpen ? "Hide Mark Scheme" : "Show Mark Scheme"}
                </button>

                {isOpen && (
                  <ul>
                    {q.mark_scheme.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}

                <div style={{ marginTop: "1rem" }}>
                  <label>Your Answer:</label>
                  <textarea
                    rows={4}
                    value={userAnswers[currentIndex] || ""}
                    onChange={(e) =>
                      handleAnswerChange(currentIndex, e.target.value)
                    }
                    disabled={answered[currentIndex]}
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                  />
                  <button
                    className="mark-button"
                    onClick={() => handleMarkAnswer(currentIndex)}
                    disabled={marking[currentIndex] || answered[currentIndex]}
                  >
                    {marking[currentIndex] ? (
                      <>
                        Marking...
                        <span className="qg-spinner" />
                      </>
                    ) : (
                      "Check Answer"
                    )}
                  </button>
                </div>

                {feedback[currentIndex] && (
                  <div style={{ marginTop: "0.75rem" }}>
                    {feedback[currentIndex].error ? (
                      <p style={{ color: "red" }}>
                        {feedback[currentIndex].error}
                      </p>
                    ) : (
                      <>
                        <p>
                          <strong>Score:</strong>{" "}
                          {feedback[currentIndex].score} /{" "}
                          {feedback[currentIndex].out_of}
                        </p>
                        <p>
                          <strong>Feedback:</strong>{" "}
                          {feedback[currentIndex].feedback}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Navigation */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className="qg-button"
              style={{
                opacity: canPrev ? 1 : 0.6,
                cursor: canPrev ? "pointer" : "not-allowed",
              }}
            >
              ← Previous
            </button>

            <div style={{ flex: 1, textAlign: "center" }}>
              <small>
                Jump to:{" "}
                {/* Only render buttons for seen questions (0..maxSeenIndex) */}
                {Array.from({ length: maxSeenIndex + 1 }).map((_, i) => (
                  <button
                    key={`jump-${i}`}
                    onClick={() => jumpTo(i)}
                    className="qg-button"
                    style={{
                      padding: "0.2rem 0.5rem",
                      margin: "0 0.2rem",
                      border:
                        i === currentIndex
                          ? "2px solid #007bff"
                          : "1px solid #ccc",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </small>
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="qg-button qg-button-primary"
              style={{
                opacity: canNext ? 1 : 0.6,
                cursor: canNext ? "pointer" : "not-allowed",
              }}
            >
              Next →
            </button>
          </div>

          {/* Submit all */}
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button
              onClick={handleSubmitAll}
              disabled={isSubmittingAll || hasSubmitted}
              style={{
                padding: "0.6rem 1rem",
                backgroundColor:
                  isSubmittingAll || hasSubmitted ? "#6c757d" : "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor:
                  isSubmittingAll || hasSubmitted ? "not-allowed" : "pointer",
              }}
            >
              {hasSubmitted
                ? "Submitted ✅"
                : isSubmittingAll
                ? "Submitting..."
                : "Submit All Answers"}
            </button>
          </div>

          {finalFeedback && typeof finalFeedback === "object" && (
            <div className="qg-feedback-overlay">
              <div className="qg-feedback-modal">
                <h4>Strengths</h4>
                {finalFeedback.strengths?.length ? (
                  <ul>
                    {finalFeedback.strengths.map((item, idx) => (
                      <li key={`strength-${idx}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No strengths provided.</p>
                )}

                <h4>Improvements</h4>
                {finalFeedback.improvements?.length ? (
                  <ul>
                    {finalFeedback.improvements.map((item, idx) => (
                      <li key={`improvement-${idx}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No improvements provided.</p>
                )}

                <button
                  className="qg-close-button"
                  onClick={() => {
                    setFinalFeedback("");
                    navigate("/my-results");
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
