import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";

const CHART_COLORS = {
  gained: "#49d17d",
  missed: "#ff6b6b",
  line: "#6fd3ff",
  bar: "#f7b955",
  grid: "rgba(255, 255, 255, 0.08)",
  text: "#d7e1ea",
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getLevelKey = (value) => {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.includes("gcse")) {
    return "gcse";
  }

  if (
    normalizedValue.includes("a level") ||
    normalizedValue.includes("alevel") ||
    normalizedValue.includes("as and a level")
  ) {
    return "a-level";
  }

  return "other";
};

const formatLevelHeading = (levelKey) => {
  if (levelKey === "gcse") {
    return "GCSE";
  }

  if (levelKey === "a-level") {
    return "A level";
  }

  return "Other";
};

const OVERVIEW_LEVEL_ORDER = ["gcse", "a-level"];

const truncateChartLabel = (value, maxLength = 24) => {
  const label = String(value || "").trim();

  if (label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, maxLength - 1)}…`;
};

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

const calculatePercentageScore = (score, total) => {
  const numericScore = Number(score) || 0;
  const numericTotal = Number(total) || 0;

  if (numericTotal <= 0) {
    return 0;
  }

  return Math.round((numericScore / numericTotal) * 100);
};

const getSessionScore = (session) =>
  Number(session?.total_score ?? session?.score ?? 0) || 0;

const getSessionMaxScore = (session) =>
  Number(session?.total_available ?? session?.max_score ?? 0) || 0;

const getSessionDateValue = (session) =>
  session?.created_at || session?.date || null;

const calculateMarksSummary = (results) => {
  const totals = results.reduce(
    (summary, result) => {
      const gained = getSessionScore(result);
      const maxScore = getSessionMaxScore(result);

      summary.gained += gained;
      summary.missed += Math.max(maxScore - gained, 0);
      return summary;
    },
    { gained: 0, missed: 0 },
  );

  return [
    { name: "Marks gained", value: totals.gained, fill: CHART_COLORS.gained },
    { name: "Marks missed", value: totals.missed, fill: CHART_COLORS.missed },
  ];
};

const buildLineChartData = (results) =>
  [...results]
    .sort((left, right) => {
      const leftDate = new Date(getSessionDateValue(left)).getTime() || 0;
      const rightDate = new Date(getSessionDateValue(right)).getTime() || 0;
      return leftDate - rightDate;
    })
    .map((result, index) => ({
      id: result.id ?? index,
      label: formatCompactDate(getSessionDateValue(result)),
      percentage: calculatePercentageScore(
        getSessionScore(result),
        getSessionMaxScore(result),
      ),
      fullDate: formatSessionDate(getSessionDateValue(result)),
      topic: result.topicLabel || getSessionTopic(result),
    }));

const groupAverageScoreByTopic = (results) => {
  const grouped = results.reduce((map, result) => {
    const key = result.topicLabel || getSessionTopic(result);
    const current = map.get(key) || {
      topic: key,
      totalPercent: 0,
      attempts: 0,
    };

    current.totalPercent += calculatePercentageScore(
      getSessionScore(result),
      getSessionMaxScore(result),
    );
    current.attempts += 1;

    map.set(key, current);
    return map;
  }, new Map());

  return Array.from(grouped.values())
    .map((entry) => ({
      topic: entry.topic,
      topicShortLabel: truncateChartLabel(entry.topic),
      averageScore: Math.round(entry.totalPercent / entry.attempts),
      attempts: entry.attempts,
    }))
    .sort(
      (left, right) =>
        right.averageScore - left.averageScore ||
        left.topic.localeCompare(right.topic),
    );
};

const renderChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="account-chartTooltip">
      {label ? <p className="account-chartTooltip__label">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.dataKey} className="account-chartTooltip__value">
          <span
            className="account-chartTooltip__swatch"
            style={{ backgroundColor: item.color }}
          />
          {item.name}: {item.value}
          {item.dataKey === "percentage" || item.dataKey === "averageScore"
            ? "%"
            : ""}
        </p>
      ))}
    </div>
  );
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
  const [selectedOverviewLevel, setSelectedOverviewLevel] = useState("gcse");

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
            scorePercent: calculatePercentageScore(
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

  const overviewSections = useMemo(() => {
    const groupedSessions = sessionCards.reduce((groups, session) => {
      const levelKey = getLevelKey(session.levelLabel);

      if (levelKey === "other") {
        return groups;
      }

      if (!groups[levelKey]) {
        groups[levelKey] = [];
      }

      groups[levelKey].push(session);
      return groups;
    }, {});

    return OVERVIEW_LEVEL_ORDER.map((levelKey) => {
      const levelSessions = groupedSessions[levelKey];

      if (!levelSessions?.length) {
        return null;
      }

      return {
        levelKey,
        title: formatLevelHeading(levelKey),
        sessions: levelSessions,
        marksSummaryData: calculateMarksSummary(levelSessions),
        scoreTrendData: buildLineChartData(levelSessions),
        averageTopicData: groupAverageScoreByTopic(levelSessions),
      };
    }).filter(Boolean);
  }, [sessionCards]);

  const selectedOverviewSection = useMemo(
    () =>
      overviewSections.find(
        (section) => section.levelKey === selectedOverviewLevel,
      ) ||
      overviewSections[0] ||
      null,
    [overviewSections, selectedOverviewLevel],
  );

  useEffect(() => {
    if (!overviewSections.length) {
      return;
    }

    const hasSelectedSection = overviewSections.some(
      (section) => section.levelKey === selectedOverviewLevel,
    );

    if (!hasSelectedSection) {
      setSelectedOverviewLevel(overviewSections[0].levelKey);
    }
  }, [overviewSections, selectedOverviewLevel]);

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
        <>
          <section className="account-results__overview">
            <div className="account-results__overviewHeader">
              <div>
                <p className="account-eyebrow">Performance overview</p>
                <h3>Track how your results are trending</h3>
                <p className="account-muted">
                  These charts use the same result history dataset shown in the
                  cards below.
                </p>
              </div>

              {overviewSections.length > 0 && (
                <div className="account-results__overviewControl">
                  <label htmlFor="results-overview-level">Qualification</label>
                  <select
                    id="results-overview-level"
                    className="account-results__input"
                    value={selectedOverviewSection?.levelKey || ""}
                    onChange={(event) =>
                      setSelectedOverviewLevel(event.target.value)
                    }
                  >
                    {overviewSections.map((section) => (
                      <option key={section.levelKey} value={section.levelKey}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedOverviewSection ? (
              <section
                key={selectedOverviewSection.levelKey}
                className="account-results__overviewGroup"
              >
                <div className="account-results__overviewGroupHeader">
                  <h4>{selectedOverviewSection.title} charts</h4>
                  <p className="account-muted">
                    Only {selectedOverviewSection.title.toLowerCase()} sessions
                    are included in these charts.
                  </p>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-lg-4">
                    <article className="card account-card account-chartCard h-100">
                      <div className="account-chartCard__header">
                        <h4>Marks gained vs missed</h4>
                        <p className="account-muted">
                          Total marks across visible{" "}
                          {selectedOverviewSection.title.toLowerCase()}{" "}
                          sessions.
                        </p>
                      </div>
                      <div className="account-chartCard__body account-chartCard__body--donut">
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={selectedOverviewSection.marksSummaryData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={72}
                              outerRadius={102}
                              paddingAngle={4}
                            >
                              {selectedOverviewSection.marksSummaryData.map(
                                (entry) => (
                                  <Cell key={entry.name} fill={entry.fill} />
                                ),
                              )}
                            </Pie>
                            <Tooltip content={renderChartTooltip} />
                            <Legend verticalAlign="bottom" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </article>
                  </div>

                  <div className="col-12 col-lg-8">
                    <article className="card account-card account-chartCard h-100">
                      <div className="account-chartCard__header">
                        <h4>Percentage score over time</h4>
                        <p className="account-muted">
                          See whether your{" "}
                          {selectedOverviewSection.title.toLowerCase()} scores
                          are improving over time.
                        </p>
                      </div>
                      <div className="account-chartCard__body">
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart
                            data={selectedOverviewSection.scoreTrendData}
                          >
                            <CartesianGrid
                              stroke={CHART_COLORS.grid}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                              tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip content={renderChartTooltip} />
                            <Line
                              type="monotone"
                              dataKey="percentage"
                              name="Score"
                              stroke={CHART_COLORS.line}
                              strokeWidth={3}
                              dot={{
                                r: 4,
                                strokeWidth: 0,
                                fill: CHART_COLORS.line,
                              }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </article>
                  </div>

                  <div className="col-12">
                    <article className="card account-card account-chartCard">
                      <div className="account-chartCard__header">
                        <h4>Average score by topic</h4>
                        <p className="account-muted">
                          Compare topic performance within your{" "}
                          {selectedOverviewSection.title.toLowerCase()}{" "}
                          attempts.
                        </p>
                      </div>
                      <div className="account-chartCard__body">
                        <ResponsiveContainer width="100%" height={340}>
                          <BarChart
                            data={selectedOverviewSection.averageTopicData}
                            layout="vertical"
                            margin={{ top: 8, right: 8, bottom: 8, left: 24 }}
                          >
                            <CartesianGrid
                              stroke={CHART_COLORS.grid}
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                              tickFormatter={(value) => `${value}%`}
                            />
                            <YAxis
                              type="category"
                              dataKey="topicShortLabel"
                              width={190}
                              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                            />
                            <Tooltip content={renderChartTooltip} />
                            <Bar
                              dataKey="averageScore"
                              name="Average"
                              fill={CHART_COLORS.bar}
                              radius={[0, 8, 8, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </article>
                  </div>
                </div>
              </section>
            ) : (
              <article className="account-card">
                <p className="account-muted">
                  Performance charts are available when sessions are tagged as
                  GCSE or A level.
                </p>
              </article>
            )}
          </section>

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
        </>
      )}
    </section>
  );
}
