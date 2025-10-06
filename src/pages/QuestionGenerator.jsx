// src/components/QuestionGenerator.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../styles/QuestionGenerator.modern.css";
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxSeenIndex, setMaxSeenIndex] = useState(0);

  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  const navigate = useNavigate();
  const API = "https://exambuilder-efae14d59f03.herokuapp.com/api";

  // --- Fetch topics when examBoard changes (and pass ?exam_board=...)
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const { data } = await axios.get(
          `${API}/biology-topics/?exam_board=${encodeURIComponent(examBoard)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        setTopics(data || []);
        // Clear cascading selections on board change
        setSelectedTopic("");
        setSubtopics([]);
        setSelectedSubtopic("");
        setSubcategories([]);
        setSelectedSubcategory("");
      } catch (err) {
        console.error("Failed to fetch topics:", err);
        setTopics([]);
        setSelectedTopic("");
        setSubtopics([]);
        setSelectedSubtopic("");
        setSubcategories([]);
        setSelectedSubcategory("");
      }
    };
    fetchTopics();
  }, [examBoard]); // IMPORTANT

  // --- Fetch subtopics when selectedTopic OR examBoard changes
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
          `${API}/biology-subtopics/?topic_id=${selectedTopic}&exam_board=${encodeURIComponent(examBoard)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        setSubtopics(data || []);
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
  }, [selectedTopic, examBoard]); // IMPORTANT

  // --- Fetch subcategories when selectedSubtopic OR examBoard changes
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
          `${API}/biology-subcategories/?subtopic_id=${selectedSubtopic}&exam_board=${encodeURIComponent(examBoard)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        setSubcategories(data || []);
        setSelectedSubcategory("");
      } catch (e) {
        console.error("Failed to fetch subcategories:", e);
        setSubcategories([]);
        setSelectedSubcategory("");
      }
    };
    run();
  }, [selectedSubtopic, examBoard]); // IMPORTANT

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
    setMaxSeenIndex(0);

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
    const confirmed = window.confirm("Are you sure you want to submit all answers?");
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

  const canPrev = currentIndex > 0;
  const canNext = questions ? currentIndex < questions.length - 1 : false;

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (!questions) return;
    setCurrentIndex((i) => {
      const next = Math.min(questions.length - 1, i + 1);
      setMaxSeenIndex((m) => Math.max(m, next));
      return next;
    });
  };
  const jumpTo = (i) => setCurrentIndex((curr) => (i <= maxSeenIndex ? i : curr));

  return (
    <div className="qg-root container">
      <header className="qg-header">
        <h1>Generate Questions</h1>
        <p className="muted">
          Choose your scope, generate questions, answer one-by-one, and get instant marking.
        </p>
      </header>

      {!questions && (
        <form onSubmit={handleSubmit} className="qg-card">
          {/* Vertically stacked essentials */}
          <div className="qg-vert">
            {/* Exam board */}
            <div className="qg-field">
              <label className="qg-label">Exam Board</label>
              <select
                className="qg-input"
                value={examBoard}
                onChange={(e) => {
                  setExamBoard(e.target.value);
                  // immediate defensive reset (the fetch also clears)
                  setSelectedTopic("");
                  setSubtopics([]);
                  setSelectedSubtopic("");
                  setSubcategories([]);
                  setSelectedSubcategory("");
                }}
              >
                <option value="AQA">AQA</option>
                <option value="OCR">OCR</option>
              </select>
            </div>

            {/* Topic */}
            {topics.length > 0 ? (
              <div className="qg-field">
                <label className="qg-label">Topic (Module)</label>
                <select
                  className="qg-input"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
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
            ) : (
              <div className="qg-field">
                <label className="qg-label">Topic (Module)</label>
                <div className="muted">No topics available.</div>
              </div>
            )}

            {/* Subtopics (optional) */}
            {subtopics.length > 0 && (
              <div className="qg-field">
                <label className="qg-label">SubTopic (Optional)</label>
                <select
                  className="qg-input"
                  value={selectedSubtopic}
                  onChange={(e) => setSelectedSubtopic(e.target.value)}
                >
                  <option value="">-- Optional --</option>
                  {subtopics.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subcategories (optional) */}
            {subcategories.length > 0 && (
              <div className="qg-field">
                <label className="qg-label">SubCategory (Optional)</label>
                <select
                  className="qg-input"
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                >
                  <option value="">-- Optional --</option>
                  {subcategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Number of questions */}
            <div className="qg-field">
              <label className="qg-label">Number of Questions</label>
              <select
                className="qg-input"
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(e.target.value)}
              >
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="6">6</option>
                <option value="8">8</option>
                <option value="10">10</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn--primary qg-generate"
            type="submit"
            disabled={loading || topics.length === 0 || !selectedTopic}
          >
            {loading ? "Generating…" : "Generate Questions"}
          </button>

          {loading && (
            <div className="qg-progress" aria-live="polite">
              <div className="qg-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}

          {error && <p className="qg-error">{error}</p>}
        </form>
      )}

      {questions && (
        <section className="qg-card">
          <div className="qg-toprow">
            <h2>
              Question {currentIndex + 1} of {questions.length}
            </h2>
            <span className="muted">
              {Math.round(((currentIndex + 1) / questions.length) * 100)}% viewed
            </span>
          </div>

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
              <article className="qg-question">
                <p className="qg-qtext">
                  <strong>Q{currentIndex + 1}.</strong> {q.question}
                </p>

                <button type="button" onClick={toggle} className="btn btn--subtle">
                  {isOpen ? "Hide Mark Scheme" : "Show Mark Scheme"}
                </button>

                {isOpen && (
                  <ul className="qg-marks">
                    {q.mark_scheme.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}

                <div className="qg-answer">
                  <label className="qg-label">Your Answer</label>
                  <textarea
                    rows={6}
                    className="qg-input"
                    value={userAnswers[currentIndex] || ""}
                    onChange={(e) => handleAnswerChange(currentIndex, e.target.value)}
                    disabled={answered[currentIndex]}
                  />
                  <button
                    className="btn btn--ghost"
                    onClick={() => handleMarkAnswer(currentIndex)}
                    disabled={marking[currentIndex] || answered[currentIndex]}
                  >
                    {marking[currentIndex] ? (
                      <>
                        Marking… <span className="qg-spinner" />
                      </>
                    ) : (
                      "Check Answer"
                    )}
                  </button>
                </div>

                {feedback[currentIndex] && (
                  <div className="qg-feedback">
                    {feedback[currentIndex].error ? (
                      <p className="qg-error">{feedback[currentIndex].error}</p>
                    ) : (
                      <>
                        <p>
                          <strong>Score:</strong> {feedback[currentIndex].score} /{" "}
                          {feedback[currentIndex].out_of}
                        </p>
                        <p>
                          <strong>Feedback:</strong> {feedback[currentIndex].feedback}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })()}

          <div className="qg-nav">
            <button type="button" onClick={goPrev} disabled={!canPrev} className="btn">
              ← Previous
            </button>

            <div className="qg-jumps">
              <small>Jump to:</small>
              {Array.from({ length: maxSeenIndex + 1 }).map((_, i) => (
                <button
                  key={`jump-${i}`}
                  onClick={() => jumpTo(i)}
                  className={`qg-jump ${i === currentIndex ? "is-active" : ""}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button type="button" onClick={goNext} disabled={!canNext} className="btn btn--primary">
              Next →
            </button>
          </div>

          <div className="qg-submit-wrap">
            <button
              onClick={handleSubmitAll}
              disabled={isSubmittingAll || hasSubmitted}
              className="btn btn--primary qg-submit-all"
            >
              {hasSubmitted ? "Submitted ✅" : isSubmittingAll ? "Submitting…" : "Submit All Answers"}
            </button>
          </div>

          {finalFeedback && typeof finalFeedback === "object" && (
            <div className="qg-modal-backdrop">
              <div className="qg-modal">
                <h3>Strengths</h3>
                {finalFeedback.strengths?.length ? (
                  <ul>
                    {finalFeedback.strengths.map((item, idx) => (
                      <li key={`strength-${idx}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No strengths provided.</p>
                )}

                <h3>Improvements</h3>
                {finalFeedback.improvements?.length ? (
                  <ul>
                    {finalFeedback.improvements.map((item, idx) => (
                      <li key={`improvement-${idx}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No improvements provided.</p>
                )}

                <button
                  className="btn btn--primary"
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
        </section>
      )}
    </div>
  );
}
