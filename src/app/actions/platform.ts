"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, requireUser } from "@/lib/auth";
import { calculateVark, confidenceFromAnswer, difficultTopicsFromAnswer } from "@/lib/vark";
import { scoreQuiz, surveyAnswersError, updateMaterialProgress } from "@/lib/workflows";
import { generateMaterialRepresentations, generateQuizDraft, generateUnitPlan, studentTutorReply, teachingReply } from "@/lib/ai";
import type { ActionState } from "@/app/actions/auth";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export async function createClassAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ name: z.string().trim().min(2).max(80), subject: z.string().trim().min(2).max(80), gradeLevel: z.string().trim().min(1).max(24) }).safeParse({
    name: formData.get("name"), subject: formData.get("subject"), gradeLevel: formData.get("gradeLevel"),
  });
  if (!parsed.success) return { error: "Add a class name, subject, and grade." };
  const code = randomBytes(4).toString("hex").toUpperCase();
  await db.classroom.create({ data: { ...parsed.data, joinCode: code, teacherId: teacher.id } });
  await logAudit(teacher.id, "CLASS_CREATED", "Classroom", code);
  return { success: `Class created. Share join code ${code} with your students.` };
}

export async function joinClassAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireUser("STUDENT");
  const code = z.string().trim().min(4).max(24).safeParse(formData.get("joinCode"));
  if (!code.success) return { error: "Enter the class code from your teacher." };
  const classroom = await db.classroom.findUnique({ where: { joinCode: code.data.toUpperCase() } });
  if (!classroom) return { error: "We couldn't find that code. Check it with your teacher." };
  if (classroom.schoolId && classroom.schoolId !== student.schoolId) return { error: "That class code belongs to a different school. Ask your teacher to check your account setup." };
  await db.enrollment.upsert({ where: { studentId_classroomId: { studentId: student.id, classroomId: classroom.id } }, update: {}, create: { studentId: student.id, classroomId: classroom.id } });
  await logAudit(student.id, "CLASS_JOINED", "Classroom", classroom.id);
  return { success: `You're in ${classroom.name}.` };
}

export async function saveSurveyAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireUser("STUDENT");
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("answers") || "{}")); } catch { return { error: "Your answers could not be read. Please try again." }; }
  const parsed = z.record(z.string(), z.union([z.string(), z.array(z.string())])).safeParse(raw);
  if (!parsed.success) return { error: "Please check your answers and try again." };
  const answers = parsed.data;
  const answersError = surveyAnswersError(answers);
  if (answersError) return { error: answersError };
  const classroomIds = await db.enrollment.findMany({ where: { studentId: student.id }, select: { classroomId: true } });
  const profile = calculateVark(answers);
  const confidence = confidenceFromAnswer(answers.confidence);
  const difficultTopics = difficultTopicsFromAnswer(answers["hard-topics"]);
  await db.$transaction([
    db.surveyResponse.create({ data: { studentId: student.id, classroomId: classroomIds[0]?.classroomId, answers: answers as Prisma.InputJsonValue, confidence, difficultTopics: difficultTopics as Prisma.InputJsonValue } }),
    db.learningProfile.upsert({
      where: { studentId: student.id },
      update: { ...profile, confidence, difficultTopics: difficultTopics as Prisma.InputJsonValue, strategies: buildStrategies(profile) as Prisma.InputJsonValue },
      create: { studentId: student.id, ...profile, confidence, difficultTopics: difficultTopics as Prisma.InputJsonValue, strategies: buildStrategies(profile) as Prisma.InputJsonValue },
    }),
  ]);
  await logAudit(student.id, "SURVEY_COMPLETED", "LearningProfile", student.id);
  redirect("/student/survey?result=1");
}

function buildStrategies(scores: ReturnType<typeof calculateVark>) {
  const descriptions: Record<keyof typeof scores, string> = {
    visual: "Try a diagram or worked example, then explain it in your own words.",
    aural: "Talk through the idea or listen to an explanation, then try a practice question.",
    readWrite: "Read the key ideas and make a short summary or vocabulary list.",
    kinesthetic: "Work through a real example or hands-on practice, then reflect on the steps.",
  };
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => descriptions[key as keyof typeof scores]);
}

