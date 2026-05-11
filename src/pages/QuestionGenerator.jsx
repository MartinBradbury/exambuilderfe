import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import "../styles/QuestionGenerator.modern.css";
import {
  Link,
  useBeforeUnload,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import {
  ALEVEL_QUALIFICATION,
  buildAccountUpgradePath,
  GCSE_QUALIFICATION,
  getQualificationLabel,
  pickEntitlementUpdates,
} from "../lib/access";
import aLevelCover from "../assets/home/Alevelcard.png";
import gcseCover from "../assets/home/GCSEcard.png";

const EXAM_BOARD_OPTIONS = ["AQA", "OCR", "EDEXCEL"];
const GCSE_SUBJECT_OPTIONS = ["BIOLOGY", "CHEMISTRY", "PHYSICS", "COMBINED"];
const GCSE_TIER_OPTIONS = ["FOUNDATION", "HIGHER"];
const EDEXCEL_ALEVEL_SPECIFICATION_OPTIONS = ["Spec A", "Spec B"];
const QUESTION_MODE_STANDARD = "standard";
const QUESTION_MODE_ESSAY = "essay";
const ESSAY_QUESTION_TYPE = "ESSAY_25_MARK";
const ESSAY_TIMER_DURATION_SECONDS = 25 * 60;
const SESSION_LEAVE_MESSAGE =
  "Are you sure you want to leave this page? Your current question session will be lost.";
const SESSION_RESULTS_PENDING_LEAVE_MESSAGE =
  "Are you sure you want to leave this page? Your answers have been marked, but this question session will not be saved unless you click Complete and View Results.";

const normalizeTopicName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatCountdown = (totalSeconds) => {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function QuestionGenerator() {
  const {
    user,
    hasAccessToQualification,
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
  const [qualification, setQualification] = useState(ALEVEL_QUALIFICATION);
  const [hasSelectedQualification, setHasSelectedQualification] =
    useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTier, setSelectedTier] = useState("");
  const [selectedSpecification, setSelectedSpecification] = useState("");

  const [examBoard, setExamBoard] = useState("OCR");
  const [questionMode, setQuestionMode] = useState(QUESTION_MODE_STANDARD);
  const [numberOfQuestions, setNumberOfQuestions] = useState("3");

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState("");
  const [openIndexes, setOpenIndexes] = useState({});
  const [userAnswers, setUserAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [isBatchMarking, setIsBatchMarking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [markedAnswers, setMarkedAnswers] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [answered, setAnswered] = useState({});

  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxSeenIndex, setMaxSeenIndex] = useState(0);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [resumeNotice, setResumeNotice] = useState("");
  const [essayTimerSecondsLeft, setEssayTimerSecondsLeft] = useState(
    ESSAY_TIMER_DURATION_SECONDS,
  );
  const [isEssayTimerRunning, setIsEssayTimerRunning] = useState(false);

  const [upgradeState, setUpgradeState] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const isGcse = qualification === GCSE_QUALIFICATION;
  const requiresSpecification =
    qualification === ALEVEL_QUALIFICATION && examBoard === "EDEXCEL";
  const isEssayModeAvailable =
    qualification === ALEVEL_QUALIFICATION && examBoard === "AQA";
  const isEssayMode =
    isEssayModeAvailable && questionMode === QUESTION_MODE_ESSAY;
  const resumeSession = location.state?.resumeSession || null;

  const numericRemaining =
    questionsRemainingToday == null ? null : Number(questionsRemainingToday);
  const effectivePlanType = user?.plan_type || null;
  const hasSelectedQualificationAccess =
    hasAccessToQualification?.(qualification) || false;
  const isFreePlan = !hasSelectedQualificationAccess;
  const generationBlocked =
    !hasSelectedQualificationAccess && numericRemaining === 0;
  const questionCountOptions = useMemo(
    () =>
      isEssayMode ? [1] : isFreePlan ? [1] : [1, 2, 3, 4, 5, 6],
    [isEssayMode, isFreePlan],
  );
  const hasMarkedButIncompleteSession =
    Boolean(questions?.length) &&
    typeof finalFeedback === "object" &&
    finalFeedback !== null &&
    !hasSubmitted;
  const shouldShowEssayTimer = isEssayMode && Boolean(questions?.length);
  const essayTimerProgressPercent = Math.max(
    0,
    Math.min(
      100,
      (essayTimerSecondsLeft / ESSAY_TIMER_DURATION_SECONDS) * 100,
    ),
  );
  const isEssayTimerComplete = shouldShowEssayTimer && essayTimerSecondsLeft === 0;
  const hasActiveQuestionSession = Boolean(questions?.length) && !hasSubmitted;
  const shouldBlockNavigation = hasActiveQuestionSession && !allowNavigation;
  const sessionLeaveMessage = hasMarkedButIncompleteSession
    ? SESSION_RESULTS_PENDING_LEAVE_MESSAGE
    : SESSION_LEAVE_MESSAGE;

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!shouldBlockNavigation) {
          return;
        }

        event.preventDefault();
        event.returnValue = sessionLeaveMessage;
      },
      [sessionLeaveMessage, shouldBlockNavigation],
    ),
  );

  useEffect(() => {
    if (!shouldBlockNavigation) {
      return;
    }

    const handleDocumentClick = (event) => {
      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest("a[href]") : null;

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank"
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isSameDocument =
        destination.pathname === currentUrl.pathname &&
        destination.search === currentUrl.search &&
        destination.hash === currentUrl.hash;

      if (isSameDocument) {
        return;
      }

      const confirmed = window.confirm(sessionLeaveMessage);
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePopState = () => {
      const confirmed = window.confirm(sessionLeaveMessage);
      if (!confirmed) {
        window.history.go(1);
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    location.hash,
    location.pathname,
    location.search,
    sessionLeaveMessage,
    shouldBlockNavigation,
  ]);

  const applyEntitlementUpdate = (payload) => {
    if (!payload || !updateEntitlement) {
      return;
    }

    const nextEntitlement = pickEntitlementUpdates(payload);

    if (Object.keys(nextEntitlement).length > 0) {
      updateEntitlement(nextEntitlement);
    }
  };

  useEffect(() => {
    if (isFreePlan && numberOfQuestions !== "1") {
      setNumberOfQuestions("1");
    }
  }, [isFreePlan, numberOfQuestions]);

  useEffect(() => {
    if (!isEssayModeAvailable && questionMode !== QUESTION_MODE_STANDARD) {
      setQuestionMode(QUESTION_MODE_STANDARD);
    }
  }, [isEssayModeAvailable, questionMode]);

  useEffect(() => {
    if (isEssayMode && numberOfQuestions !== "1") {
      setNumberOfQuestions("1");
    }
  }, [isEssayMode, numberOfQuestions]);

  useEffect(() => {
    if (!shouldShowEssayTimer) {
      setEssayTimerSecondsLeft(ESSAY_TIMER_DURATION_SECONDS);
      setIsEssayTimerRunning(false);
      return;
    }

    setEssayTimerSecondsLeft(ESSAY_TIMER_DURATION_SECONDS);
    setIsEssayTimerRunning(false);
  }, [sessionId, shouldShowEssayTimer]);

  useEffect(() => {
    if (!shouldShowEssayTimer || !isEssayTimerRunning) {
      return undefined;
    }

    if (essayTimerSecondsLeft <= 0) {
      setIsEssayTimerRunning(false);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setEssayTimerSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(intervalId);
          setIsEssayTimerRunning(false);
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [essayTimerSecondsLeft, isEssayTimerRunning, shouldShowEssayTimer]);

  useEffect(() => {
    if (!isEssayMode) {
      return;
    }

    setSelectedTopic("");
    setSelectedSubtopic("");
    setSelectedSubcategory("");
  }, [isEssayMode]);

  useEffect(() => {
    if (!resumeSession) {
      setResumeNotice("");
      return;
    }

    const nextQualification =
      resumeSession.qualification === GCSE_QUALIFICATION ||
      resumeSession.qualification === ALEVEL_QUALIFICATION
        ? resumeSession.qualification
        : null;

    if (nextQualification) {
      setQualification(nextQualification);
      setHasSelectedQualification(true);
    }

    const normalizedExamBoard = String(resumeSession.examBoard || "").toUpperCase();

    if (EXAM_BOARD_OPTIONS.includes(normalizedExamBoard)) {
      setExamBoard(normalizedExamBoard);
    }

    if (
      normalizedExamBoard === "EDEXCEL" &&
      nextQualification === ALEVEL_QUALIFICATION &&
      EDEXCEL_ALEVEL_SPECIFICATION_OPTIONS.includes(
        String(resumeSession.specification || ""),
      )
    ) {
      setSelectedSpecification(String(resumeSession.specification));
    }

    if (
      resumeSession.subject &&
      GCSE_SUBJECT_OPTIONS.includes(String(resumeSession.subject).toUpperCase())
    ) {
      setSelectedSubject(String(resumeSession.subject).toUpperCase());
    }

    if (
      resumeSession.tier &&
      GCSE_TIER_OPTIONS.includes(String(resumeSession.tier).toUpperCase())
    ) {
      setSelectedTier(String(resumeSession.tier).toUpperCase());
    }

    if (resumeSession.numberOfQuestions) {
      setNumberOfQuestions(String(resumeSession.numberOfQuestions));
    }

    if (
      nextQualification === ALEVEL_QUALIFICATION &&
      normalizedExamBoard === "AQA" &&
      String(resumeSession.questionType || "").toUpperCase() ===
        ESSAY_QUESTION_TYPE
    ) {
      setQuestionMode(QUESTION_MODE_ESSAY);
    }

    setResumeNotice(
      `Loaded a similar setup from session #${resumeSession.sessionId}. Review the options below before generating a new set.`,
    );
  }, [resumeSession]);

  const clearTopicSelections = () => {
    setTopics([]);
    setSelectedTopic("");
    setSubtopics([]);
    setSelectedSubtopic("");
    setSubcategories([]);
    setSelectedSubcategory("");
  };

  const clearSubtopicSelections = () => {
    setSubtopics([]);
    setSelectedSubtopic("");
    setSubcategories([]);
    setSelectedSubcategory("");
  };

  const clearSubcategorySelections = () => {
    setSubcategories([]);
    setSelectedSubcategory("");
  };

  const handleQualificationChange = (nextQualification) => {
    setQualification(nextQualification);
    setHasSelectedQualification(true);
    setQuestionMode(QUESTION_MODE_STANDARD);
    setError("");
    clearTopicSelections();
    setSelectedSubject("");
    setSelectedTier("");
    setSelectedSpecification("");
  };

  const handleBackToQualificationChoice = () => {
    setHasSelectedQualification(false);
    setQuestionMode(QUESTION_MODE_STANDARD);
    setError("");
    clearTopicSelections();
    setSelectedSubject("");
    setSelectedTier("");
    setSelectedSpecification("");
  };

  const handleExamBoardChange = (nextExamBoard) => {
    setExamBoard(nextExamBoard);
    if (nextExamBoard !== "AQA") {
      setQuestionMode(QUESTION_MODE_STANDARD);
    }
    setSelectedSpecification("");
    setError("");
    clearTopicSelections();
  };

  const handleSubjectChange = (nextSubject) => {
    setSelectedSubject(nextSubject);
    setSelectedTier("");
    setError("");
    clearTopicSelections();
  };

  const handleTierChange = (nextTier) => {
    setSelectedTier(nextTier);
    setError("");
    clearTopicSelections();
  };

  const handleSpecificationChange = (nextSpecification) => {
    setSelectedSpecification(nextSpecification);
    setError("");
    clearTopicSelections();
  };

  // --- Fetch topics when examBoard changes (and pass ?exam_board=...)
  useEffect(() => {
    const fetchTopics = async () => {
      if (!authReady) {
        return;
      }

      if (!hasSelectedQualification) {
        return;
      }

      if (isGcse && (!selectedSubject || !selectedTier)) {
        clearTopicSelections();
        return;
      }

      if (requiresSpecification && !selectedSpecification) {
        clearTopicSelections();
        return;
      }

      try {
        const endpoint = isGcse ? "/api/gcse-topics/" : "/api/biology-topics/";
        const params = isGcse
          ? {
              exam_board: examBoard,
              subject: selectedSubject,
              tier: selectedTier,
            }
          : {
              exam_board: examBoard,
              ...(requiresSpecification
                ? { specification: selectedSpecification }
                : {}),
            };
        const { data } = await api.get(endpoint, { params });
        setTopics(data || []);
        setSelectedTopic("");
        clearSubtopicSelections();
      } catch (err) {
        console.error("Failed to fetch topics:", err);
        clearTopicSelections();
      }
    };
    fetchTopics();
  }, [
    authReady,
    examBoard,
    hasSelectedQualification,
    isGcse,
    requiresSpecification,
    selectedSpecification,
    selectedSubject,
    selectedTier,
  ]);

  useEffect(() => {
    const run = async () => {
      if (!selectedTopic) {
        clearSubtopicSelections();
        return;
      }

      if (requiresSpecification && !selectedSpecification) {
        clearSubtopicSelections();
        return;
      }

      try {
        const endpoint = isGcse
          ? "/api/gcse-subtopics/"
          : "/api/biology-subtopics/";
        const params = isGcse
          ? {
              topic_id: selectedTopic,
              exam_board: examBoard,
              subject: selectedSubject,
              tier: selectedTier,
            }
          : {
              topic_id: selectedTopic,
              exam_board: examBoard,
              ...(requiresSpecification
                ? { specification: selectedSpecification }
                : {}),
            };
        const { data } = await api.get(endpoint, { params });
        setSubtopics(data || []);
        setSelectedSubtopic("");
        clearSubcategorySelections();
      } catch (e) {
        console.error("Failed to fetch subtopics:", e);
        clearSubtopicSelections();
      }
    };
    run();
  }, [
    examBoard,
    isGcse,
    requiresSpecification,
    selectedSpecification,
    selectedSubject,
    selectedTier,
    selectedTopic,
  ]);

  useEffect(() => {
    const run = async () => {
      if (!selectedSubtopic) {
        clearSubcategorySelections();
        return;
      }

      if (requiresSpecification && !selectedSpecification) {
        clearSubcategorySelections();
        return;
      }

      try {
        const endpoint = isGcse
          ? "/api/gcse-subcategories/"
          : "/api/biology-subcategories/";
        const params = isGcse
          ? {
              subtopic_id: selectedSubtopic,
              exam_board: examBoard,
              subject: selectedSubject,
              tier: selectedTier,
            }
          : {
              subtopic_id: selectedSubtopic,
              exam_board: examBoard,
              ...(requiresSpecification
                ? { specification: selectedSpecification }
                : {}),
            };
        const { data } = await api.get(endpoint, { params });
        setSubcategories(data || []);
        setSelectedSubcategory("");
      } catch (e) {
        console.error("Failed to fetch subcategories:", e);
        clearSubcategorySelections();
      }
    };
    run();
  }, [
    examBoard,
    isGcse,
    requiresSpecification,
    selectedSpecification,
    selectedSubject,
    selectedTier,
    selectedSubtopic,
  ]);

  useEffect(() => {
    if (!resumeSession?.topicName || selectedTopic || topics.length === 0) {
      return;
    }

    const matchedTopic = topics.find(
      (topic) =>
        normalizeTopicName(topic.topic) ===
        normalizeTopicName(resumeSession.topicName),
    );

    if (matchedTopic?.id != null) {
      setSelectedTopic(String(matchedTopic.id));
    }
  }, [resumeSession, selectedTopic, topics]);

  useEffect(() => {
    if (
      !resumeSession?.subtopicName ||
      !selectedTopic ||
      selectedSubtopic ||
      subtopics.length === 0
    ) {
      return;
    }

    const matchedSubtopic = subtopics.find(
      (subtopic) =>
        normalizeTopicName(subtopic.title) ===
        normalizeTopicName(resumeSession.subtopicName),
    );

    if (matchedSubtopic?.id != null) {
      setSelectedSubtopic(String(matchedSubtopic.id));
    }
  }, [resumeSession, selectedSubtopic, selectedTopic, subtopics]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missingRequiredFields = isEssayMode
      ? !examBoard || (requiresSpecification && !selectedSpecification)
      : isGcse
        ? !examBoard || !selectedSubject || !selectedTier || !selectedTopic
        : !examBoard ||
          !selectedTopic ||
          (requiresSpecification && !selectedSpecification);

    if (generationBlocked) {
      setUpgradeState({
        error: `You have already used your free question for today. Upgrade ${getQualificationLabel(qualification)} access to remove the daily limit for this qualification.`,
        plan_type: effectivePlanType,
        questions_remaining_today: numericRemaining,
      });
      setError(
        `You have already used your free question for today. Upgrade ${getQualificationLabel(qualification)} access from your account page to continue now.`,
      );
      return;
    }

    if (missingRequiredFields) {
      setError(
        "Please complete all required fields before generating questions.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setUpgradeState(null);
    setQuestions(null);
    setOpenIndexes({});
    setUserAnswers({});
    setFeedback({});
    setIsBatchMarking(false);
    setFinalFeedback("");
    setMarkedAnswers([]);
    setAnswered({});
    setCurrentIndex(0);
    setMaxSeenIndex(0);
    setAllowNavigation(false);

    try {
      const requestedQuestionCount = isEssayMode
        ? 1
        : parseInt(numberOfQuestions, 10);
      const payload = {
        qualification,
        exam_board: examBoard,
        number_of_questions: requestedQuestionCount,
        ...(isEssayMode ? { question_type: ESSAY_QUESTION_TYPE } : {}),
        ...(!isEssayMode ? { topic_id: Number(selectedTopic) } : {}),
        ...(requiresSpecification
          ? { specification: selectedSpecification }
          : {}),
        ...(!isEssayMode && selectedSubtopic
          ? { subtopic_id: Number(selectedSubtopic) }
          : {}),
        ...(!isEssayMode && selectedSubcategory
          ? { subcategory_id: Number(selectedSubcategory) }
          : {}),
        ...(isGcse
          ? {
              subject: selectedSubject,
              tier: selectedTier,
            }
          : {}),
      };

      const { data } = await api.post("/api/generate-questions/", payload);

      setQuestions(data.questions);
      setSessionId(data.session_id);
      setMaxSeenIndex(Math.max(0, (data.questions?.length || 1) - 1));
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
      setLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    setUserAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmitAll = async () => {
    if (!sessionId) {
      alert("No session ID available.");
      return;
    }
    const confirmed = window.confirm("Mark all answers now?");
    if (!confirmed) return;

    const answersToMark = questions.map((questionItem, index) => ({
      question: questionItem.question,
      mark_scheme: questionItem.mark_scheme,
      user_answer: userAnswers[index] || "",
    }));

    setIsBatchMarking(true);

    try {
      const markingPayload = isEssayMode
        ? {
            qualification,
            exam_board: examBoard,
            question_type: ESSAY_QUESTION_TYPE,
            question: questions[0]?.question || "",
            mark_scheme: questions[0]?.mark_scheme || [],
            user_answer: userAnswers[0] || "",
            ...(requiresSpecification
              ? { specification: selectedSpecification }
              : {}),
          }
        : {
            qualification,
            exam_board: examBoard,
            answers: answersToMark,
            ...(isGcse
              ? {
                  subject: selectedSubject,
                  tier: selectedTier,
                }
              : {}),
          };

      const { data: markingData } = await api.post(
        "/api/mark-answer/",
        markingPayload,
      );

      const nextFeedback = {};
      if (isEssayMode) {
        const essayResult = Array.isArray(markingData?.results)
          ? markingData.results[0] || {}
          : markingData || {};

        nextFeedback[0] = {
          score: essayResult?.score ?? 0,
          out_of: essayResult?.out_of ?? 0,
          feedback: essayResult?.feedback || "",
        };
      } else {
        const results = Array.isArray(markingData?.results)
          ? markingData.results
          : [];

        results.forEach((result, resultIndex) => {
          const candidateIndex = Number(result?.index);
          const mappedIndex = Number.isInteger(candidateIndex)
            ? Math.min(
                questions.length - 1,
                Math.max(
                  0,
                  candidateIndex > 0 ? candidateIndex - 1 : candidateIndex,
                ),
              )
            : resultIndex;

          nextFeedback[mappedIndex] = {
            score: result?.score ?? 0,
            out_of: result?.out_of ?? 0,
            feedback: result?.feedback || "",
          };
        });
      }

      setFeedback(nextFeedback);
      setAnswered(
        Object.fromEntries(questions.map((_, index) => [index, true])),
      );

      const summarySource =
        isEssayMode && Array.isArray(markingData?.results)
          ? markingData.results[0] || {}
          : markingData || {};
      const summaryFeedback = {
        strengths: Array.isArray(markingData?.strengths)
          ? markingData.strengths
          : Array.isArray(summarySource?.strengths)
            ? summarySource.strengths
          : [],
        improvements: Array.isArray(markingData?.improvements)
          ? markingData.improvements
          : Array.isArray(summarySource?.improvements)
            ? summarySource.improvements
          : [],
      };

      const scoredAnswers = questions.map((questionItem, index) => ({
        question: questionItem.question,
        user_answer: userAnswers[index] || "",
        score: nextFeedback[index]?.score ?? 0,
        out_of: nextFeedback[index]?.out_of ?? 0,
        feedback: nextFeedback[index]?.feedback || "",
      }));

      setCurrentIndex(0);
      setMarkedAnswers(scoredAnswers);
      setFinalFeedback(summaryFeedback);
    } catch (err) {
      console.error(err);
      alert("Failed to mark answers.");
    } finally {
      setIsBatchMarking(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionId || !finalFeedback || typeof finalFeedback !== "object") {
      alert("Mark all answers before completing the session.");
      return;
    }

    setIsSubmittingAll(true);

    try {
      const submissionFeedback = isEssayMode
        ? {
            ...finalFeedback,
            question_type: ESSAY_QUESTION_TYPE,
          }
        : finalFeedback;

      await api.post("/api/submit-question-session/", {
        session_id: sessionId,
        answers: markedAnswers,
        feedback: submissionFeedback,
      });

      setAllowNavigation(true);
      setHasSubmitted(true);
      navigate("/progress");
    } catch (err) {
      console.error(err);
      alert("Failed to save session.");
    } finally {
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

  const topicPlaceholder = isGcse
    ? !selectedSubject
      ? "-- Select subject first --"
      : !selectedTier
        ? "-- Select tier first --"
        : topics.length === 0
          ? "-- No topics available --"
          : "-- Please Select --"
    : requiresSpecification && !selectedSpecification
      ? "-- Select specification first --"
    : topics.length === 0
      ? "-- No topics available --"
      : "-- Please Select --";
  const generateDisabled =
    loading ||
    generationBlocked ||
    (!isEssayMode && !selectedTopic) ||
    (requiresSpecification && !selectedSpecification) ||
    (isGcse && (!selectedSubject || !selectedTier));
  const questionCountHelperText = isEssayMode
    ? "Essay mode always generates exactly 1 question."
    : isFreePlan
      ? hasSelectedQualificationAccess
        ? ""
        : `${getQualificationLabel(qualification)} is currently on the free tier for this account, so this qualification is limited to 2 generated question per day until upgraded.`
      : "";

  return (
    <div className="qg-root container">
      <header className="qg-header">
        <h1>Generate Practice Questions</h1>
      </header>

      {!questions && !hasSelectedQualification && (
        <section className="qg-choice-card">
          <div className="qg-choice-header">
            <h2>Select your qualification</h2>
            <p className="muted">Choose a level to start practising.</p>
          </div>

          <div className="qg-choice-grid">
            <button
              type="button"
              className="qg-choice-tile"
              onClick={() => handleQualificationChange(ALEVEL_QUALIFICATION)}
            >
              <img
                src={aLevelCover}
                alt="A-level Biology"
                className="qg-choice-image"
              />
              <span className="qg-choice-copy">
                <strong>A-level</strong>
                <span>Biology question generation</span>
              </span>
            </button>

            <button
              type="button"
              className="qg-choice-tile"
              onClick={() => handleQualificationChange(GCSE_QUALIFICATION)}
            >
              <img
                src={gcseCover}
                alt="GCSE Science"
                className="qg-choice-image"
              />
              <span className="qg-choice-copy">
                <strong>GCSE</strong>
                <span>Biology, Chemistry, Physics, and Combined Science</span>
              </span>
            </button>
          </div>
        </section>
      )}

      {!questions && hasSelectedQualification && (
        <form onSubmit={handleSubmit} className="qg-card">
          {resumeNotice && (
            <p className="qg-hint" role="status">
              {resumeNotice}
            </p>
          )}
          <div className="qg-form-topbar">
            <div>
              <p className="qg-form-eyebrow">Selected qualification</p>
              <h2>{isGcse ? "GCSE Science" : "A-level Biology"}</h2>
            </div>
            <button
              type="button"
              className="btn btn--ghost qg-change-qualification"
              onClick={handleBackToQualificationChoice}
            >
              Change qualification
            </button>
          </div>

          {/* Vertically stacked essentials */}
          <div className="qg-vert">
            {/* Exam board */}
            <div className="qg-field">
              <label className="qg-label">Exam Board</label>
              <select
                className="qg-input"
                value={examBoard}
                onChange={(e) => handleExamBoardChange(e.target.value)}
              >
                {EXAM_BOARD_OPTIONS.map((board) => (
                  <option key={board} value={board}>
                    {board}
                  </option>
                ))}
              </select>
            </div>

            {requiresSpecification && (
              <div className="qg-field">
                <label className="qg-label">Specification</label>
                <select
                  className="qg-input"
                  value={selectedSpecification}
                  onChange={(e) => handleSpecificationChange(e.target.value)}
                  required
                >
                  <option value="">-- Please Select --</option>
                  {EDEXCEL_ALEVEL_SPECIFICATION_OPTIONS.map((specification) => (
                    <option key={specification} value={specification}>
                      {specification}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isGcse && (
              <>
                <div className="qg-field">
                  <label className="qg-label">Subject</label>
                  <select
                    className="qg-input"
                    value={selectedSubject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    disabled={!examBoard}
                    required
                  >
                    <option value="">-- Please Select --</option>
                    {GCSE_SUBJECT_OPTIONS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="qg-field">
                  <label className="qg-label">Tier</label>
                  <select
                    className="qg-input"
                    value={selectedTier}
                    onChange={(e) => handleTierChange(e.target.value)}
                    disabled={!selectedSubject}
                    required
                  >
                    <option value="">-- Please Select --</option>
                    {GCSE_TIER_OPTIONS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {isEssayModeAvailable && (
              <div className="qg-field qg-field--mode">
                <span className="qg-label">Question Mode</span>
                <div className="qg-modeGrid" role="radiogroup" aria-label="Question mode">
                  <button
                    type="button"
                    className={`qg-modeCard${
                      questionMode === QUESTION_MODE_STANDARD
                        ? " qg-modeCard--active"
                        : ""
                    }`}
                    role="radio"
                    aria-checked={questionMode === QUESTION_MODE_STANDARD}
                    onClick={() => setQuestionMode(QUESTION_MODE_STANDARD)}
                  >
                    <strong>Standard Questions</strong>
                    <span>Use the regular multi-question practice flow.</span>
                  </button>
                  <button
                    type="button"
                    className={`qg-modeCard${
                      questionMode === QUESTION_MODE_ESSAY
                        ? " qg-modeCard--active"
                        : ""
                    }`}
                    role="radio"
                    aria-checked={questionMode === QUESTION_MODE_ESSAY}
                    onClick={() => setQuestionMode(QUESTION_MODE_ESSAY)}
                  >
                    <strong>25 Mark Essay</strong>
                    <span>
                      Generates one AQA A-level Biology 25-mark essay question.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {!isEssayMode && (
              <>
                {/* Topic */}
                <div className="qg-field">
                  <label className="qg-label">
                    {isGcse ? "Topic" : "Topic (Module)"}
                  </label>
                  <select
                    className="qg-input"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    disabled={
                      isGcse
                        ? !selectedSubject || !selectedTier || topics.length === 0
                        : topics.length === 0
                    }
                    required
                  >
                    <option value="">{topicPlaceholder}</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.topic}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subtopics (optional) */}
                {selectedTopic && subtopics.length > 0 && (
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
                {selectedSubtopic && subcategories.length > 0 && (
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
                  {questionCountHelperText && (
                    <p className="qg-hint">{questionCountHelperText}</p>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            className="btn btn--primary qg-generate"
            type="submit"
            disabled={generateDisabled}
          >
            {loading ? (
              <>
                Generating Questions…
                <span className="qg-spinner" aria-hidden="true" />
              </>
            ) : (
              "Generate Questions"
            )}
          </button>

          {upgradeState?.error && (
            <p className="qg-error">{upgradeState.error}</p>
          )}
          {error && <p className="qg-error">{error}</p>}

          {isFreePlan && (
            <p className="qg-hint">
              Need more than the shared free daily quota? Manage qualification
              access from{" "}
              <Link
                to={buildAccountUpgradePath(qualification)}
                className="qg-inlineLink"
              >
                your account
              </Link>
              .
            </p>
          )}
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

          {shouldShowEssayTimer && (
            <div
              className={`qg-essayTimer${
                isEssayTimerRunning ? " qg-essayTimer--running" : ""
              }${isEssayTimerComplete ? " qg-essayTimer--complete" : ""}`}
              aria-live="polite"
            >
              <div className="qg-essayTimer__main">
                <div className="qg-essayTimer__header">
                  <p className="qg-essayTimer__eyebrow">Essay timer</p>
                  <span className="qg-essayTimer__status">
                    {isEssayTimerComplete
                      ? "Time elapsed"
                      : isEssayTimerRunning
                        ? "Running"
                        : essayTimerSecondsLeft < ESSAY_TIMER_DURATION_SECONDS
                          ? "Paused"
                          : "Ready"}
                  </span>
                </div>
                <strong className="qg-essayTimer__value">
                  {formatCountdown(essayTimerSecondsLeft)}
                </strong>
                <p className="qg-essayTimer__hint">
                  Use a 25-minute timed response for this AQA A-level Biology essay.
                </p>
                <div className="qg-essayTimer__track" aria-hidden="true">
                  <div
                    className="qg-essayTimer__fill"
                    style={{ width: `${essayTimerProgressPercent}%` }}
                  />
                </div>
              </div>
              <div className="qg-essayTimer__actions">
                <button
                  type="button"
                  className="btn btn--subtle"
                  onClick={() =>
                    setIsEssayTimerRunning((isRunning) => !isRunning)
                  }
                >
                  {isEssayTimerRunning
                    ? "Pause timer"
                    : essayTimerSecondsLeft < ESSAY_TIMER_DURATION_SECONDS
                      ? "Resume timer"
                      : "Start 25-minute timer"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setEssayTimerSecondsLeft(ESSAY_TIMER_DURATION_SECONDS);
                    setIsEssayTimerRunning(false);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

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
                    disabled={
                      answered[currentIndex] || hasSubmitted || isBatchMarking
                    }
                  />
                  {!feedback[currentIndex] && (
                    <p className="qg-hint">
                      Answers are marked together when you use Mark All Answers.
                    </p>
                  )}
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
              disabled={
                isSubmittingAll ||
                hasSubmitted ||
                isBatchMarking ||
                (finalFeedback && typeof finalFeedback === "object")
              }
              className="btn btn--primary qg-submit-all"
            >
              {hasSubmitted ? (
                "Submitted ✅"
              ) : isBatchMarking ? (
                <>
                  Marking answers… <span className="qg-spinner" />
                </>
              ) : finalFeedback && typeof finalFeedback === "object" ? (
                "Answers Marked"
              ) : (
                "Mark All Answers"
              )}
            </button>
          </div>

          {finalFeedback && typeof finalFeedback === "object" && (
            <section className="qg-summary" aria-live="polite">
              <h3>Overall Summary</h3>

              <div className="qg-summary-grid">
                <div className="qg-summary-card">
                  <h4>Strengths</h4>
                  {finalFeedback.strengths?.length ? (
                    <ul>
                      {finalFeedback.strengths.map((item, idx) => (
                        <li key={`strength-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No strengths provided.</p>
                  )}
                </div>

                <div className="qg-summary-card">
                  <h4>Improvements</h4>
                  {finalFeedback.improvements?.length ? (
                    <ul>
                      {finalFeedback.improvements.map((item, idx) => (
                        <li key={`improvement-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No improvements provided.</p>
                  )}
                </div>
              </div>

              <div className="qg-summary-actions">
                <button
                  className="btn btn--primary"
                  onClick={handleCompleteSession}
                  disabled={isSubmittingAll || hasSubmitted}
                >
                  {isSubmittingAll
                    ? "Completing…"
                    : "Complete and View Results"}
                </button>
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
}
