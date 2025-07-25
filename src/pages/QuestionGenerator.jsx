import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/QuestionGenerator.css";
import { useNavigate } from "react-router-dom";

export default function QuestionGenerator() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [examBoard, setExamBoard] = useState("AQA");
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
  const navigate = useNavigate();

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

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post(
        "https://exambuilder-efae14d59f03.herokuapp.com/api/generate-questions/",
        {
          topic_id: selectedTopic,
          exam_board: examBoard,
          number_of_questions: parseInt(numberOfQuestions),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      setQuestions(response.data.questions);
      setSessionId(response.data.session_id); // assuming backend returns session_id
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
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

    setMarking((prev) => ({ ...prev, [index]: true }));

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post(
        "https://exambuilder-efae14d59f03.herokuapp.com/api/mark-answer/",
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

      setFeedback((prev) => ({ ...prev, [index]: response.data }));
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
      const response = await axios.post(
        "https://exambuilder-efae14d59f03.herokuapp.com/api/submit-question-session/",
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

      setFinalFeedback(response.data.feedback);
      setHasSubmitted(true); // ✅ mark as submitted
    } catch (err) {
      console.error(err);
      alert("Failed to submit session.");
      setIsSubmittingAll(false); // allow retry
    }
  };

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get(
          "https://exambuilder-efae14d59f03.herokuapp.com/api/biology-topics/",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        setTopics(response.data);
        // Optional: auto-select the first topic if none selected
        if (response.data.length > 0 && !selectedTopic) {
          setSelectedTopic(response.data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch topics:", err);
      }
    };

    fetchTopics();
  }, []);

  return (
    <div className="question-generator-page">
      <h2>Generated Exam Questions</h2>
      {!questions && (
        <form onSubmit={handleSubmit}>
          <div>
            <label>Topic:</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              style={{ width: "100%", marginBottom: "1rem" }}
              required
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.topic}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Exam Board:</label>
            <select
              value={examBoard}
              onChange={(e) => setExamBoard(e.target.value)}
              style={{ width: "100%", marginBottom: "1rem" }}
            >
              <option value="AQA">AQA</option>
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
              <option value="1">1</option>
              <option value="3">3</option>
              <option value="5">5</option>
            </select>
          </div>
          <button
            className="qg-button qg-button-primary "
            type="submit"
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Questions"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      )}

      {questions && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Generated Questions</h3>
          {questions.map((q, index) => {
            const isOpen = openIndexes[index] || false;
            const toggle = () => {
              setOpenIndexes((prev) => ({
                ...prev,
                [index]: !prev[index],
              }));
            };

            return (
              <div
                key={index}
                style={{
                  marginBottom: "2rem",
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "1rem",
                }}
              >
                <p>
                  <strong>Q{index + 1}:</strong> {q.question}
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
                    value={userAnswers[index] || ""}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                  />
                  <button
                    onClick={() => handleMarkAnswer(index)}
                    disabled={marking[index]}
                    style={{
                      padding: "0.4rem 0.6rem",
                      backgroundColor: "#007bff",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {marking[index] ? "Marking..." : "Check Answer"}
                  </button>
                </div>

                {feedback[index] && (
                  <div style={{ marginTop: "0.75rem" }}>
                    {feedback[index].error ? (
                      <p style={{ color: "red" }}>{feedback[index].error}</p>
                    ) : (
                      <>
                        <p>
                          <strong>Score:</strong> {feedback[index].score} /{" "}
                          {feedback[index].out_of}
                        </p>
                        <p>
                          <strong>Feedback:</strong> {feedback[index].feedback}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button
              onClick={handleSubmitAll}
              disabled={isSubmittingAll || hasSubmitted} // ✅ disable after submit
              style={{
                padding: "0.6rem 1rem",
                backgroundColor: hasSubmitted
                  ? "#6c757d" // grey when submitted
                  : isSubmittingAll
                  ? "#6c757d" // grey when submitting
                  : "#28a745",
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
                {finalFeedback.strengths &&
                finalFeedback.strengths.length > 0 ? (
                  <ul>
                    {finalFeedback.strengths.map((item, idx) => (
                      <li key={`strength-${idx}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No strengths provided.</p>
                )}

                <h4>Improvements</h4>
                {finalFeedback.improvements &&
                finalFeedback.improvements.length > 0 ? (
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