async function anonymousClassSnapshot(classroomId: string) {
  const enrollments = await db.enrollment.findMany({ where: { classroomId }, select: { student: { select: { profile: { select: { visual: true, aural: true, readWrite: true, kinesthetic: true, difficultTopics: true } } } } } });
  const totals = { visual: 0, aural: 0, readWrite: 0, kinesthetic: 0 };
  const topics = new Map<string, number>();
  let profiled = 0;
  for (const enrollment of enrollments) {
    const profile = enrollment.student.profile;
    if (!profile) continue;
    profiled += 1; totals.visual += profile.visual; totals.aural += profile.aural; totals.readWrite += profile.readWrite; totals.kinesthetic += profile.kinesthetic;
    const difficulty = Array.isArray(profile.difficultTopics) ? profile.difficultTopics : [];
    for (const raw of difficulty) if (typeof raw === "string") topics.set(raw, (topics.get(raw) || 0) + 1);
  }
  const attempts = await db.quizAttempt.findMany({ where: { quiz: { classroomId } }, select: { score: true, total: true } });
  const average = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.total ? attempt.score / attempt.total : 0), 0) / attempts.length * 100) : null;
  const commonTopics = [...topics.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([topic,count])=>topic+" ("+count+")");
  return "Class size: "+enrollments.length+". Learning preference responses: "+profiled+". Aggregate VARK selections: visual "+totals.visual+", aural "+totals.aural+", read/write "+totals.readWrite+", hands-on "+totals.kinesthetic+". Frequently reported practice topics: "+(commonTopics.join(", ") || "not enough responses yet")+". Average recorded quiz score: "+(average === null ? "no quiz attempts yet" : average+"% across "+attempts.length+" attempts")+". These are class-wide patterns, not fixed labels or judgements about individual students.";
}

export async function generateUnitAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ classroomId: z.string().min(1), topic: z.string().trim().min(3).max(120), objectives: z.string().trim().max(800).optional(), curriculum: z.string().trim().max(6000).optional(), documentId: z.string().optional() }).safeParse({
    classroomId: formData.get("classroomId"), topic: formData.get("topic"), objectives: formData.get("objectives") || undefined, curriculum: formData.get("curriculum") || undefined, documentId: formData.get("documentId") || undefined,
  });
  if (!parsed.success) return { error: "Choose a class and add a topic (at least 3 characters)." };
  const classroom = await db.classroom.findFirst({ where: { id: parsed.data.classroomId, teacherId: teacher.id } });
  if (!classroom) return { error: "That class isn't in your account." };
  try {
    const document = parsed.data.documentId ? await db.curriculumDocument.findFirst({ where: { id: parsed.data.documentId, teacherId: teacher.id, OR: [{ classroomId: classroom.id }, { classroomId: null }] } }) : null;
    if (parsed.data.documentId && !document) return { error: "Choose a curriculum document that belongs to you and this class." };
    const curriculum = [document?.content, parsed.data.curriculum].filter(Boolean).join("\n\n");
    const studentContext = await anonymousClassSnapshot(classroom.id);
    const { plan, demo } = await generateUnitPlan({ subject: classroom.subject, grade: classroom.gradeLevel, topic: parsed.data.topic, objectives: parsed.data.objectives, curriculum, studentContext });
    const unit = await db.unit.create({
      data: {
        teacherId: teacher.id, classroomId: classroom.id, title: `${parsed.data.topic} unit`, subject: classroom.subject,
        gradeLevel: classroom.gradeLevel, description: plan.description, objectives: plan.objectives as Prisma.InputJsonValue, status: "DRAFT",
        lessons: { create: plan.lessons.map((lesson, index) => ({
          teacherId: teacher.id, classroomId: classroom.id, sequence: index + 1, title: lesson.title, objective: lesson.objective,
          introduction: lesson.introduction, activities: lesson.activities as Prisma.InputJsonValue, assessment: lesson.assessment, duration: lesson.duration, status: "DRAFT",
        })) },
      },
    });
    await logAudit(teacher.id, demo ? "AI_PLAN_DEMO_DRAFTED" : "AI_PLAN_DRAFTED", "Unit", unit.id);
    return { success: `Draft saved with ${plan.lessons.length} lessons${demo ? " (demo co-planner)" : ""}. Review it below before publishing.` };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function editUnitAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ unitId: z.string().min(1), description: z.string().trim().min(10).max(700), objectives: z.string().trim().min(10).max(1200) }).safeParse({ unitId: formData.get("unitId"), description: formData.get("description"), objectives: formData.get("objectives") });
  if (!parsed.success) return { error: "Add a longer unit description and at least two objectives." };
  const unit = await db.unit.findFirst({ where: { id: parsed.data.unitId, teacherId: teacher.id, status: "DRAFT" } });
  if (!unit) return { error: "Only your draft units can be edited." };
  const objectives = parsed.data.objectives.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 8);
  if (objectives.length < 2) return { error: "Add at least two learning objectives, one per line." };
  await db.unit.update({ where: { id: unit.id }, data: { description: parsed.data.description, objectives: objectives as Prisma.InputJsonValue } });
  await logAudit(teacher.id, "UNIT_DRAFT_EDITED", "Unit", unit.id);
  return { success: "Draft updated. Review it before publishing." };
}

