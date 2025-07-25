import { useEffect, useState } from "react";
import axios from "axios";

export default function ViewResults() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get(
          "https://exambuilder-efae14d59f03.herokuapp.com/api/user-sessions/",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        setSessions(response.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load sessions.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "2rem" }}>
      <h2>Your Answered Question Sessions</h2>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && sessions.length === 0 && (
        <p>No question sessions found. Generate some on the exam page.</p>
      )}

      {sessions.map((session) => {
        // Parse feedback if needed
        let parsedFeedback = session.feedback;
        if (typeof parsedFeedback === "string") {
          try {
            parsedFeedback = JSON.parse(parsedFeedback);
          } catch (err) {
            // If not JSON, keep as raw string
            parsedFeedback = { raw: session.feedback };
          }
        }

        return (
          <div
            key={session.id}
            style={{
              border: "1px solid #ccc",
              marginBottom: "1.5rem",
              padding: "1rem",
              borderRadius: "8px",
            }}
          >
            <h3>{session.topic}</h3>
            <p>
              <strong>Exam Board:</strong> {session.exam_board} <br />
              <strong>Questions:</strong> {session.number_of_questions} <br />
              <strong>Score:</strong> {session.total_score} /{" "}
              {session.total_available} <br />
              <strong>Date:</strong>{" "}
              {new Date(session.created_at).toLocaleDateString()}
            </p>

            {/* Render feedback */}
            {parsedFeedback && parsedFeedback.raw && (
              <>
                <h4>Question Feedback</h4>
                <p>{parsedFeedback.raw}</p>
              </>
            )}

            {parsedFeedback && parsedFeedback.strengths && (
              <>
                <h4>Question Feedback</h4>

                {parsedFeedback.strengths.length > 0 && (
                  <>
                    <h5>Strengths</h5>
                    <ul style={{ textAlign: "left", paddingLeft: "1.2rem" }}>
                      {parsedFeedback.strengths.map((s, i) => (
                        <li key={`s-${i}`}>{s}</li>
                      ))}
                    </ul>
                  </>
                )}

                {parsedFeedback.improvements &&
                  parsedFeedback.improvements.length > 0 && (
                    <>
                      <h5>Improvements</h5>
                      <ul style={{ textAlign: "left", paddingLeft: "1.2rem" }}>
                        {parsedFeedback.improvements.map((imp, i) => (
                          <li key={`i-${i}`}>{imp}</li>
                        ))}
                      </ul>
                    </>
                  )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
