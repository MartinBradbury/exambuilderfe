import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import {
  calculatePercentageScore,
  getSessionDateValue,
  getSessionLevel,
  getSessionMaxScore,
  getSessionScore,
  getSessionTopic,
  isSessionOnOrAfterDate,
} from "../lib/performance";

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

const getQualificationForLevelKey = (levelKey) => {
  if (levelKey === "gcse") {
    return "GCSE_SCIENCE";
  }

  if (levelKey === "a-level") {
    return "ALEVEL_BIOLOGY";
  }

  return null;
};

const OVERVIEW_LEVEL_ORDER = ["gcse", "a-level"];
const OVERVIEW_EXAM_BOARD_ORDER = ["ocr", "aqa"];
const OVERVIEW_ALL_TOPICS_VALUE = "__overall__";
const RESULTS_PAGE_SIZE = 5;

const getExamBoardKey = (value) => {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.includes("ocr")) {
    return "ocr";
  }

  if (normalizedValue.includes("aqa")) {
    return "aqa";
  }

  return "other";
};

const formatExamBoardHeading = (examBoardKey) => {
  if (examBoardKey === "ocr") {
    return "OCR";
  }

  if (examBoardKey === "aqa") {
    return "AQA";
  }

  return "Other";
};

const naturalCompareLabels = (left, right) =>
  String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

const getCatalogTopicLabel = (item) =>
  String(item?.topic || item?.title || item?.name || "").trim();

const getCatalogSubtopicLabel = (item) =>
  String(item?.title || item?.subtopic || item?.name || "").trim();

const getOverviewCatalogContexts = (levelKey, sessions) => {
  if (levelKey !== "gcse") {
    return [{}];
  }

  return Array.from(
    sessions
      .reduce((map, session) => {
        const subject = String(session.subject || "").trim();
        const tier = String(session.tier || "").trim();

        if (!subject || !tier) {
          return map;
        }

        const key = `${normalizeText(subject)}:${normalizeText(tier)}`;

        if (!map.has(key)) {
          map.set(key, { subject, tier });
        }

        return map;
      }, new Map())
      .values(),
  );
};