export async function editLessonAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ lessonId: z.string().min(1), title: z.string().trim().min(3).max(100), objective: z.string().trim().min(5).max(220), introduction: z.string().trim().min(5).max(500), activities: z.string().trim().min(10).max(1000), assessment: z.string().trim().min(5).max(250) }).safeParse({
    lessonId: formData.get("lessonId"), title: formData.get("title"), objective: formData.get("objective"), introduction: formData.get("introduction"), activities: formData.get("activities"), assessment: formData.get("assessment"),
  });
  if (!parsed.success) return { error: "Check the title, objective, activities, and assessment." };
  const lesson = await db.lesson.findFirst({ where: { id: parsed.data.lessonId, teacherId: teacher.id, status: "DRAFT", unit: { status: "DRAFT" } } });
  if (!lesson) return { error: "Only your private draft lessons can be edited." };
  const activities = parsed.data.activities.split("\n").map((line)=>line.trim()).filter(Boolean).slice(0, 8);
  if (activities.length < 2) return { error: "Add at least two lesson activities, one per line." };
  await db.lesson.update({ where: { id: lesson.id }, data: { title: parsed.data.title, objective: parsed.data.objective, introduction: parsed.data.introduction, activities: activities as Prisma.InputJsonValue, assessment: parsed.data.assessment } });
  await logAudit(teacher.id, "LESSON_DRAFT_EDITED", "Lesson", lesson.id);
  return { success: "Lesson updated." };
}

export async function regenerateLessonAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const lessonId = String(formData.get("lessonId") || "");
  const lesson = await db.lesson.findFirst({ where: { id: lessonId, teacherId: teacher.id, status: "DRAFT", unit: { status: "DRAFT" } }, include: { classroom: true } });
  if (!lesson) return { error: "Only your private draft lessons can be regenerated." };
  try {
    const studentContext = await anonymousClassSnapshot(lesson.classroomId);
    const changeRequest = z.string().trim().max(800).optional().safeParse(formData.get("changeRequest") || undefined);
    if (!changeRequest.success) return { error: "Keep the requested change under 800 characters." };
    const { plan } = await generateUnitPlan({ subject: lesson.classroom.subject, grade: lesson.classroom.gradeLevel, topic: lesson.title, objectives: lesson.objective, curriculum: lesson.introduction, studentContext, revisionRequest: changeRequest.data });
    const refreshed = plan.lessons[0];
    await db.lesson.update({ where: { id: lesson.id }, data: { objective: refreshed.objective, introduction: refreshed.introduction, activities: refreshed.activities as Prisma.InputJsonValue, assessment: refreshed.assessment, duration: refreshed.duration } });
    await logAudit(teacher.id, "LESSON_SECTION_REGENERATED", "Lesson", lesson.id);
    return { success: `Refreshed this draft lesson${process.env.AI_EXTERNAL_PROCESSING_ENABLED === "true" && process.env.OPENAI_API_KEY ? " with AI" : " with the local demo co-planner"}. Review before publishing.` };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function saveCurriculumDocumentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const titleInput = z.string().trim().max(120).safeParse(formData.get("title") || "");
  const classroomId = String(formData.get("classroomId") || "");
  const classroom = classroomId ? await db.classroom.findFirst({ where: { id: classroomId, teacherId: teacher.id } }) : null;
  if (classroomId && !classroom) return { error: "Choose one of your classes." };
  const file = formData.get("file");
  let content = String(formData.get("content") || "").trim();
  let fileName: string | null = null;
  let sourceType = "text";
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { error: "Files must be 5 MB or smaller." };
    fileName = file.name.slice(0, 180);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "txt" || extension === "md") {
      content = (await file.text()).trim();
      sourceType = extension;
    } else if (extension === "pdf" || file.type === "application/pdf") {
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
        try { content = (await parser.getText()).text.trim(); } finally { await parser.destroy(); }
        sourceType = "pdf";
      } catch { return { error: "We couldn't read that PDF. Try a text PDF or paste the lesson notes instead." }; }
    } else return { error: "Upload a PDF, TXT, or Markdown file." };
  }
  if (content.length < 20) return { error: "Add at least 20 characters of curriculum text or upload a supported file." };
  const document = await db.curriculumDocument.create({ data: { teacherId: teacher.id, classroomId: classroom?.id, title: titleInput.data || fileName || "Curriculum notes", fileName, sourceType, content: content.slice(0, 30000) } });
  await logAudit(teacher.id, "CURRICULUM_DOCUMENT_SAVED", "CurriculumDocument", document.id);
  return { success: `Saved “${document.title}”. Use it as context for a unit draft.` };
}

