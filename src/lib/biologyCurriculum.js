export const BIOLOGY_MODE_ENDPOINT = "/api/biology-curriculum-mode/";
export const BIOLOGY_CURRICULUM_MODE_LEGACY = "legacy";
export const BIOLOGY_CURRICULUM_MODE_SHARED = "shared";
export const ALEVEL_BIOLOGY_SUBJECT_CODE = "alevel_biology";
export const EDEXCEL_BOARD = "EDEXCEL";
export const EDEXCEL_ALEVEL_SPECIFICATIONS = ["Spec A", "Spec B"];

export const BIOLOGY_MODE_UNAVAILABLE_MESSAGE =
  "We couldn't load the Biology curriculum right now. Please retry before choosing a topic or generating questions.";
export const BIOLOGY_MODE_MISMATCH_MESSAGE =
  "The Biology curriculum has been updated since this page loaded. Your topic selections have been cleared. Please choose a topic again and retry.";

const ENDPOINTS = {
  [BIOLOGY_CURRICULUM_MODE_LEGACY]: {
    topics: "/api/biology-topics/",
    subtopics: "/api/biology-subtopics/",
    subcategories: "/api/biology-subcategories/",
  },
  [BIOLOGY_CURRICULUM_MODE_SHARED]: {
    topics: "/api/alevel-topics/",
    subtopics: "/api/alevel-subtopics/",
    subcategories: "/api/alevel-subcategories/",
  },
};

export const isBiologyCurriculumMode = (value) =>
  value === BIOLOGY_CURRICULUM_MODE_LEGACY ||
  value === BIOLOGY_CURRICULUM_MODE_SHARED;

// Never falls back to a default: an unrecognised response is an error.
export const fetchBiologyCurriculumMode = async (client) => {
  const { data } = await client.get(BIOLOGY_MODE_ENDPOINT);
  const mode = data?.biology_curriculum_mode;

  if (!isBiologyCurriculumMode(mode)) {
    throw new Error("Unrecognised Biology curriculum mode.");
  }

  return mode;
};

// level is "topics" | "subtopics" | "subcategories". The parent filter
// (topic_id / subtopic_id) is passed through unchanged in both modes.
export const buildBiologyCurriculumRequest = ({
  mode,
  level,
  examBoard,
  specification,
  parentId,
  subjectCode = ALEVEL_BIOLOGY_SUBJECT_CODE,
}) => {
  const endpoints = ENDPOINTS[mode];

  if (!endpoints || !endpoints[level]) {
    throw new Error(`Unsupported Biology curriculum request: ${mode}/${level}`);
  }

  const params = {};

  if (parentId != null && parentId !== "") {
    if (level === "subtopics") {
      params.topic_id = parentId;
    } else if (level === "subcategories") {
      params.subtopic_id = parentId;
    }
  }

  if (mode === BIOLOGY_CURRICULUM_MODE_SHARED) {
    params.subject = subjectCode;
  }

  params.exam_board = examBoard;

  // The shared endpoints reject a specification for non-Edexcel boards.
  if (specification && String(examBoard).toUpperCase() === EDEXCEL_BOARD) {
    params.specification = specification;
  }

  return { endpoint: endpoints[level], params };
};

// A 400 from generate-questions that carries biology_curriculum_mode is a
// curriculum mode rejection (missing, invalid or mismatched mode).
export const isBiologyCurriculumModeError = (error) =>
  error?.response?.status === 400 &&
  error.response.data != null &&
  typeof error.response.data === "object" &&
  "biology_curriculum_mode" in error.response.data;