const truncateChartLabel = (value, maxLength = 24) => {
  const label = String(value || "").trim();

  if (label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, maxLength - 1)}…`;
};

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

const getSessionBreakdownLabel = (session) => {
  const subtopic = getSessionSubtopic(session);
  const subcategory = getSessionSubcategory(session);

  if (!subcategory) {
    return subtopic;
  }

  return `${subtopic}: ${subcategory}`;
};

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

const shouldIncludeInTrendData = (session) => {
  const maxScore = getSessionMaxScore(session);
  const score = getSessionScore(session);

  return maxScore > 0 && score > 0;
};

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

const buildLineChartData = (results) => {
  const sortedResults = [...results].sort((left, right) => {
    const leftDate = new Date(getSessionDateValue(left)).getTime() || 0;
    const rightDate = new Date(getSessionDateValue(right)).getTime() || 0;
    return leftDate - rightDate;
  });

  const includedResults = [];

  return sortedResults.reduce((points, result, index) => {
    if (!shouldIncludeInTrendData(result)) {
      return points;
    }

    includedResults.push(result);

    const rawPercentage = calculatePercentageScore(
      getSessionScore(result),
      getSessionMaxScore(result),
    );
    const movingAverage = Math.round(
      includedResults.reduce(
        (total, session) =>
          total +
          calculatePercentageScore(
            getSessionScore(session),
            getSessionMaxScore(session),
          ),
        0,
      ) / includedResults.length,
    );

    points.push({
      id: result.id ?? index,
      label: formatCompactDate(getSessionDateValue(result)),
      chartPointKey: String(result.id ?? getSessionDateValue(result) ?? index),
      movingAverage,
      rawPercentage,
      fullDate: formatSessionDate(getSessionDateValue(result)),
      topic: result.topicLabel || getSessionTopic(result),
      sampleSize: includedResults.length,
      completedTestsCount: index + 1,
      excludedTestsCount: index + 1 - includedResults.length,
    });

    return points;
  }, []);
};

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
    .sort((left, right) => naturalCompareLabels(left.topic, right.topic));
};

const groupAverageScoreBySubtopic = (results, topic, catalogEntries = []) => {
  if (!topic) {
    return [];
  }

  const grouped = results.reduce((map, result) => {
    const topicKey = result.topicLabel || getSessionTopic(result);

    if (topicKey !== topic) {
      return map;
    }

    const subtopicKey = getSessionBreakdownLabel(result);
    const current = map.get(subtopicKey) || {
      subtopic: subtopicKey,
      totalPercent: 0,
      attempts: 0,
    };

    current.totalPercent += calculatePercentageScore(
      getSessionScore(result),
      getSessionMaxScore(result),
    );
    current.attempts += 1;

    map.set(subtopicKey, current);
    return map;
  }, new Map());

  const fallbackEntries = Array.from(grouped.values()).map((entry) => ({
    subtopic: entry.subtopic,
    subtopicShortLabel: truncateChartLabel(entry.subtopic, 30),
    averageScore: Math.round(entry.totalPercent / entry.attempts),
    attempts: entry.attempts,
  }));

  if (!catalogEntries.length) {
    return fallbackEntries.sort((left, right) =>
      naturalCompareLabels(left.subtopic, right.subtopic),
    );
  }

  const catalogMappedEntries = catalogEntries.map((entry) => {
    const existing = grouped.get(entry.label);

    return {
      subtopic: entry.label,
      subtopicShortLabel: truncateChartLabel(entry.label, 30),
      averageScore: existing
        ? Math.round(existing.totalPercent / existing.attempts)
        : 0,
      attempts: existing?.attempts || 0,
    };
  });

  const catalogKeys = new Set(
    catalogEntries.map((entry) => normalizeText(entry.label)),
  );

  const extraGroupedEntries = fallbackEntries.filter(
    (entry) => !catalogKeys.has(normalizeText(entry.subtopic)),
  );

  return [...catalogMappedEntries, ...extraGroupedEntries].sort((left, right) =>
    naturalCompareLabels(left.subtopic, right.subtopic),
  );
};

const renderChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const trendPayload = payload[0]?.payload;

  if (
    trendPayload &&
    typeof trendPayload.movingAverage === "number" &&
    typeof trendPayload.sampleSize === "number"
  ) {
    return (
      <div className="account-chartTooltip">
        <p className="account-chartTooltip__label">
          {trendPayload.fullDate || label}
        </p>
        <p className="account-chartTooltip__value">
          Current moving average: {trendPayload.movingAverage}%
        </p>
        <p className="account-chartTooltip__value">
          Completed tests so far: {trendPayload.completedTestsCount} test
          {trendPayload.completedTestsCount === 1 ? "" : "s"}
        </p>
        <p className="account-chartTooltip__value">
          Included in average: {trendPayload.sampleSize} test
          {trendPayload.sampleSize === 1 ? "" : "s"}
        </p>
        {trendPayload.excludedTestsCount > 0 && (
          <p className="account-chartTooltip__value">
            Excluded zero-score tests: {trendPayload.excludedTestsCount}
          </p>
        )}
      </div>
    );
  }

  const chartLabel = payload[0]?.payload?.chartLabel || label;

  return (
    <div className="account-chartTooltip">
      {chartLabel ? (
        <p className="account-chartTooltip__label">{chartLabel}</p>
      ) : null}
      {payload.map((item) => (
        <p key={item.dataKey} className="account-chartTooltip__value">
          <span
            className="account-chartTooltip__swatch"
            style={{ backgroundColor: item.color }}
          />
          {item.name}: {item.value}
          {item.dataKey === "movingAverage" ||
          item.dataKey === "rawPercentage" ||
          item.dataKey === "averageScore"
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
  return /assessment$/i.test(baseTitle) ? baseTitle : `${baseTitle} Assessment`;
};

export default function ResultsHistory({
  className = "",
  showHeader = true,
  analyticsLocked = false,
  upgradePath = "/account",
  afterOverviewAction = null,
}) {
  const { user, refreshCurrentUser, hasAccessToQualification } =
    useContext(UserContext) || {};
  const [sessions, setSessions] = useState([]);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [performanceResetError, setPerformanceResetError] = useState("");
  const [isResettingPerformance, setIsResettingPerformance] = useState(false);
  const [hasAutoSelectedOverviewLevel, setHasAutoSelectedOverviewLevel] =
    useState(false);
  const [visibleSessionCardsCount, setVisibleSessionCardsCount] =
    useState(RESULTS_PAGE_SIZE);
  const [sortOrder, setSortOrder] = useState("newest");
  const [examBoardFilter, setExamBoardFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOverviewLevel, setSelectedOverviewLevel] = useState("gcse");
  const [selectedOverviewExamBoard, setSelectedOverviewExamBoard] =
    useState("ocr");
  const [selectedOverviewMarksTopic, setSelectedOverviewMarksTopic] = useState(
    OVERVIEW_ALL_TOPICS_VALUE,
  );
  const [overviewTopicCatalog, setOverviewTopicCatalog] = useState([]);
  const [overviewSubtopicCatalog, setOverviewSubtopicCatalog] = useState([]);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(max-width: 720px)").matches;
  });
  const navigate = useNavigate();
  const performanceTrackingStartDate =
    user?.performance_tracking_start_date || null;

  const handleLockedAnalyticsInteraction = () => {
    if (!analyticsLocked) {
      return;
    }

    navigate(upgradePath);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const updateViewport = (event) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateViewport);

      return () => {
        mediaQuery.removeEventListener("change", updateViewport);
      };
    }

    mediaQuery.addListener(updateViewport);

    return () => {
      mediaQuery.removeListener(updateViewport);
    };
  }, []);

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
      };
    }).filter(Boolean);
  }, [sessionCards]);

  const latestSessionLevelKey = useMemo(() => {
    const latestSession = sessions.reduce((latest, session) => {
      const sessionLevelKey = getLevelKey(getSessionLevel(session));

      if (sessionLevelKey === "other") {
        return latest;
      }

      const latestTime = latest
        ? new Date(getSessionDateValue(latest)).getTime() || 0
        : -Infinity;
      const sessionTime = new Date(getSessionDateValue(session)).getTime() || 0;

      return sessionTime > latestTime ? session : latest;
    }, null);

    return latestSession ? getLevelKey(getSessionLevel(latestSession)) : null;
  }, [sessions]);

  const selectedOverviewSection = useMemo(
    () =>
      overviewSections.find(
        (section) => section.levelKey === selectedOverviewLevel,
      ) ||
      overviewSections[0] ||
      null,
    [overviewSections, selectedOverviewLevel],
  );

  const accessibleOverviewLevelKeys = useMemo(
    () =>
      overviewSections
        .filter((section) => {
          const qualification = getQualificationForLevelKey(section.levelKey);

          if (!qualification) {
            return true;
          }

          return hasAccessToQualification?.(qualification) ?? false;
        })
        .map((section) => section.levelKey),
    [hasAccessToQualification, overviewSections],
  );

  const selectedOverviewAnalyticsLocked = useMemo(() => {
    if (analyticsLocked) {
      return true;
    }

    const qualification = getQualificationForLevelKey(
      selectedOverviewSection?.levelKey,
    );

    if (!qualification) {
      return false;
    }

    return !(hasAccessToQualification?.(qualification) ?? false);
  }, [analyticsLocked, hasAccessToQualification, selectedOverviewSection]);

  const selectedOverviewLockedLabel =
    selectedOverviewSection?.title || "this qualification";

  useEffect(() => {
    if (hasAutoSelectedOverviewLevel || !overviewSections.length) {
      return;
    }

    const preferredLevelKey = accessibleOverviewLevelKeys.includes(
      latestSessionLevelKey,
    )
      ? latestSessionLevelKey
      : accessibleOverviewLevelKeys[0] ||
        (overviewSections.some(
          (section) => section.levelKey === latestSessionLevelKey,
        )
          ? latestSessionLevelKey
          : overviewSections[0].levelKey);

    if (preferredLevelKey) {
      setSelectedOverviewLevel(preferredLevelKey);
    }

    setHasAutoSelectedOverviewLevel(true);
  }, [
    accessibleOverviewLevelKeys,
    hasAutoSelectedOverviewLevel,
    latestSessionLevelKey,
    overviewSections,
  ]);

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

  const selectedOverviewSessions = useMemo(
    () =>
      (selectedOverviewSection?.sessions || []).filter(
        (session) =>
          getExamBoardKey(session.exam_board) === selectedOverviewExamBoard,
      ),
    [selectedOverviewExamBoard, selectedOverviewSection],
  );

  const visibleSessionCards = useMemo(
    () => sessionCards.slice(0, visibleSessionCardsCount),
    [sessionCards, visibleSessionCardsCount],
  );

  const hasMoreSessionCards = visibleSessionCards.length < sessionCards.length;

  useEffect(() => {
    setVisibleSessionCardsCount(RESULTS_PAGE_SIZE);
  }, [examBoardFilter, searchTerm, sortOrder, sessionCards.length]);

  const selectedOverviewMarksSessions = useMemo(() => {
    if (selectedOverviewMarksTopic === OVERVIEW_ALL_TOPICS_VALUE) {
      return selectedOverviewSessions;
    }

    return selectedOverviewSessions.filter(
      (session) =>
        normalizeText(session.topicLabel || getSessionTopic(session)) ===
        normalizeText(selectedOverviewMarksTopic),
    );
  }, [selectedOverviewMarksTopic, selectedOverviewSessions]);

  const selectedOverviewAnalyticsSessions = useMemo(
    () =>
      selectedOverviewMarksSessions.filter((session) =>
        isSessionOnOrAfterDate(session, performanceTrackingStartDate),
      ),
    [performanceTrackingStartDate, selectedOverviewMarksSessions],
  );

  const selectedOverviewTrackedTestsCount =
    selectedOverviewAnalyticsSessions.length;
  const selectedOverviewTrackedTestsLabel = `${selectedOverviewTrackedTestsCount} test${selectedOverviewTrackedTestsCount === 1 ? "" : "s"}`;
  const shouldShowResetWarning =
    Boolean(performanceTrackingStartDate) &&
    selectedOverviewTrackedTestsCount === 0;

  const selectedOverviewScoreTrendData = useMemo(
    () => buildLineChartData(selectedOverviewAnalyticsSessions),
    [selectedOverviewAnalyticsSessions],
  );

  const selectedOverviewTopicPerformance = useMemo(
    () => groupAverageScoreByTopic(selectedOverviewSessions),
    [selectedOverviewSessions],
  );

  const selectedOverviewResetTopicPerformance = useMemo(
    () => groupAverageScoreByTopic(selectedOverviewAnalyticsSessions),
    [selectedOverviewAnalyticsSessions],
  );

  const selectedOverviewTrendTickInterval = useMemo(() => {
    const dataPointCount = selectedOverviewScoreTrendData.length;

    if (dataPointCount <= 0) {
      return 0;
    }

    const maxVisibleTicks = isMobileViewport ? 4 : 6;

    if (dataPointCount <= maxVisibleTicks) {
      return 0;
    }

    return Math.ceil(dataPointCount / maxVisibleTicks) - 1;
  }, [isMobileViewport, selectedOverviewScoreTrendData.length]);

  const selectedOverviewMarksSummaryData = useMemo(
    () => calculateMarksSummary(selectedOverviewAnalyticsSessions),
    [selectedOverviewAnalyticsSessions],
  );

  const selectedOverviewSubtopicData = useMemo(() => {
    if (selectedOverviewMarksTopic === OVERVIEW_ALL_TOPICS_VALUE) {
      return [];
    }

    return groupAverageScoreBySubtopic(
      selectedOverviewAnalyticsSessions,
      selectedOverviewMarksTopic,
      overviewSubtopicCatalog,
    );
  }, [
    selectedOverviewAnalyticsSessions,
    overviewSubtopicCatalog,
    selectedOverviewMarksTopic,
  ]);

  const selectedOverviewTopicOptions = useMemo(() => {
    if (!overviewTopicCatalog.length) {
      return selectedOverviewTopicPerformance;
    }

    const sessionTopicMap = new Map(
      selectedOverviewTopicPerformance.map((entry) => [
        normalizeText(entry.topic),
        entry,
      ]),
    );

    return overviewTopicCatalog.map((entry) => {
      const existing = sessionTopicMap.get(normalizeText(entry.label));

      return (
        existing || {
          topic: entry.label,
          topicShortLabel: truncateChartLabel(entry.label),
          averageScore: 0,
          attempts: 0,
        }
      );
    });
  }, [overviewTopicCatalog, selectedOverviewTopicPerformance]);

  const selectedOverviewResetTopicOptions = useMemo(() => {
    if (!overviewTopicCatalog.length) {
      return selectedOverviewResetTopicPerformance;
    }

    const sessionTopicMap = new Map(
      selectedOverviewResetTopicPerformance.map((entry) => [
        normalizeText(entry.topic),
        entry,
      ]),
    );

    return overviewTopicCatalog.map((entry) => {
      const existing = sessionTopicMap.get(normalizeText(entry.label));

      return (
        existing || {
          topic: entry.label,
          topicShortLabel: truncateChartLabel(entry.label),
          averageScore: 0,
          attempts: 0,
        }
      );
    });
  }, [overviewTopicCatalog, selectedOverviewResetTopicPerformance]);

  const selectedOverviewBarChartData = useMemo(() => {
    if (selectedOverviewMarksTopic === OVERVIEW_ALL_TOPICS_VALUE) {
      return selectedOverviewResetTopicOptions.map((entry, index) => ({
        ...entry,
        chartKey: `topic-${index}-${normalizeText(entry.topic)}`,
        chartLabel: entry.topic,
        chartShortLabel: truncateChartLabel(
          entry.topic,
          isMobileViewport ? 28 : 30,
        ),
      }));
    }

    return selectedOverviewSubtopicData.map((entry, index) => ({
      ...entry,
      chartKey: `subtopic-${index}-${normalizeText(entry.subtopic)}`,
      chartLabel: entry.subtopic,
      chartShortLabel: truncateChartLabel(
        entry.subtopic,
        isMobileViewport ? 30 : 30,
      ),
    }));
  }, [
    isMobileViewport,
    selectedOverviewMarksTopic,
    selectedOverviewSubtopicData,
    selectedOverviewResetTopicOptions,
  ]);

  const handleResetPerformanceTracking = async () => {
    if (!selectedOverviewMarksSessions.length || isResettingPerformance) {
      return;
    }

    const scopeLabel =
      selectedOverviewMarksTopic === OVERVIEW_ALL_TOPICS_VALUE
        ? `${selectedOverviewSection?.title || "selected"} ${formatExamBoardHeading(selectedOverviewExamBoard)} performance stats`
        : `${selectedOverviewMarksTopic} performance stats for ${selectedOverviewSection?.title || "selected"} ${formatExamBoardHeading(selectedOverviewExamBoard)}`;

    const confirmed = window.confirm(
      `Reset ${scopeLabel}?\n\nYour full history will still be shown below, but the performance charts will only include tests completed after this reset.`,
    );

    if (!confirmed) {
      return;
    }

    setIsResettingPerformance(true);
    setPerformanceResetError("");

    try {
      await api.post("/accounts/reset-performance-tracking/");

      if (refreshCurrentUser) {
        await refreshCurrentUser();
      }
    } catch (resetError) {
      console.error("Unable to reset performance tracking", resetError);
      setPerformanceResetError(
        "Unable to reset your performance averages right now. Please try again.",
      );
    } finally {
      setIsResettingPerformance(false);
    }
  };

  const selectedOverviewTopicCatalogEntry = useMemo(() => {
    if (selectedOverviewMarksTopic === OVERVIEW_ALL_TOPICS_VALUE) {
      return null;
    }

    return (
      overviewTopicCatalog.find(
        (entry) =>
          normalizeText(entry.label) ===
          normalizeText(selectedOverviewMarksTopic),
      ) || null
    );
  }, [overviewTopicCatalog, selectedOverviewMarksTopic]);

  useEffect(() => {
    let isActive = true;

    const fetchOverviewTopicCatalog = async () => {
      if (!selectedOverviewSection) {
        setOverviewTopicCatalog([]);
        return;
      }

      const examBoard = formatExamBoardHeading(selectedOverviewExamBoard);
      const contexts = getOverviewCatalogContexts(
        selectedOverviewSection.levelKey,
        selectedOverviewSection.sessions,
      );

      if (!contexts.length) {
        setOverviewTopicCatalog([]);
        return;
      }

      try {
        const responses = await Promise.all(
          contexts.map(async (context) => {
            const endpoint =
              selectedOverviewSection.levelKey === "gcse"
                ? "/api/gcse-topics/"
                : "/api/biology-topics/";
            const params =
              selectedOverviewSection.levelKey === "gcse"
                ? {
                    exam_board: examBoard,
                    subject: context.subject,
                    tier: context.tier,
                  }
                : { exam_board: examBoard };
            const response = await api.get(endpoint, { params });

            return {
              context,
              items: Array.isArray(response.data) ? response.data : [],
            };
          }),
        );

        if (!isActive) {
          return;
        }

        const merged = responses.reduce((map, { context, items }) => {
          items.forEach((item) => {
            const label = getCatalogTopicLabel(item);

            if (!label || item?.id == null) {
              return;
            }

            const key = normalizeText(label);
            const nextRequest = {
              topicId: item.id,
              subject: context.subject,
              tier: context.tier,
            };

            if (!map.has(key)) {
              map.set(key, { label, requests: [nextRequest] });
              return;
            }

            map.get(key).requests.push(nextRequest);
          });

          return map;
        }, new Map());

        setOverviewTopicCatalog(Array.from(merged.values()));
      } catch (err) {
        console.error("Failed to fetch overview topics:", err);
        if (isActive) {
          setOverviewTopicCatalog([]);
        }
      }
    };

    fetchOverviewTopicCatalog();

    return () => {
      isActive = false;
    };
  }, [selectedOverviewExamBoard, selectedOverviewSection]);

  useEffect(() => {
    let isActive = true;

    const fetchOverviewSubtopicCatalog = async () => {
      if (!selectedOverviewSection || !selectedOverviewTopicCatalogEntry) {
        setOverviewSubtopicCatalog([]);
        return;
      }

      const examBoard = formatExamBoardHeading(selectedOverviewExamBoard);

      try {
        const responses = await Promise.all(
          selectedOverviewTopicCatalogEntry.requests.map(async (request) => {
            const endpoint =
              selectedOverviewSection.levelKey === "gcse"
                ? "/api/gcse-subtopics/"
                : "/api/biology-subtopics/";
            const params =
              selectedOverviewSection.levelKey === "gcse"
                ? {
                    topic_id: request.topicId,
                    exam_board: examBoard,
                    subject: request.subject,
                    tier: request.tier,
                  }
                : {
                    topic_id: request.topicId,
                    exam_board: examBoard,
                  };
            const response = await api.get(endpoint, { params });
            return Array.isArray(response.data) ? response.data : [];
          }),
        );

        if (!isActive) {
          return;
        }

        const merged = responses.flat().reduce((map, item) => {
          const label = getCatalogSubtopicLabel(item);

          if (!label) {
            return map;
          }

          const key = normalizeText(label);

          if (!map.has(key)) {
            map.set(key, { label });
          }

          return map;
        }, new Map());

        setOverviewSubtopicCatalog(Array.from(merged.values()));
      } catch (err) {
        console.error("Failed to fetch overview subtopics:", err);
        if (isActive) {
          setOverviewSubtopicCatalog([]);
        }
      }
    };

    fetchOverviewSubtopicCatalog();

    return () => {
      isActive = false;
    };
  }, [
    selectedOverviewExamBoard,
    selectedOverviewSection,
    selectedOverviewTopicCatalogEntry,
  ]);

  useEffect(() => {
    const nextTopicOptions = selectedOverviewTopicOptions;

    if (
      selectedOverviewMarksTopic === OVERVIEW_ALL_TOPICS_VALUE ||
      nextTopicOptions.some(
        (topic) => topic.topic === selectedOverviewMarksTopic,
      )
    ) {
      return;
    }

    setSelectedOverviewMarksTopic(OVERVIEW_ALL_TOPICS_VALUE);
  }, [selectedOverviewMarksTopic, selectedOverviewTopicOptions]);

  return (
    <section
      className={["account-results", className].filter(Boolean).join(" ")}
    >
      {showHeader && (
        <div className="account-sectionHeading">
          <p className="account-eyebrow">Results history</p>
          <h2>Review your saved exam practice</h2>
          <p className="account-muted">
            Track previous sessions, revisit feedback, and compare your progress
            over time.
          </p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="account-results__toolbar account-card">
          <div className="account-results__control">
            <label htmlFor="results-search">Search</label>
            <input
              id="results-search"
              className="account-results__input"
              type="search"
              placeholder="Search topic, subtopic, level or board"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
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

      {!loading && !error && performanceResetError && (
        <article className="account-banner account-banner--error">
          {performanceResetError}
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
                  cards below, filtered by qualification and exam board.
                </p>
              </div>

              {overviewSections.length > 0 && (
                <div className="account-results__overviewControls">
                  <div className="account-results__overviewControl">
                    <label htmlFor="results-overview-level">
                      Qualification
                    </label>
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

                  <div className="account-results__overviewControl">
                    <span className="account-results__overviewControlLabel">
                      Exam board
                    </span>
                    <div
                      className="account-results__boardSwitch"
                      role="radiogroup"
                      aria-label="Overview exam board"
                    >
                      {OVERVIEW_EXAM_BOARD_ORDER.map((examBoardKey) => {
                        const isSelected =
                          selectedOverviewExamBoard === examBoardKey;

                        return (
                          <button
                            key={examBoardKey}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`account-results__boardOption${
                              isSelected
                                ? " account-results__boardOption--active"
                                : ""
                            }`}
                            onClick={() =>
                              setSelectedOverviewExamBoard(examBoardKey)
                            }
                          >
                            {formatExamBoardHeading(examBoardKey)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`account-results__overviewContent${
                selectedOverviewAnalyticsLocked
                  ? " account-results__overviewContent--locked"
                  : ""
              }`}
            >
              {selectedOverviewSection ? (
                <section
                  key={selectedOverviewSection.levelKey}
                  className="account-results__overviewGroup"
                >
                  <div className="account-results__overviewGroupHeader">
                    <h4>{selectedOverviewSection.title} charts</h4>
                    <p className="account-muted">
                      Only {selectedOverviewSection.title.toLowerCase()}{" "}
                      sessions for{" "}
                      {formatExamBoardHeading(selectedOverviewExamBoard)} are
                      included in these charts.
                    </p>
                  </div>

                  <div className="account-results__overviewSharedControls">
                    <div className="account-results__overviewSharedTop">
                      <div className="account-chartCard__control account-chartCard__control--shared">
                        <label htmlFor="results-overview-marks-topic">
                          Module filter
                        </label>
                        <select
                          id="results-overview-marks-topic"
                          className="account-results__input"
                          value={selectedOverviewMarksTopic}
                          onChange={(event) =>
                            setSelectedOverviewMarksTopic(event.target.value)
                          }
                        >
                          <option value={OVERVIEW_ALL_TOPICS_VALUE}>
                            Overall
                          </option>
                          {selectedOverviewTopicOptions.map((topicOption) => (
                            <option
                              key={topicOption.topic}
                              value={topicOption.topic}
                            >
                              {topicOption.topic}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="account-results__resetButton"
                        onClick={handleResetPerformanceTracking}
                        disabled={
                          !selectedOverviewMarksSessions.length ||
                          isResettingPerformance
                        }
                      >
                        {isResettingPerformance
                          ? "Resetting…"
                          : "Reset averages"}
                      </button>
                    </div>

                    <p className="account-muted account-chartCard__note account-chartCard__note--shared">
                      All three graphs use this module filter. The more tests
                      you have, the more reliable the trend - aim for at least 5
                      tests for a clearer picture.
                    </p>

                    {performanceTrackingStartDate ? (
                      <p
                        className={`account-muted account-chartCard__note account-chartCard__note--reset${
                          shouldShowResetWarning
                            ? " account-chartCard__note--warning"
                            : ""
                        }`}
                      >
                        {shouldShowResetWarning
                          ? `Performance averages were reset on ${formatSessionDate(performanceTrackingStartDate)}. Complete your next test to start tracking fresh data.`
                          : `Tracking performance data from ${formatSessionDate(performanceTrackingStartDate)}. Currently tracking ${selectedOverviewTrackedTestsLabel} since reset.`}
                      </p>
                    ) : null}
                  </div>

                  {selectedOverviewAnalyticsSessions.length > 0 ? (
                    <div className="row g-3">
                      <div className="col-12 col-lg-4">
                        <article className="card account-card account-chartCard h-100">
                          <div className="account-chartCard__header">
                            <h4>Marks gained vs missed</h4>
                            <p className="account-muted">
                              {selectedOverviewMarksTopic ===
                              OVERVIEW_ALL_TOPICS_VALUE
                                ? `Total marks across visible ${selectedOverviewSection.title.toLowerCase()} ${formatExamBoardHeading(selectedOverviewExamBoard)} sessions.`
                                : `Total marks for ${selectedOverviewMarksTopic} within visible ${selectedOverviewSection.title.toLowerCase()} ${formatExamBoardHeading(selectedOverviewExamBoard)} sessions.`}
                            </p>
                          </div>
                          <div className="account-chartCard__body account-chartCard__body--donut">
                            <ResponsiveContainer width="100%" height={260}>
                              <PieChart>
                                <Pie
                                  data={selectedOverviewMarksSummaryData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={72}
                                  outerRadius={102}
                                  paddingAngle={4}
                                >
                                  {selectedOverviewMarksSummaryData.map(
                                    (entry) => (
                                      <Cell
                                        key={entry.name}
                                        fill={entry.fill}
                                      />
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
                        <article className="card account-card account-chartCard account-chartCard--trend h-100">
                          <div className="account-chartCard__header">
                            <h4>Moving average score over time</h4>
                            <p className="account-muted">
                              {selectedOverviewMarksTopic ===
                              OVERVIEW_ALL_TOPICS_VALUE
                                ? `See whether your ${selectedOverviewSection.title.toLowerCase()} scores for ${formatExamBoardHeading(selectedOverviewExamBoard)} are improving over time using the cumulative average of completed tests.`
                                : `See whether your ${selectedOverviewMarksTopic} scores for ${selectedOverviewSection.title.toLowerCase()} ${formatExamBoardHeading(selectedOverviewExamBoard)} are improving over time using the cumulative average of completed tests.`}
                            </p>
                          </div>
                          <div className="account-chartCard__body account-chartCard__body--trend">
                            <div className="account-chartCard__chartCanvas account-chartCard__chartCanvas--trend">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={selectedOverviewScoreTrendData}
                                  margin={{
                                    top: 8,
                                    right: 8,
                                    bottom: isMobileViewport ? 12 : 8,
                                    left: 0,
                                  }}
                                >
                                  <CartesianGrid
                                    stroke={CHART_COLORS.grid}
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="chartPointKey"
                                    minTickGap={isMobileViewport ? 28 : 22}
                                    interval={selectedOverviewTrendTickInterval}
                                    tickFormatter={(_, index) =>
                                      selectedOverviewScoreTrendData[index]
                                        ?.label || ""
                                    }
                                    tick={{
                                      fill: CHART_COLORS.text,
                                      fontSize: isMobileViewport ? 10 : 12,
                                    }}
                                  />
                                  <YAxis
                                    domain={[0, 100]}
                                    tick={{
                                      fill: CHART_COLORS.text,
                                      fontSize: isMobileViewport ? 10 : 12,
                                    }}
                                    tickFormatter={(value) => `${value}%`}
                                    width={isMobileViewport ? 30 : 40}
                                  />
                                  <Tooltip content={renderChartTooltip} />
                                  <Line
                                    type="monotone"
                                    dataKey="movingAverage"
                                    name="Moving average"
                                    stroke={CHART_COLORS.line}
                                    strokeWidth={3}
                                    dot={{
                                      r: isMobileViewport ? 3 : 4,
                                      strokeWidth: 0,
                                      fill: CHART_COLORS.line,
                                    }}
                                    activeDot={{ r: isMobileViewport ? 5 : 6 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </article>
                      </div>

                      <div className="col-12">
                        <article className="card account-card account-chartCard account-chartCard--bar">
                          <div className="account-chartCard__header">
                            <h4>
                              {selectedOverviewMarksTopic ===
                              OVERVIEW_ALL_TOPICS_VALUE
                                ? "Average score by module"
                                : "Average score by subtopic"}
                            </h4>
                            <p className="account-muted">
                              {selectedOverviewMarksTopic ===
                              OVERVIEW_ALL_TOPICS_VALUE
                                ? `Compare module performance across your ${selectedOverviewSection.title.toLowerCase()} ${formatExamBoardHeading(selectedOverviewExamBoard)} results.`
                                : `Compare subtopic performance within ${selectedOverviewMarksTopic} for your ${selectedOverviewSection.title.toLowerCase()} ${formatExamBoardHeading(selectedOverviewExamBoard)} results.`}
                            </p>
                          </div>
                          <div className="account-chartCard__body account-chartCard__body--barChart">
                            <div className="account-chartCard__scrollX">
                              <div
                                className="account-chartCard__chartCanvas account-chartCard__chartCanvas--bar"
                                style={{
                                  minWidth: "100%",
                                  height: `${isMobileViewport ? 360 : 440}px`,
                                }}
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={selectedOverviewBarChartData}
                                    margin={{
                                      top: 8,
                                      right: 8,
                                      bottom: isMobileViewport ? 72 : 88,
                                      left: 8,
                                    }}
                                  >
                                    <CartesianGrid
                                      stroke={CHART_COLORS.grid}
                                      vertical={false}
                                    />
                                    <XAxis
                                      dataKey="chartKey"
                                      tickFormatter={(_, index) =>
                                        selectedOverviewBarChartData[index]
                                          ?.chartShortLabel || ""
                                      }
                                      tick={{
                                        fill: CHART_COLORS.text,
                                        fontSize: isMobileViewport ? 9 : 12,
                                      }}
                                      interval={0}
                                      angle={-90}
                                      textAnchor="end"
                                      tickMargin={isMobileViewport ? 6 : 8}
                                      height={isMobileViewport ? 68 : 84}
                                    />
                                    <YAxis
                                      domain={[0, 100]}
                                      tick={{
                                        fill: CHART_COLORS.text,
                                        fontSize: isMobileViewport ? 10 : 12,
                                      }}
                                      tickFormatter={(value) => `${value}%`}
                                      width={isMobileViewport ? 30 : 40}
                                    />
                                    <Tooltip content={renderChartTooltip} />
                                    <Bar
                                      dataKey="averageScore"
                                      name="Average"
                                      fill={CHART_COLORS.bar}
                                      radius={[8, 8, 0, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        </article>
                      </div>
                    </div>
                  ) : !performanceTrackingStartDate ? (
                    <article className="account-card">
                      <p className="account-muted">
                        No {selectedOverviewSection.title.toLowerCase()}{" "}
                        sessions for{" "}
                        {formatExamBoardHeading(selectedOverviewExamBoard)}
                        match the current filters.
                      </p>
                    </article>
                  ) : null}
                </section>
              ) : (
                <article className="account-card">
                  <p className="account-muted">
                    Performance charts are available when sessions are tagged as
                    GCSE or A level.
                  </p>
                </article>
              )}

              {selectedOverviewAnalyticsLocked && (
                <button
                  type="button"
                  className="account-results__overviewLock"
                  onClick={handleLockedAnalyticsInteraction}
                  aria-label={`Upgrade to unlock ${selectedOverviewLockedLabel} analytics`}
                >
                  <span className="account-results__overviewLockCard">
                    <strong>
                      Upgrade to unlock {selectedOverviewLockedLabel} analytics
                    </strong>
                    <span>
                      Buy {selectedOverviewLockedLabel} access to view score
                      trends, marks breakdowns, and module-level performance
                      data for this qualification.
                    </span>
                    <span className="account-results__overviewLockAction">
                      Go to upgrade
                    </span>
                  </span>
                </button>
              )}
            </div>
          </section>

          {afterOverviewAction ? (
            <div className="account-results__betweenAction">
              {afterOverviewAction}
            </div>
          ) : null}

          <div className="account-results__list">
            {visibleSessionCards.map((session) => (
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
                      <h4>Insight</h4>
                      <p>{getInsightText(session)}</p>
                    </div>

                    {session.feedback?.strengths?.length > 0 && (
                      <div className="account-resultCard__feedbackBlock">
                        <h4>What You Did Well</h4>
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
                        <h4>Next Steps</h4>
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
                          <h4>Feedback</h4>
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

            {hasMoreSessionCards ? (
              <div className="account-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() =>
                    setVisibleSessionCardsCount((currentCount) =>
                      Math.min(
                        currentCount + RESULTS_PAGE_SIZE,
                        sessionCards.length,
                      ),
                    )
                  }
                >
                  Show 5 more results
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