export async function approveUnitAction(formData: FormData) {
  const teacher = await requireUser("TEACHER");
  const unitId = String(formData.get("unitId") || "");
  const unit = await db.unit.findFirst({ where: { id: unitId, teacherId: teacher.id }, include: { lessons: true, classroom: true } });
  if (!unit) redirect("/teacher/planner?error=unit");
  await db.$transaction(async (tx) => {
    await tx.unit.update({ where: { id: unit.id }, data: { status: "PUBLISHED" } });
    for (const lesson of unit.lessons) {
      await tx.lesson.update({ where: { id: lesson.id }, data: { status: "PUBLISHED" } });
      await tx.studyMaterial.create({
        data: {
          teacherId: teacher.id, classroomId: unit.classroomId, lessonId: lesson.id, title: lesson.title,
          coreContent: `${lesson.objective}\n\n${lesson.introduction}\n\n${(lesson.activities as string[]).map((activity, index) => `${index + 1}. ${activity}`).join("\n")}\n\nCheck your learning: ${lesson.assessment}`,
          representations: { visual: `Draw or label a model for: ${lesson.objective}`, aural: `Talk through: ${lesson.objective}`, readWrite: `Write a short summary of: ${lesson.objective}`, kinesthetic: `Try an example related to: ${lesson.objective}` },
          status: "PUBLISHED",
        },
      }).then(async (material) => tx.assignment.create({
        data: { teacherId: teacher.id, classroomId: unit.classroomId, materialId: material.id, title: material.title, instructions: "Explore the lesson in the way that helps you today." },
      }));
    }
  });
  await logAudit(teacher.id, "UNIT_APPROVED_AND_ASSIGNED", "Unit", unit.id);
  redirect(`/teacher/planner?published=${encodeURIComponent(unit.title)}`);
}

export async function createMaterialAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ classroomId: z.string().min(1), title: z.string().trim().min(3).max(120), content: z.string().trim().min(20).max(12000), kind: z.enum(["STUDY_GUIDE", "NOTES", "PRACTICE", "FLASHCARDS"]) }).safeParse({
    classroomId: formData.get("classroomId"), title: formData.get("title"), content: formData.get("content"), kind: formData.get("kind"),
  });
  if (!parsed.success) return { error: "Choose a class, add a title, and include at least 20 characters." };
  const classroom = await db.classroom.findFirst({ where: { id: parsed.data.classroomId, teacherId: teacher.id } });
  if (!classroom) return { error: "That class isn't in your account." };
  const content = parsed.data.content;
  let formats: Awaited<ReturnType<typeof generateMaterialRepresentations>>;
  try { formats = await generateMaterialRepresentations(parsed.data.title, content); }
  catch (error) { return { error: errorMessage(error) }; }
  const material = await db.studyMaterial.create({ data: {
    teacherId: teacher.id, classroomId: classroom.id, title: parsed.data.title, kind: parsed.data.kind,
    coreContent: content,
    representations: formats.representations as Prisma.InputJsonValue,
  } });
  await logAudit(teacher.id, "MATERIAL_DRAFT_CREATED", "StudyMaterial", material.id);
  return { success: `Study material saved as a draft${formats.demo ? " with local sample formats" : " with AI formats"}. Review it, then assign it to your class.` };
}

