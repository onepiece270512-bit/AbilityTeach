import { describe, expect, it } from "vitest";
import { hashToken, newSessionToken, safeEqualText } from "../src/lib/security";
import { scoreQuiz, studentCanAccessClass, surveyAnswersError, teacherCanViewStudent, updateMaterialProgress } from "../src/lib/workflows";
import { surveyQuestions } from "../src/lib/vark";

const validAnswers = Object.fromEntries(surveyQuestions.map((question) => [question.id, question.options[0].key]));

describe("account security helpers", () => {
  it("creates opaque session tokens and stores only a deterministic hash", () => {
    const token = newSessionToken();
    expect(token).not.toBe(newSessionToken());
    expect(token.length).toBeGreaterThan(30);
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });
  it("compares text without accepting different lengths or values", () => {
    expect(safeEqualText("same", "same")).toBe(true);
    expect(safeEqualText("same", "samE")).toBe(false);
    expect(safeEqualText("short", "longer")).toBe(false);
  });
});

describe("student and teacher permissions", () => {
  it("shares a student only through a common class enrollment", () => {
    expect(teacherCanViewStudent(["class-a"], ["class-a", "class-b"])).toBe(true);
    expect(teacherCanViewStudent(["class-a"], ["class-b"])).toBe(false);
  });
  it("allows students to access only joined classes", () => {
    expect(studentCanAccessClass(["class-a", "class-b"], "class-b")).toBe(true);
    expect(studentCanAccessClass(["class-a"], "class-c")).toBe(false);
  });
});

describe("survey completion", () => {
  it("accepts complete, allowed answers and rejects missing or forged answers", () => {
    expect(surveyAnswersError(validAnswers)).toBeNull();
    expect(surveyAnswersError({ ...validAnswers, confidence: undefined as never })).not.toBeNull();
    expect(surveyAnswersError({ ...validAnswers, confidence: "teacher" })).not.toBeNull();
  });
  it("enforces the multiple choice limit", () => {
    expect(surveyAnswersError({ ...validAnswers, "hard-topics": ["topic-maths", "topic-science", "topic-other", "topic-focus"] })).not.toBeNull();
  });
});

describe("lesson and quiz activity", () => {
  it("does not mark a material complete just because it was opened", () => {
    const opened = updateMaterialProgress(null, "OPENED", new Date("2026-01-01T00:00:00Z"));
    expect(opened.completedAt).toBeNull();
    const completed = updateMaterialProgress(opened, "COMPLETED", new Date("2026-01-02T00:00:00Z"));
    expect(completed.openedAt).toEqual(opened.openedAt);
    expect(completed.completedAt).not.toBeNull();
  });
  it("scores valid quiz answers and rejects missing or out-of-range choices", () => {
    const questions = [{ options: ["A", "B", "C"], answer: 1 }, { options: ["A", "B"], answer: 0 }];
    expect(scoreQuiz(questions, [1, 0])).toEqual({ valid: true, score: 2, total: 2 });
    expect(scoreQuiz(questions, [1])).toMatchObject({ valid: false });
    expect(scoreQuiz(questions, [1, 2])).toMatchObject({ valid: false });
  });
});
