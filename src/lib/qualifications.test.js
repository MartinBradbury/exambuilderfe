import assert from "node:assert/strict";
import test from "node:test";

import {
  ALEVEL_CHEMISTRY_QUALIFICATION,
  ALEVEL_PHYSICS_QUALIFICATION,
  ALEVEL_QUALIFICATION,
  GCSE_QUALIFICATION,
  hasAccessToQualification,
} from "./access.js";
import {
  buildALevelCurriculumRequest,
  buildBatchMarkingPayload,
  buildGenerationPayload,
  buildMarkingScope,
  GENERATION_QUALIFICATIONS,
  getOverviewLevelKeyForQualification,
  getQualificationForOverviewLevelKey,
  getSessionOverviewLevelKey,
  getSessionQualification,
  isEssayAvailableFor,
  normalizeQualification,
} from "./qualifications.js";

test("offers all four modules", () => {
  assert.deepEqual(GENERATION_QUALIFICATIONS, [
    "GCSE_SCIENCE",
    "ALEVEL_BIOLOGY",
    "ALEVEL_CHEMISTRY",
    "ALEVEL_PHYSICS",
  ]);
});

test("curriculum requests use the shared endpoints with the right subject", () => {
  for (const [qualification, subject] of [
    [ALEVEL_CHEMISTRY_QUALIFICATION, "alevel_chemistry"],
    [ALEVEL_PHYSICS_QUALIFICATION, "alevel_physics"],
    [ALEVEL_QUALIFICATION, "alevel_biology"],
  ]) {
    const { endpoint, params } = buildALevelCurriculumRequest({
      qualification,
      mode: "shared",
      level: "topics",
      examBoard: "AQA",
    });

    assert.equal(endpoint, "/api/alevel-topics/");
    assert.equal(params.subject, subject);
    assert.equal(params.exam_board, "AQA");
    assert.equal("specification" in params, false);
  }
});

test("Chemistry and Physics ignore legacy mode; Biology keeps it", () => {
  const chemistry = buildALevelCurriculumRequest({
    qualification: ALEVEL_CHEMISTRY_QUALIFICATION,
    mode: "legacy",
    level: "topics",
    examBoard: "OCR",
  });
  assert.equal(chemistry.endpoint, "/api/alevel-topics/");

  const biology = buildALevelCurriculumRequest({
    qualification: ALEVEL_QUALIFICATION,
    mode: "legacy",
    level: "topics",
    examBoard: "OCR",
  });
  assert.equal(biology.endpoint, "/api/biology-topics/");
});

test("Edexcel curriculum requests carry the specification", () => {
  const { params } = buildALevelCurriculumRequest({
    qualification: ALEVEL_PHYSICS_QUALIFICATION,
    mode: "shared",
    level: "subtopics",
    examBoard: "EDEXCEL",
    specification: "Spec B",
    parentId: 7,
  });

  assert.equal(params.specification, "Spec B");
  assert.equal(params.topic_id, 7);
  assert.equal(params.subject, "alevel_physics");
});

test("unsupported qualifications are rejected", () => {
  assert.throws(() =>
    buildALevelCurriculumRequest({
      qualification: GCSE_QUALIFICATION,
      mode: "shared",
      level: "topics",
      examBoard: "AQA",
    }),
  );
});

test("essays are Biology on AQA only", () => {
  assert.equal(isEssayAvailableFor(ALEVEL_QUALIFICATION, "AQA"), true);
  assert.equal(isEssayAvailableFor(ALEVEL_QUALIFICATION, "OCR"), false);
  assert.equal(isEssayAvailableFor(ALEVEL_CHEMISTRY_QUALIFICATION, "AQA"), false);
  assert.equal(isEssayAvailableFor(ALEVEL_PHYSICS_QUALIFICATION, "AQA"), false);
  assert.equal(isEssayAvailableFor(GCSE_QUALIFICATION, "AQA"), false);
});

test("generation payloads send curriculum_mode for Biology only", () => {
  const base = {
    examBoard: "AQA",
    numberOfQuestions: 5,
    topicId: "3",
    subtopicId: "4",
    subcategoryId: "",
  };

  const biology = buildGenerationPayload({
    ...base,
    qualification: ALEVEL_QUALIFICATION,
    curriculumMode: "shared",
  });
  assert.equal(biology.curriculum_mode, "shared");
  assert.equal(biology.qualification, "ALEVEL_BIOLOGY");
  assert.equal(biology.topic_id, 3);
  assert.equal(biology.subtopic_id, 4);
  assert.equal("subcategory_id" in biology, false);

  const chemistry = buildGenerationPayload({
    ...base,
    qualification: ALEVEL_CHEMISTRY_QUALIFICATION,
    curriculumMode: "shared",
  });
  assert.equal(chemistry.qualification, "ALEVEL_CHEMISTRY");
  assert.equal("curriculum_mode" in chemistry, false);
  assert.equal("question_type" in chemistry, false);

  const physics = buildGenerationPayload({
    ...base,
    qualification: ALEVEL_PHYSICS_QUALIFICATION,
    curriculumMode: "shared",
  });
  assert.equal(physics.qualification, "ALEVEL_PHYSICS");
  assert.equal("curriculum_mode" in physics, false);
});