export async function editMaterialAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ materialId: z.string().min(1), title: z.string().trim().min(3).max(120), content: z.string().trim().min(20).max(12000) }).safeParse({ materialId: formData.get("materialId"), title: formData.get("title"), content: formData.get("content") });
  if (!parsed.success) return { error: "Add a title and at least 20 characters of course content." };
  const material = await db.studyMaterial.findFirst({ where: { id: parsed.data.materialId, teacherId: teacher.id, status: "DRAFT" } });
  if (!material) return { error: "Only your private material drafts can be edited." };
  try {
    const formats = await generateMaterialRepresentations(parsed.data.title, parsed.data.content);
    await db.studyMaterial.update({ where: { id: material.id }, data: { title: parsed.data.title, coreContent: parsed.data.content, representations: formats.representations as Prisma.InputJsonValue } });
    await logAudit(teacher.id, "MATERIAL_DRAFT_EDITED", "StudyMaterial", material.id);
    return { success: "Material updated. Preview it before assigning." };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function assignMaterialAction(formData: FormData) {
  const teacher = await requireUser("TEACHER");
  const materialId = String(formData.get("materialId") || "");
  const material = await db.studyMaterial.findFirst({ where: { id: materialId, teacherId: teacher.id, status: "DRAFT" } });
  if (!material) redirect("/teacher/library?error=material");
  await db.$transaction([
    db.studyMaterial.update({ where: { id: material.id }, data: { status: "PUBLISHED" } }),
    db.assignment.create({ data: { teacherId: teacher.id, classroomId: material.classroomId, materialId: material.id, title: material.title, instructions: "Choose a format to explore, then mark the activity complete when you're ready." } }),
  ]);
  await logAudit(teacher.id, "MATERIAL_ASSIGNED", "StudyMaterial", material.id);
  redirect("/teacher/library?assigned=1");
}

export async function recordMaterialOpenAction(formData: FormData) {
  const student = await requireUser("STUDENT");
  const materialId = String(formData.get("materialId") || "");
  const permitted = await db.assignment.findFirst({ where: { materialId, classroom: { enrollments: { some: { studentId: student.id } } } }, select: { id: true } });
  if (!permitted) redirect("/student/materials?error=notfound");
  const previous = await db.studyMaterialProgress.findUnique({ where: { studentId_materialId: { studentId: student.id, materialId } } });
  const progress = updateMaterialProgress(previous, "OPENED");
  await db.studyMaterialProgress.upsert({ where: { studentId_materialId: { studentId: student.id, materialId } }, update: progress, create: { studentId: student.id, materialId, ...progress } });
  redirect(`/student/materials/${materialId}`);
}

export async function completeMaterialAction(formData: FormData) {
  const student = await requireUser("STUDENT");
  const materialId = String(formData.get("materialId") || "");
  const permitted = await db.assignment.findFirst({ where: { materialId, classroom: { enrollments: { some: { studentId: student.id } } } }, include: { material: { select: { lessonId: true } } } });
  if (!permitted) redirect("/student/materials");
  const previous = await db.studyMaterialProgress.findUnique({ where: { studentId_materialId: { studentId: student.id, materialId } } });
  const progress = updateMaterialProgress(previous, "COMPLETED");
  await db.studyMaterialProgress.upsert({ where: { studentId_materialId: { studentId: student.id, materialId } }, update: progress, create: { studentId: student.id, materialId, ...progress } });
  const lessonId = permitted.material?.lessonId;
  if (lessonId) {
    await db.studentProgress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
      update: { status: "COMPLETED", completion: 100 },
      create: { studentId: student.id, lessonId, status: "COMPLETED", completion: 100 },
    });
  }
  await logAudit(student.id, "MATERIAL_MARKED_COMPLETE", "StudyMaterial", materialId);
  redirect(`/student/materials/${materialId}?complete=1`);
}

