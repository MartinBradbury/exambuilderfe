import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getSessionLevel = (session) =>
  session?.level || session?.qualification_label || "Not recorded";

const getSessionTopic = (session) =>
  session?.topic_name || session?.topic || "Untitled topic";

const getSessionSubtopic = (session) =>
  session?.subtopic_name ||
  session?.subtopic ||
  session?.subtopic_title ||
  "Not recorded";

const getSessionSubcategory = (session) =>
  session?.subcategory_name ||
  session?.subcategory ||
  session?.subcategory_title ||
  "";

const parseFeedback = (feedback) => {
  if (!feedback) {
    return null;
  }

  if (typeof feedback === "string") {
    try {
      return JSON.parse(feedback);
    } catch {
      return { raw: feedback };
    }
  }

  return feedback;
};

const formatSessionDate = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCompactDate = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getScorePercent = (score, total) => {
  const numericScore = Number(score) || 0;
  const numericTotal = Number(total) || 0;

  if (numericTotal <= 0) {
    return 0;
  }

  return Math.round((numericScore / numericTotal) * 100);
};

const getInsightText = (session) => {
  const rawFeedback = session.feedback?.raw;

  if (rawFeedback) {
    const [firstSentence] = String(rawFeedback)
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);

    if (firstSentence) {
      return firstSentence;
    }
  }

  if (session.scorePercent >= 85) {
    return "You have strong knowledge but need to sharpen precision to convert more marks consistently.";
  }

  if (session.scorePercent >= 70) {
    return "You understand the core ideas well, but there is room to tighten exam technique and completeness.";
  }

  if (session.scorePercent >= 55) {
    return "Your understanding is developing, but key mark scheme points are still being missed too often.";
  }

  return "This topic needs another pass, with more focus on exact terminology and full mark scheme coverage.";
};

const formatAssessmentTitle = (topic) => {
  const baseTitle = String(topic || "Untitled topic").trim();
  return /assessment$/i.test(baseTitle)
    ? `🧠 ${baseTitle}`
    : `🧠 ${baseTitle} Assessment`;
};