test("Edexcel generation includes the specification for every A-level subject", () => {
  for (const qualification of [
    ALEVEL_QUALIFICATION,
    ALEVEL_CHEMISTRY_QUALIFICATION,
    ALEVEL_PHYSICS_QUALIFICATION,
  ]) {
    const payload = buildGenerationPayload({
      qualification,
      examBoard: "EDEXCEL",
      numberOfQuestions: 1,
      topicId: 1,
      specification: "Spec A",
      curriculumMode: "shared",
    });
    assert.equal(payload.specification, "Spec A");
  }

  const aqa = buildGenerationPayload({
    qualification: ALEVEL_CHEMISTRY_QUALIFICATION,
    examBoard: "AQA",
    numberOfQuestions: 1,
    topicId: 1,
    specification: "Spec A",
  });
  assert.equal("specification" in aqa, false);
});

test("Biology essay payload keeps its shape", () => {
  const payload = buildGenerationPayload({
    qualification: ALEVEL_QUALIFICATION,
    examBoard: "AQA",
    numberOfQuestions: 5,
    isEssayMode: true,
    curriculumMode: "shared",
  });

  assert.equal(payload.question_type, "ESSAY_25_MARK");
  assert.equal(payload.number_of_questions, 1);
  assert.equal("topic_id" in payload, false);
  assert.equal("curriculum_mode" in payload, false);
});

test("GCSE generation payload is unchanged", () => {
  const payload = buildGenerationPayload({
    qualification: GCSE_QUALIFICATION,
    examBoard: "AQA",
    numberOfQuestions: 3,
    topicId: 9,
    gcseSubject: "CHEMISTRY",
    gcseTier: "HIGHER",
  });

  assert.deepEqual(payload, {
    qualification: "GCSE_SCIENCE",
    exam_board: "AQA",
    number_of_questions: 3,
    topic_id: 9,
    subject: "CHEMISTRY",
    tier: "HIGHER",
  });
});

test("marking payloads qualify each subject correctly", () => {
  const answers = [{ question: "q", mark_scheme: ["a"], user_answer: "x" }];

  assert.deepEqual(
    buildBatchMarkingPayload({
      qualification: ALEVEL_CHEMISTRY_QUALIFICATION,
      examBoard: "OCR",
      answers,
      specification: "Spec A",
    }),
    { qualification: "ALEVEL_CHEMISTRY", exam_board: "OCR", answers },
  );

  assert.deepEqual(
    buildBatchMarkingPayload({
      qualification: ALEVEL_PHYSICS_QUALIFICATION,
      examBoard: "EDEXCEL",
      answers,
      specification: "Spec B",
    }),
    {
      qualification: "ALEVEL_PHYSICS",
      exam_board: "EDEXCEL",
      answers,
      specification: "Spec B",
    },
  );

  assert.equal(
    buildBatchMarkingPayload({
      qualification: ALEVEL_QUALIFICATION,
      examBoard: "EDEXCEL",
      answers,
      specification: "Spec A",
    }).specification,
    "Spec A",
  );

  assert.deepEqual(
    buildMarkingScope({
      qualification: GCSE_QUALIFICATION,
      examBoard: "AQA",
      gcseSubject: "PHYSICS",
      gcseTier: "FOUNDATION",
    }),
    { subject: "PHYSICS", tier: "FOUNDATION" },
  );
});

test("historical ALEVEL records stay under Biology", () => {
  assert.equal(normalizeQualification("ALEVEL"), ALEVEL_QUALIFICATION);
  assert.equal(
    getSessionQualification({ qualification: "ALEVEL" }),
    ALEVEL_QUALIFICATION,
  );
  assert.equal(
    getSessionQualification({ level: "A level" }),
    ALEVEL_QUALIFICATION,
  );
  assert.equal(
    getSessionOverviewLevelKey({ qualification: "ALEVEL_BIOLOGY" }),
    "a-level",
  );
});

test("Chemistry and Physics sessions are isolated from Biology", () => {
  assert.equal(
    getSessionOverviewLevelKey({
      qualification: "ALEVEL_CHEMISTRY",
      level: "A level",
    }),
    "a-level-chemistry",
  );
  assert.equal(
    getSessionOverviewLevelKey({ subject: "alevel_physics", level: "A level" }),
    "a-level-physics",
  );
  assert.equal(
    getSessionOverviewLevelKey({ qualification: "GCSE_SCIENCE", subject: "gcse_science" }),
    "gcse",
  );
  assert.equal(getSessionOverviewLevelKey({}), "other");
});

test("overview keys map both ways for all four modules", () => {
  for (const qualification of GENERATION_QUALIFICATIONS) {
    const key = getOverviewLevelKeyForQualification(qualification);
    assert.equal(getQualificationForOverviewLevelKey(key), qualification);
  }
  assert.equal(getOverviewLevelKeyForQualification(ALEVEL_QUALIFICATION), "a-level");
});

test("subject entitlement is per subject, independent of plan_type", () => {
  const chemistryOnly = {
    plan_type: "free",
    unlocked_subjects: ["ALEVEL_CHEMISTRY"],
  };

  assert.equal(
    hasAccessToQualification(chemistryOnly, ALEVEL_CHEMISTRY_QUALIFICATION),
    true,
  );
  assert.equal(
    hasAccessToQualification(chemistryOnly, ALEVEL_PHYSICS_QUALIFICATION),
    false,
  );
  assert.equal(
    hasAccessToQualification(chemistryOnly, ALEVEL_QUALIFICATION),
    false,
  );
});