export async function teacherAssistantAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ prompt: z.string().trim().min(5).max(1600), classroomId: z.string().min(1) }).safeParse({ prompt: formData.get("prompt"), classroomId: formData.get("classroomId") });
  if (!parsed.success) return { error: "Choose a class and ask a question (at least 5 characters)." };
  const classroom = await db.classroom.findFirst({ where: { id: parsed.data.classroomId, teacherId: teacher.id }, include: { documents: { take: 5, orderBy: { createdAt: "desc" } }, units: { take: 5, orderBy: { updatedAt: "desc" }, include: { lessons: true } } } });
  if (!classroom) return { error: "That class isn't in your account." };
  const studentContext = await anonymousClassSnapshot(classroom.id);
  const context = [...classroom.documents.map((doc) => doc.content), ...classroom.units.flatMap((unit) => [`${unit.title}: ${unit.description}`, ...unit.lessons.map((lesson) => `${lesson.title}: ${lesson.objective}`)]), studentContext].join("\n");
  try {
    const result = await teachingReply(parsed.data.prompt, context);
    const conversation = await db.aIConversation.create({ data: { userId: teacher.id, classroomId: classroom.id, title: parsed.data.prompt.slice(0, 80), isDemoMode: result.demo, messages: [{ role: "user", content: parsed.data.prompt }, { role: "assistant", content: result.reply }] } });
    await logAudit(teacher.id, result.demo ? "AI_CO_PLANNER_DEMO_USED" : "AI_CO_PLANNER_USED", "AIConversation", conversation.id);
    return { success: `${result.demo ? "Demo co-planner" : "AI co-planner"}:\n${result.reply}` };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function createQuizAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ classroomId: z.string().min(1), title: z.string().trim().min(3).max(120), content: z.string().trim().min(20).max(7000) }).safeParse({ classroomId: formData.get("classroomId"), title: formData.get("title"), content: formData.get("content") });
  if (!parsed.success) return { error: "Choose a class, name the quiz, and add at least 20 characters of course content." };
  const classroom = await db.classroom.findFirst({ where: { id: parsed.data.classroomId, teacherId: teacher.id } });
  if (!classroom) return { error: "That class isn't in your account." };
  try {
    const draft = await generateQuizDraft(parsed.data.title, parsed.data.content);
    const quiz = await db.quiz.create({ data: { teacherId: teacher.id, classroomId: classroom.id, title: parsed.data.title, questions: draft.questions as Prisma.InputJsonValue, published: false } });
    await logAudit(teacher.id, draft.demo ? "QUIZ_DRAFT_DEMO_GENERATED" : "QUIZ_DRAFT_GENERATED", "Quiz", quiz.id);
    return { success: `Saved ${draft.questions.length} questions as a private draft${draft.demo ? " (local sample questions)" : ""}. Review before publishing.` };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function editQuizAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("TEACHER");
  const parsed = z.object({ quizId: z.string().min(1), title: z.string().trim().min(3).max(120), questions: z.string().min(20).max(10000) }).safeParse({ quizId: formData.get("quizId"), title: formData.get("title"), questions: formData.get("questions") });
  if (!parsed.success) return { error: "Check the quiz title and question draft." };
  let questions: unknown;
  try { questions = JSON.parse(parsed.data.questions); } catch { return { error: "The question data needs valid JSON." }; }
  const parsedQuestions = z.array(z.object({ prompt: z.string().min(8).max(300), options: z.array(z.string().min(1).max(180)).length(4), answer: z.number().int().min(0).max(3), explanation: z.string().min(5).max(350) })).min(3).max(5).safeParse(questions);
  if (!parsedQuestions.success) return { error: "Add 3–5 questions with four options, one answer index (0–3), and an explanation." };
  const quiz = await db.quiz.findFirst({ where: { id: parsed.data.quizId, teacherId: teacher.id, published: false } });
  if (!quiz) return { error: "Only your private quiz drafts can be edited." };
  await db.quiz.update({ where: { id: quiz.id }, data: { title: parsed.data.title, questions: parsedQuestions.data as Prisma.InputJsonValue } });
  await logAudit(teacher.id, "QUIZ_DRAFT_EDITED", "Quiz", quiz.id);
  return { success: "Quiz draft updated." };
}

