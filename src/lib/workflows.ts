import { calculateVark, surveyQuestions, type VarkScores } from "@/lib/vark";

export type SurveyAnswers = Record<string, string | string[]>;

export function surveyAnswersError(answers: SurveyAnswers): string | null {
  for (const question of surveyQuestions) {
    const selected = answers[question.id];
    if (!selected) return "Please answer each question. You can choose ‘I'm still figuring that out’ where shown.";
    const values = Array.isArray(selected) ? selected : [selected];
    const allowed = question.options.map((option) => option.key);
    if (values.some((value) => !allowed.includes(value))) return "One of those answers doesn't match the survey. Please refresh and try again.";
    if (!question.multi && values.length !== 1) return "Choose one answer for each question.";
    if (question.multi && (values.length > 3 || new Set(values).size !== values.length)) return "Please choose up to three different topics.";
  }
  return null;
}

export function teacherCanViewStudent(teacherClassIds: string[], studentClassIds: string[]) {
  const enrolled = new Set(studentClassIds);
  return teacherClassIds.some((classId) => enrolled.has(classId));
}

export function studentCanAccessClass(studentClassIds: string[], requestedClassId: string) {
  return studentClassIds.includes(requestedClassId);
}

export type QuizQuestionForScoring = { options: string[]; answer: number };
export function scoreQuiz(questions: QuizQuestionForScoring[], answers: number[]) {
  const valid = questions.length > 0 && answers.length === questions.length && questions.every((question, index) => Number.isInteger(answers[index]) && answers[index] >= 0 && answers[index] < question.options.length);
  if (!valid) return { valid: false, score: 0, total: questions.length };
  const score = questions.reduce((sum, question, index) => sum + (answers[index] === question.answer ? 1 : 0), 0);
  return { valid: true, score, total: questions.length };
}

export function updateMaterialProgress(previous: { openedAt: Date; completedAt: Date | null } | null, event: "OPENED" | "COMPLETED", now = new Date()) {
  return {
    openedAt: previous?.openedAt ?? now,
    completedAt: event === "COMPLETED" ? now : previous?.completedAt ?? null,
  };
}

export function varkResult(answers: SurveyAnswers): VarkScores {
  return calculateVark(answers);
}
