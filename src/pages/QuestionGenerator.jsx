import { useState, useEffect, useRef, useContext, useMemo } from "react";
import "../styles/QuestionGenerator.modern.css";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";

export default function QuestionGenerator() {
  const {
    user,
    hasUnlimitedAccess,
    questionsRemainingToday,
    updateEntitlement,
    authReady,
  } = useContext(UserContext) || {};
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
  const [upgradeState, setUpgradeState] = useState(null);

  const navigate = useNavigate();

  const numericRemaining =
    questionsRemainingToday == null ? null : Number(questionsRemainingToday);
  const effectivePlanType = user?.plan_type || null;
  const isFreePlan = effectivePlanType === "free" && !hasUnlimitedAccess;
  const generationBlocked = !hasUnlimitedAccess && numericRemaining === 0;
  const questionCountOptions = useMemo(
    () => (isFreePlan ? [1] : [1, 2, 3, 4, 6, 8, 10]),
    [isFreePlan],
  );

  const applyEntitlementUpdate = (payload) => {
    if (!payload || !updateEntitlement) {
      return;
    }

    const nextEntitlement = {};

    if (payload.plan_type !== undefined) {
      nextEntitlement.plan_type = payload.plan_type;
    }

    if (payload.questions_remaining_today !== undefined) {
      nextEntitlement.questions_remaining_today =
        payload.questions_remaining_today;
    }

    if (Object.keys(nextEntitlement).length > 0) {
      updateEntitlement(nextEntitlement);
    }
  };

  useEffect(() => {
    if (isFreePlan && numberOfQuestions !== "1") {
      setNumberOfQuestions("1");
    }
  }, [isFreePlan, numberOfQuestions]);

  // --- Fetch topics when examBoard changes (and pass ?exam_board=...)
  useEffect(() => {
    const fetchTopics = async () => {
      if (!authReady) {
        return;
      }

      try {
        const { data } = await api.get("/api/biology-topics/", {
          params: { exam_board: examBoard },
        });
        setTopics(data || []);
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
  }, [authReady, examBoard]);

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
        const { data } = await api.get("/api/biology-subtopics/", {
          params: {
            topic_id: selectedTopic,
            exam_board: examBoard,
          },
        });
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
  }, [examBoard, selectedTopic]);

  useEffect(() => {
    const run = async () => {
      if (!selectedSubtopic) {
        setSubcategories([]);
        setSelectedSubcategory("");
        return;
      }
      try {
        const { data } = await api.get("/api/biology-subcategories/", {
          params: {
            subtopic_id: selectedSubtopic,
            exam_board: examBoard,
          },
        });
        setSubcategories(data || []);
        setSelectedSubcategory("");
      } catch (e) {
        console.error("Failed to fetch subcategories:", e);
        setSubcategories([]);
        setSelectedSubcategory("");
      }
    };
    run();
  }, [examBoard, selectedSubtopic]);

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

    if (generationBlocked) {
      setUpgradeState({
        error: "You have already used your free question for today.",
        plan_type: effectivePlanType,
        questions_remaining_today: numericRemaining,
      });
      return;
    }

    setLoading(true);
    setError("");
    setUpgradeState(null);
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
      const payload = {
        topic_id: Number(selectedTopic),
        subtopic_id: selectedSubtopic ? Number(selectedSubtopic) : null,
        subcategory_id: selectedSubcategory
          ? Number(selectedSubcategory)
          : null,
        exam_board: examBoard,
        number_of_questions: parseInt(numberOfQuestions, 10),
      };

      const { data } = await api.post("/api/generate-questions/", payload);

      setQuestions(data.questions);
      setSessionId(data.session_id);
      applyEntitlementUpdate(data);
    } catch (err) {
      console.error(err);

      if (err.response?.status === 403) {
        const payload = err.response.data || {};
        applyEntitlementUpdate(payload);
        setUpgradeState({
          error:
            payload.error || "Your free daily question limit has been reached.",
          plan_type: payload.plan_type || effectivePlanType,
          questions_remaining_today:
            payload.questions_remaining_today ?? numericRemaining,
        });
      } else {
        setError(
          err.response?.data?.error ||
            "Something went wrong. Please try again.",
        );
      }
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
      const { data } = await api.post("/api/mark-answer/", {
        question,
        mark_scheme,
        user_answer: answer,
        exam_board: examBoard,
      });
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
      "Are you sure you want to submit all answers?",
    );
    if (!confirmed) return;

    setIsSubmittingAll(true);

    const answers = questions.map((q, index) => ({
      question: q.question,
      user_answer: userAnswers[index] || "",
      mark_scheme: q.mark_scheme,
      score: feedback[index]?.score || 0,
    }));

    try {
      const { data } = await api.post("/api/submit-question-session/", {
        session_id: sessionId,
        answers,
        feedback: finalFeedback,
      });
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
  const jumpTo = (i) =>
    setCurrentIndex((curr) => (i <= maxSeenIndex ? i : curr));

  return (
    <div className="qg-root container">
      <header className="qg-header">
        <h1>Generate Questions</h1>
        <p className="muted">
          Choose your scope, generate questions, answer one-by-one, and get
          instant marking.
        </p>
        {user && (
          <div className="qg-access-summary" aria-live="polite">
            <span className="qg-access-pill">
              {hasUnlimitedAccess
                ? "Lifetime access"
                : `${effectivePlanType || "free"} plan`}
            </span>
            <span className="qg-access-copy">
              {hasUnlimitedAccess || numericRemaining == null
                ? "Unlimited question generation available."
                : `${numericRemaining} question${numericRemaining === 1 ? "" : "s"} remaining today.`}
            </span>
          </div>
        )}
      </header>

      {upgradeState && (
        <section className="qg-upgrade" aria-live="assertive">
          <h2>Daily limit reached</h2>
          <p>{upgradeState.error}</p>
          <p>
            Free access currently includes 1 generated question per day.
            Unlimited access will be handled through the lifetime plan.
          </p>
          <div className="qg-upgrade-actions">
            <Link to="/my-results" className="btn btn--ghost">
              View saved results
            </Link>
            <Link to="/" className="btn btn--primary">
              Back to home
            </Link>
          </div>
        </section>
      )}

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
                {questionCountOptions.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
              {isFreePlan && (
                <p className="qg-hint">
                  Free accounts are currently limited to 1 generated question
                  per day.
                </p>
              )}
            </div>
          </div>

          <button
            className="btn btn--primary qg-generate"
            type="submit"
            disabled={
              loading ||
              topics.length === 0 ||
              !selectedTopic ||
              generationBlocked
            }
          >
            {loading ? "Generating…" : "Generate Questions"}
          </button>

          {loading && (
            <div className="qg-progress" aria-live="polite">
              <div
                className="qg-progress-bar"
                style={{ width: `${progress}%` }}
              />
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
              {Math.round(((currentIndex + 1) / questions.length) * 100)}%
              viewed
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

                <button
                  type="button"
                  onClick={toggle}
                  className="btn btn--subtle"
                >
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
                    onChange={(e) =>
                      handleAnswerChange(currentIndex, e.target.value)
                    }
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
                          <strong>Score:</strong> {feedback[currentIndex].score}{" "}
                          / {feedback[currentIndex].out_of}
                        </p>
                        <p>
                          <strong>Feedback:</strong>{" "}
                          {feedback[currentIndex].feedback}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })()}

          <div className="qg-nav">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className="btn"
            >
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

            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="btn btn--primary"
            >
              Next →
            </button>
          </div>

          <div className="qg-submit-wrap">
            <button
              onClick={handleSubmitAll}
              disabled={isSubmittingAll || hasSubmitted}
              className="btn btn--primary qg-submit-all"
            >
              {hasSubmitted
                ? "Submitted ✅"
                : isSubmittingAll
                  ? "Submitting…"
                  : "Submit All Answers"}
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
