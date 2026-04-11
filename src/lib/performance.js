export const calculatePercentageScore = (score, total) => {
  const numericScore = Number(score) || 0;
  const numericTotal = Number(total) || 0;

  if (numericTotal <= 0) {
    return 0;
  }

  return Math.round((numericScore / numericTotal) * 100);
};

export const getSessionLevel = (session) =>
  session?.level || session?.qualification_label || "Not recorded";

export const getSessionTopic = (session) =>
  session?.topic_name || session?.topic || "Untitled topic";

export const getSessionScore = (session) =>
  Number(session?.total_score ?? session?.score ?? 0) || 0;

export const getSessionMaxScore = (session) =>
  Number(session?.total_available ?? session?.max_score ?? 0) || 0;

export const getSessionDateValue = (session) =>
  session?.created_at || session?.date || null;

export const isSessionOnOrAfterDate = (session, dateValue) => {
  if (!dateValue) {
    return true;
  }

  const trackingStartTime = new Date(dateValue).getTime();
  const sessionTime = new Date(getSessionDateValue(session)).getTime();

  if (Number.isNaN(trackingStartTime) || Number.isNaN(sessionTime)) {
    return true;
  }

  return sessionTime >= trackingStartTime;
};

const getSessionQuestionCount = (session) =>
  Number(
    session?.number_of_questions ??
      session?.question_count ??
      session?.questions_count ??
      0,
  ) || 0;

export const buildPerformanceSummary = (sessions) => {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      averageScore: null,
      totalQuestionsAnswered: 0,
      strongestTopic: null,
      weakestTopic: null,
      lastScore: null,
      trackedTestsCount: 0,
    };
  }

  const topicStats = sessions.reduce((map, session) => {
    const topic = getSessionTopic(session);
    const current = map.get(topic) || {
      topic,
      totalPercent: 0,
      attempts: 0,
    };

    current.totalPercent += calculatePercentageScore(
      getSessionScore(session),
      getSessionMaxScore(session),
    );
    current.attempts += 1;

    map.set(topic, current);
    return map;
  }, new Map());

  const topicAverages = Array.from(topicStats.values()).map((entry) => ({
    topic: entry.topic,
    averageScore: Math.round(entry.totalPercent / entry.attempts),
    attempts: entry.attempts,
  }));

  topicAverages.sort((left, right) => {
    if (right.averageScore !== left.averageScore) {
      return right.averageScore - left.averageScore;
    }

    if (right.attempts !== left.attempts) {
      return right.attempts - left.attempts;
    }

    return left.topic.localeCompare(right.topic, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const latestSession = sessions.reduce((latest, session) => {
    const latestTime = latest
      ? new Date(getSessionDateValue(latest)).getTime() || 0
      : -Infinity;
    const sessionTime = new Date(getSessionDateValue(session)).getTime() || 0;

    return sessionTime > latestTime ? session : latest;
  }, null);

  const averageScore = Math.round(
    sessions.reduce(
      (total, session) =>
        total +
        calculatePercentageScore(
          getSessionScore(session),
          getSessionMaxScore(session),
        ),
      0,
    ) / sessions.length,
  );

  const weakestTopicEntry = [...topicAverages].sort((left, right) => {
    if (left.averageScore !== right.averageScore) {
      return left.averageScore - right.averageScore;
    }

    if (right.attempts !== left.attempts) {
      return right.attempts - left.attempts;
    }

    return left.topic.localeCompare(right.topic, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  })[0];

  return {
    averageScore,
    totalQuestionsAnswered: sessions.reduce(
      (total, session) => total + getSessionQuestionCount(session),
      0,
    ),
    strongestTopic: topicAverages[0]?.topic || null,
    weakestTopic: weakestTopicEntry?.topic || null,
    lastScore: latestSession
      ? calculatePercentageScore(
          getSessionScore(latestSession),
          getSessionMaxScore(latestSession),
        )
      : null,
    trackedTestsCount: sessions.length,
  };
};
