import {
  ALEVEL_CHEMISTRY_QUALIFICATION,
  ALEVEL_PHYSICS_QUALIFICATION,
  ALEVEL_QUALIFICATION,
  GCSE_QUALIFICATION,
} from "./access.js";
import {
  BIOLOGY_CURRICULUM_MODE_SHARED,
  buildBiologyCurriculumRequest,
} from "./biologyCurriculum.js";

// Order shown in the generator's qualification chooser.
export const GENERATION_QUALIFICATIONS = [
  GCSE_QUALIFICATION,
  ALEVEL_QUALIFICATION,
  ALEVEL_CHEMISTRY_QUALIFICATION,
  ALEVEL_PHYSICS_QUALIFICATION,
];

// Subject codes used by the shared A-level curriculum endpoints. These are
// distinct from the qualification identifiers sent to generation, marking and
// checkout (which share the same four values but are separate contracts).
export const ALEVEL_SUBJECT_CODES = {
  [ALEVEL_QUALIFICATION]: "alevel_biology",
  [ALEVEL_CHEMISTRY_QUALIFICATION]: "alevel_chemistry",
  [ALEVEL_PHYSICS_QUALIFICATION]: "alevel_physics",
};

export const EDEXCEL_BOARD = "EDEXCEL";
export const AQA_BOARD = "AQA";

export const isALevelQualification = (qualification) =>
  Object.prototype.hasOwnProperty.call(ALEVEL_SUBJECT_CODES, qualification);

// Chemistry and Physics always use the shared curriculum; Biology depends on
// the backend's discovered curriculum mode.
export const isSharedOnlyALevelQualification = (qualification) =>
  qualification === ALEVEL_CHEMISTRY_QUALIFICATION ||
  qualification === ALEVEL_PHYSICS_QUALIFICATION;

export const requiresSpecificationFor = (qualification, examBoard) =>
  isALevelQualification(qualification) &&
  String(examBoard || "").toUpperCase() === EDEXCEL_BOARD;

// Essay questions exist for AQA A-level Biology only.
export const isEssayAvailableFor = (qualification, examBoard) =>
  qualification === ALEVEL_QUALIFICATION &&
  String(examBoard || "").toUpperCase() === AQA_BOARD;

export const getQualificationChoiceCopy = (qualification) => {
  if (qualification === GCSE_QUALIFICATION) {
    return {
      title: "GCSE",
      description: "Biology, Chemistry, Physics, and Combined Science",
    };
  }

  if (qualification === ALEVEL_CHEMISTRY_QUALIFICATION) {
    return {
      title: "A-level Chemistry",
      description: "Chemistry question generation",
    };
  }

  if (qualification === ALEVEL_PHYSICS_QUALIFICATION) {
    return {
      title: "A-level Physics",
      description: "Physics question generation",
    };
  }

  return {
    title: "A-level Biology",
    description: "Biology question generation",
  };
};

// Returns the curriculum request for any A-level qualification. Biology keeps
// its legacy/shared mode; Chemistry and Physics are always shared.
export const buildALevelCurriculumRequest = ({
  qualification,
  mode,
  level,
  examBoard,
  specification,
  parentId,
}) => {
  const subjectCode = ALEVEL_SUBJECT_CODES[qualification];

  if (!subjectCode) {
    throw new Error(`Unsupported A-level qualification: ${qualification}`);
  }

  return buildBiologyCurriculumRequest({
    mode: isSharedOnlyALevelQualification(qualification)
      ? BIOLOGY_CURRICULUM_MODE_SHARED
      : mode,
    level,
    examBoard,
    specification,
    parentId,
    subjectCode,
  });
};

// Fields that qualify the question set for marking. GCSE needs subject/tier;
// Edexcel A-level needs its specification for every A-level subject.
export const buildMarkingScope = ({
  qualification,
  examBoard,
  specification,
  gcseSubject,
  gcseTier,
}) => {
  if (qualification === GCSE_QUALIFICATION) {
    return { subject: gcseSubject, tier: gcseTier };
  }

  return requiresSpecificationFor(qualification, examBoard) && specification
    ? { specification }
    : {};
};

export const ESSAY_QUESTION_TYPE = "ESSAY_25_MARK";