export default function ResultsHistory({ className = "", showHeader = true }) {
  const [sessions, setSessions] = useState([]);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("newest");
  const [examBoardFilter, setExamBoardFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isActive = true;

    const fetchSessions = async () => {
      try {
        const response = await api.get("/api/user-sessions/");
        if (!isActive) {
          return;
        }

        const nextSessions = Array.isArray(response.data) ? response.data : [];
        setSessions(nextSessions);
      } catch (err) {
        console.error(err);
        if (isActive) {
          setError("Failed to load your saved sessions.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchSessions();

    return () => {
      isActive = false;
    };
  }, []);

  const examBoardOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sessions
            .map((session) => session.exam_board)
            .filter((value) => typeof value === "string" && value.trim()),
        ),
      ).sort(),
    [sessions],
  );

  const sessionCards = useMemo(
    () =>
      sessions
        .filter((session) => {
          if (
            examBoardFilter !== "all" &&
            normalizeText(session.exam_board) !== normalizeText(examBoardFilter)
          ) {
            return false;
          }

          if (!searchTerm.trim()) {
            return true;
          }

          const searchValue = normalizeText(searchTerm);
          return [
            getSessionTopic(session),
            session.exam_board,
            getSessionLevel(session),
            getSessionSubtopic(session),
            getSessionSubcategory(session),
          ].some((value) => normalizeText(value).includes(searchValue));
        })
        .sort((left, right) => {
          const leftDate = new Date(left.created_at).getTime() || 0;
          const rightDate = new Date(right.created_at).getTime() || 0;
          const leftScoreRatio =
            Number(left.total_available) > 0
              ? Number(left.total_score) / Number(left.total_available)
              : Number(left.total_score) || 0;
          const rightScoreRatio =
            Number(right.total_available) > 0
              ? Number(right.total_score) / Number(right.total_available)
              : Number(right.total_score) || 0;

          if (sortOrder === "oldest") {
            return leftDate - rightDate;
          }

          if (sortOrder === "highest-score") {
            return rightScoreRatio - leftScoreRatio || rightDate - leftDate;
          }

          if (sortOrder === "lowest-score") {
            return leftScoreRatio - rightScoreRatio || rightDate - leftDate;
          }

          return rightDate - leftDate;
        })
        .map((session) => {
          const feedback = parseFeedback(session.feedback);
          const isOpen = expandedSessionId === session.id;

          return {
            ...session,
            feedback,
            isOpen,
            formattedDate: formatSessionDate(session.created_at),
            compactDate: formatCompactDate(session.created_at),
            scorePercent: getScorePercent(
              session.total_score,
              session.total_available,
            ),
            topicLabel: getSessionTopic(session),
            levelLabel: getSessionLevel(session),
            subtopicLabel: getSessionSubtopic(session),
            subcategoryLabel: getSessionSubcategory(session),
          };
        }),
    [examBoardFilter, expandedSessionId, searchTerm, sessions, sortOrder],
  );

  useEffect(() => {
    if (sessionCards.length === 0) {
      if (expandedSessionId !== null) {
        setExpandedSessionId(null);
      }
      return;
    }

    if (expandedSessionId === null) {
      return;
    }

    const currentStillVisible = sessionCards.some(
      (session) => session.id === expandedSessionId,
    );

    if (!currentStillVisible) {
      setExpandedSessionId(null);
    }
  }, [expandedSessionId, sessionCards]);

  return (
    <section id="results" className={`account-results ${className}`.trim()}>
      {showHeader && (
        <div className="account-results__header">
          <div>
            <p className="account-eyebrow">Results history</p>
            <h2>Past test sessions</h2>
            <p className="account-muted">
              Review earlier attempts, revisit feedback, and track how your past
              question sessions were scored.
            </p>
          </div>
          <Link to="/question-generator" className="btn btn--subtle">
            Start another test
          </Link>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="account-results__toolbar account-card">
          <div className="account-results__control">
            <label htmlFor="results-search">Search</label>
            <input
              id="results-search"
              type="search"
              className="account-results__input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Topic, board, or subtopic"
            />
          </div>

          <div className="account-results__control">
            <label htmlFor="results-board">Exam board</label>
            <select
              id="results-board"
              className="account-results__input"
              value={examBoardFilter}
              onChange={(event) => setExamBoardFilter(event.target.value)}
            >
              <option value="all">All boards</option>
              {examBoardOptions.map((board) => (
                <option key={board} value={board}>
                  {board}
                </option>
              ))}
            </select>
          </div>

          <div className="account-results__control">
            <label htmlFor="results-sort">Sort by</label>
            <select
              id="results-sort"
              className="account-results__input"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest-score">Highest score</option>
              <option value="lowest-score">Lowest score</option>
            </select>
          </div>
        </div>
      )}

      {loading && (
        <article className="account-card">
          <p className="account-muted">Loading your saved sessions…</p>
        </article>
      )}

      {!loading && error && (
        <article className="account-banner account-banner--error">
          {error}
        </article>
      )}

      {!loading && !error && sessionCards.length === 0 && (
        <article className="account-card account-card--centered">
          <h3>No saved sessions yet</h3>
          <p className="account-muted">
            Once you complete question sessions, they will appear here with
            scores and feedback.
          </p>
          <div className="account-actions">
            <Link to="/question-generator" className="btn btn--primary">
              Generate questions
            </Link>
          </div>
        </article>
      )}

      {!loading && !error && sessionCards.length > 0 && (
        <div className="account-results__list">
          {sessionCards.map((session) => (
            <article
              key={session.id}
              className="account-card account-resultCard"
            >
              <div className="account-resultCard__top">
                <div className="account-resultCard__titleWrap">
                  <p className="account-resultCard__levelBadge">
                    {session.levelLabel}
                  </p>
                  <h3>{formatAssessmentTitle(session.topicLabel)}</h3>
                  <p className="account-resultCard__subtopic">
                    Examination topic area: {session.subtopicLabel}
                  </p>
                  {session.subcategoryLabel && (
                    <p className="account-resultCard__meta">
                      Focus area: {session.subcategoryLabel}
                    </p>
                  )}
                </div>
                <div className="account-resultCard__score">
                  <span>{session.scorePercent}%</span>
                  <strong>
                    {session.total_score} / {session.total_available}
                  </strong>
                </div>
              </div>

              <p className="account-resultCard__metaLine">
                <span>{session.exam_board || "Not recorded"}</span>
                <span>{session.number_of_questions ?? "-"} Questions</span>
                <span>{session.compactDate}</span>
              </p>

              <div className="account-resultCard__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() =>
                    setExpandedSessionId((currentId) =>
                      currentId === session.id ? null : session.id,
                    )
                  }
                >
                  {session.isOpen ? "Hide Feedback" : "View Feedback"}
                </button>
              </div>

              {session.isOpen && (
                <div className="account-resultCard__body">
                  <div
                    className="account-resultCard__divider"
                    aria-hidden="true"
                  />

                  <div className="account-resultCard__feedbackBlock account-resultCard__feedbackBlock--insight">
                    <h4>🧠 Insight</h4>
                    <p>{getInsightText(session)}</p>
                  </div>

                  {session.feedback?.strengths?.length > 0 && (
                    <div className="account-resultCard__feedbackBlock">
                      <h4>💪 What You Did Well</h4>
                      <ul>
                        {session.feedback.strengths.map((item, index) => (
                          <li key={`${session.id}-strength-${index}`}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {session.feedback?.improvements?.length > 0 && (
                    <div className="account-resultCard__feedbackBlock">
                      <h4>🎯 Next Steps</h4>
                      <ul>
                        {session.feedback.improvements.map((item, index) => (
                          <li key={`${session.id}-improvement-${index}`}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!session.feedback?.strengths?.length &&
                    !session.feedback?.improvements?.length &&
                    session.feedback?.raw && (
                      <div className="account-resultCard__feedbackBlock">
                        <h4>📝 Feedback</h4>
                        <p>{session.feedback.raw}</p>
                      </div>
                    )}

                  <div className="account-resultCard__footerAction">
                    <Link
                      to="/question-generator"
                      className="btn btn--primary"
                      state={{
                        resumeSession: {
                          sessionId: session.id,
                          topicName: session.topicLabel,
                          subtopicName: session.subtopicLabel,
                          examBoard: session.exam_board,
                          numberOfQuestions:
                            session.number_of_questions != null
                              ? String(session.number_of_questions)
                              : undefined,
                          qualification: session.qualification,
                          subject: session.subject,
                          tier: session.tier,
                        },
                      }}
                    >
                      Practice This Topic Again
                    </Link>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