export async function approveQuizAction(formData: FormData) {
  const teacher = await requireUser("TEACHER");
  const quizId = String(formData.get("quizId") || "");
  const quiz = await db.quiz.findFirst({ where: { id: quizId, teacherId: teacher.id, published: false } });
  if (!quiz) redirect("/teacher/quizzes?error=quiz");
  await db.quiz.update({ where: { id: quiz.id }, data: { published: true } });
  await logAudit(teacher.id, "QUIZ_APPROVED_AND_PUBLISHED", "Quiz", quiz.id);
  redirect("/teacher/quizzes?published=1");
}

export async function studentTutorAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireUser("STUDENT");
  const parsed = z.object({ prompt: z.string().trim().min(2).max(1000), materialId: z.string().optional() }).safeParse({ prompt: formData.get("prompt"), materialId: formData.get("materialId") || undefined });
  if (!parsed.success) return { error: "Ask a short question about your classwork." };
  let content = "";
  if (parsed.data.materialId) {
    const material = await db.studyMaterial.findFirst({ where: { id: parsed.data.materialId, status: "PUBLISHED", assignments: { some: { classroom: { enrollments: { some: { studentId: student.id } } } } } } });
    if (!material) return { error: "Choose a study material from one of your classes." };
    content = material.coreContent;
  } else {
    content = "No class material selected. Ask a general study question and check answers with your teacher.";
  }
  try {
    const result = await studentTutorReply(parsed.data.prompt, content, student.guardianConsent);
    const prior = await db.aIConversation.findFirst({ where: { userId: student.id, title: "Study tutor" }, orderBy: { updatedAt: "desc" } });
    const nextMessages = [...(Array.isArray(prior?.messages) ? prior.messages as unknown[] : []), { role: "user", content: parsed.data.prompt }, { role: "assistant", content: result.reply }].slice(-20);
    await db.aIConversation.upsert({
      where: { id: prior?.id ?? "new" },
      update: { messages: nextMessages as Prisma.InputJsonValue, isDemoMode: result.demo },
      create: { userId: student.id, title: "Study tutor", messages: nextMessages as Prisma.InputJsonValue, isDemoMode: result.demo },
    });
    return { success: `${result.demo ? "Study tutor demo" : "Study tutor"}:\n${result.reply}` };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function submitQuizAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireUser("STUDENT");
  const quizId = String(formData.get("quizId") || "");
  const quiz = await db.quiz.findFirst({ where: { id: quizId, published: true, classroom: { enrollments: { some: { studentId: student.id } } } } });
  if (!quiz || !Array.isArray(quiz.questions)) return { error: "That quiz isn't assigned to one of your classes." };
  const questions = quiz.questions as Array<{ prompt: string; options: string[]; answer: number; explanation?: string }>;
  const responses = questions.map((_, index) => Number(formData.get(`answer-${index}`)));
  const result = scoreQuiz(questions, responses);
  if (!result.valid) return { error: "Answer every question before you submit." };
  const score = result.score;
  await db.$transaction([
    db.quizAttempt.create({ data: { studentId: student.id, quizId: quiz.id, responses: responses as Prisma.InputJsonValue, score, total: questions.length } }),
    db.auditLog.create({ data: { actorId: student.id, action: "QUIZ_SUBMITTED", targetType: "Quiz", targetId: quiz.id } }),
  ]);
  redirect(`/student/progress?score=${score}&total=${questions.length}`);
}

export async function updateStudentPreferenceAction(formData: FormData) {
  const student = await requireUser("STUDENT");
  const profileId = String(formData.get("profileId") || "");
  const profile = await db.learningProfile.findFirst({ where: { id: profileId, studentId: student.id } });
  if (!profile) redirect("/student/dashboard");
  redirect("/student/survey?updated=1");
}

export async function deleteMyDataAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // This is a soft account closeout: records cascade from the account and cannot be restored from the app.
  await db.user.delete({ where: { id: user.id } });
  redirect("/");
}
