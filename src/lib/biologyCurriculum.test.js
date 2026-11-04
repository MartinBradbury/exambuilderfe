import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBiologyCurriculumRequest,
  fetchBiologyCurriculumMode,
  isBiologyCurriculumModeError,
} from "./biologyCurriculum.js";

const clientReturning = (data) => ({ get: async () => ({ data }) });

describe("fetchBiologyCurriculumMode", () => {
  it("returns the backend mode and calls the mode endpoint", async () => {
    let requestedUrl;
    const client = {
      get: async (url) => {
        requestedUrl = url;
        return { data: { biology_curriculum_mode: "shared" } };
      },
    };

    assert.equal(await fetchBiologyCurriculumMode(client), "shared");
    assert.equal(requestedUrl, "/api/biology-curriculum-mode/");
    assert.equal(
      await fetchBiologyCurriculumMode(
        clientReturning({ biology_curriculum_mode: "legacy" }),
      ),
      "legacy",
    );
  });

  it("rejects unknown or missing modes instead of defaulting", async () => {
    for (const data of [{}, null, { biology_curriculum_mode: "other" }]) {
      await assert.rejects(fetchBiologyCurriculumMode(clientReturning(data)));
    }
  });

  it("propagates request failures", async () => {
    const client = {
      get: async () => {
        throw new Error("network");
      },
    };

    await assert.rejects(fetchBiologyCurriculumMode(client), /network/);
  });
});

describe("buildBiologyCurriculumRequest", () => {
  it("uses legacy endpoints and params unchanged", () => {
    assert.deepEqual(
      buildBiologyCurriculumRequest({
        mode: "legacy",
        level: "topics",
        examBoard: "AQA",
      }),
      { endpoint: "/api/biology-topics/", params: { exam_board: "AQA" } },
    );
    assert.deepEqual(
      buildBiologyCurriculumRequest({
        mode: "legacy",
        level: "subtopics",
        examBoard: "EDEXCEL",
        specification: "Spec A",
        parentId: "4",
      }),
      {
        endpoint: "/api/biology-subtopics/",
        params: { topic_id: "4", exam_board: "EDEXCEL", specification: "Spec A" },
      },
    );
    assert.equal(
      buildBiologyCurriculumRequest({
        mode: "legacy",
        level: "subcategories",
        examBoard: "OCR",
        parentId: "9",
      }).endpoint,
      "/api/biology-subcategories/",
    );
  });

  it("uses shared endpoints with subject and board", () => {
    assert.deepEqual(
      buildBiologyCurriculumRequest({
        mode: "shared",
        level: "topics",
        examBoard: "OCR",
      }),
      {
        endpoint: "/api/alevel-topics/",
        params: { subject: "alevel_biology", exam_board: "OCR" },
      },
    );
    assert.deepEqual(
      buildBiologyCurriculumRequest({
        mode: "shared",
        level: "subtopics",
        examBoard: "EDEXCEL",
        specification: "Spec B",
        parentId: "12",
      }),
      {
        endpoint: "/api/alevel-subtopics/",
        params: {
          topic_id: "12",
          subject: "alevel_biology",
          exam_board: "EDEXCEL",
          specification: "Spec B",
        },
      },
    );
    assert.deepEqual(
      buildBiologyCurriculumRequest({
        mode: "shared",
        level: "subcategories",
        examBoard: "AQA",
        parentId: "30",
      }),
      {
        endpoint: "/api/alevel-subcategories/",
        params: { subtopic_id: "30", subject: "alevel_biology", exam_board: "AQA" },
      },
    );
  });

  it("omits specification for non-Edexcel boards", () => {
    const { params } = buildBiologyCurriculumRequest({
      mode: "shared",
      level: "topics",
      examBoard: "AQA",
      specification: "Spec A",
    });

    assert.equal("specification" in params, false);
  });

  it("throws for an unknown mode", () => {
    assert.throws(() =>
      buildBiologyCurriculumRequest({
        mode: null,
        level: "topics",
        examBoard: "AQA",
      }),
    );
  });
});

describe("isBiologyCurriculumModeError", () => {
  it("detects curriculum mode rejections only", () => {
    const rejection = (status, data) => ({ response: { status, data } });

    assert.equal(
      isBiologyCurriculumModeError(
        rejection(400, { error: "x", biology_curriculum_mode: "shared" }),
      ),
      true,
    );
    assert.equal(
      isBiologyCurriculumModeError(rejection(400, { error: "Missing" })),
      false,
    );
    assert.equal(
      isBiologyCurriculumModeError(
        rejection(403, { biology_curriculum_mode: "shared" }),
      ),
      false,
    );
    assert.equal(isBiologyCurriculumModeError(new Error("x")), false);
  });
});