// Only Biology standard generation carries curriculum_mode; Chemistry and
// Physics are always shared and the backend does not use the field for them.
export const buildGenerationPayload = ({
  qualification,
  examBoard,
  numberOfQuestions,
  isEssayMode = false,
  topicId,
  subtopicId,
  subcategoryId,
  specification,
  curriculumMode,
  gcseSubject,
  gcseTier,
}) => {
  const isGcse = qualification === GCSE_QUALIFICATION;

  return {
    qualification,
    exam_board: examBoard,
    number_of_questions: isEssayMode ? 1 : numberOfQuestions,
    ...(isEssayMode ? { question_type: ESSAY_QUESTION_TYPE } : {}),
    ...(!isEssayMode ? { topic_id: Number(topicId) } : {}),
    ...(requiresSpecificationFor(qualification, examBoard)
      ? { specification }
      : {}),
    ...(!isEssayMode && subtopicId ? { subtopic_id: Number(subtopicId) } : {}),
    ...(!isEssayMode && subcategoryId
      ? { subcategory_id: Number(subcategoryId) }
      : {}),
    ...(qualification === ALEVEL_QUALIFICATION && !isEssayMode
      ? { curriculum_mode: curriculumMode }
      : {}),
    ...(isGcse ? { subject: gcseSubject, tier: gcseTier } : {}),
  };
};

export const buildBatchMarkingPayload = ({
  qualification,
  examBoard,
  answers,
  specification,
  gcseSubject,
  gcseTier,
}) => ({
  qualification,
  exam_board: examBoard,
  answers,
  ...buildMarkingScope({
    qualification,
    examBoard,
    specification,
    gcseSubject,
    gcseTier,
  }),
});

const QUALIFICATION_ALIASES = {
  GCSE: GCSE_QUALIFICATION,
  GCSE_SCIENCE: GCSE_QUALIFICATION,
  ALEVEL: ALEVEL_QUALIFICATION,
  A_LEVEL: ALEVEL_QUALIFICATION,
  ALEVEL_BIOLOGY: ALEVEL_QUALIFICATION,
  A_LEVEL_BIOLOGY: ALEVEL_QUALIFICATION,
  ALEVEL_CHEMISTRY: ALEVEL_CHEMISTRY_QUALIFICATION,
  A_LEVEL_CHEMISTRY: ALEVEL_CHEMISTRY_QUALIFICATION,
  ALEVEL_PHYSICS: ALEVEL_PHYSICS_QUALIFICATION,
  A_LEVEL_PHYSICS: ALEVEL_PHYSICS_QUALIFICATION,
};

const SUBJECT_CODE_QUALIFICATIONS = {
  gcse_science: GCSE_QUALIFICATION,
  alevel_biology: ALEVEL_QUALIFICATION,
  alevel_chemistry: ALEVEL_CHEMISTRY_QUALIFICATION,
  alevel_physics: ALEVEL_PHYSICS_QUALIFICATION,
};

export const normalizeQualification = (value) => {
  const key = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  return QUALIFICATION_ALIASES[key] || null;
};

// Resolves a saved session to one of the four modules. The qualification wins;
// the serializer's subject code and the legacy level text are only fallbacks
// so historical ALEVEL / unlabelled A-level rows stay under Biology.
export const getSessionQualification = (session) => {
  const fromQualification = normalizeQualification(session?.qualification);

  if (fromQualification) {
    return fromQualification;
  }

  const subjectCode = String(session?.subject || "")
    .trim()
    .toLowerCase();

  if (SUBJECT_CODE_QUALIFICATIONS[subjectCode]) {
    return SUBJECT_CODE_QUALIFICATIONS[subjectCode];
  }

  const level = String(session?.level || session?.qualification_label || "")
    .trim()
    .toLowerCase();

  if (level.includes("gcse")) {
    return GCSE_QUALIFICATION;
  }

  if (
    level.includes("a level") ||
    level.includes("alevel") ||
    level.includes("a-level") ||
    level.includes("as and a level")
  ) {
    return ALEVEL_QUALIFICATION;
  }

  return null;
};

// Overview keys. "a-level" stays the Biology key so existing navigation state
// (initialOverviewLevel) keeps working.
const OVERVIEW_KEY_BY_QUALIFICATION = {
  [GCSE_QUALIFICATION]: "gcse",
  [ALEVEL_QUALIFICATION]: "a-level",
  [ALEVEL_CHEMISTRY_QUALIFICATION]: "a-level-chemistry",
  [ALEVEL_PHYSICS_QUALIFICATION]: "a-level-physics",
};

export const OVERVIEW_LEVEL_KEYS = Object.values(OVERVIEW_KEY_BY_QUALIFICATION);

export const getOverviewLevelKeyForQualification = (qualification) =>
  OVERVIEW_KEY_BY_QUALIFICATION[qualification] || null;

export const getQualificationForOverviewLevelKey = (levelKey) =>
  Object.keys(OVERVIEW_KEY_BY_QUALIFICATION).find(
    (qualification) => OVERVIEW_KEY_BY_QUALIFICATION[qualification] === levelKey,
  ) || null;

export const getSessionOverviewLevelKey = (session) =>
  getOverviewLevelKeyForQualification(getSessionQualification(session)) ||
  "other";
