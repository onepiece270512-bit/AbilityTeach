import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const demoPassword = "LearnTogether2026!";

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const school = await db.school.upsert({ where: { name: "AbilityTeach Demo School" }, update: {}, create: { name: "AbilityTeach Demo School" } });
  const teacher = await db.user.upsert({ where: { email: "teacher@abilityteach.demo" }, update: { teacherApproved: true, schoolId: school.id, passwordHash }, create: { name: "Jordan Lee", email: "teacher@abilityteach.demo", passwordHash, role: "TEACHER", teacherApproved: true, schoolId: school.id, subject: "Mathematics" } });
  const student = await db.user.upsert({ where: { email: "priya@abilityteach.demo" }, update: { schoolId: school.id, gradeLevel: "Grade 8", passwordHash }, create: { name: "Priya Patel", email: "priya@abilityteach.demo", passwordHash, role: "STUDENT", schoolId: school.id, schoolManaged: true, guardianConsent: true, gradeLevel: "Grade 8" } });
  await db.user.upsert({ where: { email: "admin@abilityteach.demo" }, update: { passwordHash, teacherApproved: true }, create: { name: "School administrator", email: "admin@abilityteach.demo", passwordHash, role: "ADMIN", teacherApproved: true, schoolId: school.id } });

  const classroom = await db.classroom.upsert({ where: { joinCode: "FRACT8A" }, update: { teacherId: teacher.id, schoolId: school.id }, create: { name: "Grade 8 Mathematics", subject: "Mathematics", gradeLevel: "Grade 8", joinCode: "FRACT8A", teacherId: teacher.id, schoolId: school.id } });
  await db.enrollment.upsert({ where: { studentId_classroomId: { studentId: student.id, classroomId: classroom.id } }, update: {}, create: { studentId: student.id, classroomId: classroom.id } });
  await db.learningProfile.upsert({ where: { studentId: student.id }, update: { visual: 2, aural: 2, readWrite: 3, kinesthetic: 3, confidence: 3, difficultTopics: ["maths"], strategies: ["Read the key ideas, then try a worked example.", "Talk through the steps with a partner."] }, create: { studentId: student.id, visual: 2, aural: 2, readWrite: 3, kinesthetic: 3, confidence: 3, difficultTopics: ["maths"], strategies: ["Read the key ideas, then try a worked example.", "Talk through the steps with a partner."] } });

  if (!(await db.surveyResponse.findFirst({ where: { studentId: student.id } }))) {
    await db.surveyResponse.create({ data: { studentId: student.id, classroomId: classroom.id, confidence: 3, difficultTopics: ["maths"], answers: { "new-topic": "readWrite", remember: "kinesthetic", instructions: "readWrite", study: "kinesthetic", show: "aural", stuck: "visual", group: "aural", confidence: "confidence-3", "hard-topics": ["topic-maths"], change: "yes" } } });
  }

  const document = await db.curriculumDocument.findFirst({ where: { teacherId: teacher.id, title: "Fractions curriculum notes" } });
  if (!document) await db.curriculumDocument.create({ data: { teacherId: teacher.id, classroomId: classroom.id, title: "Fractions curriculum notes", sourceType: "text", content: "Students compare fractions, generate equivalent fractions, add and subtract fractions with like and unlike denominators, and apply fraction operations in practical contexts. Emphasize models, number lines, estimation, and explaining reasoning." } });

  let unit = await db.unit.findFirst({ where: { classroomId: classroom.id, title: "Fractions: build confidence" } });
  if (!unit) {
    unit = await db.unit.create({ data: {
      teacherId: teacher.id, classroomId: classroom.id, title: "Fractions: build confidence", subject: "Mathematics", gradeLevel: "Grade 8",
      description: "A six-lesson journey from fraction models to practical problem solving.", objectives: ["Compare and represent fractions", "Add and subtract fractions", "Explain a strategy for a real-world problem"], status: "PUBLISHED",
    } });
  }
  if (!(await db.lesson.findFirst({ where: { unitId: unit.id } }))) {
    const lessonSpecs = [
      ["Understand fractions", "Represent fractions with models and number lines."], ["Equivalent fractions", "Generate and explain equivalent fractions."], ["Add like denominators", "Add fractions with like denominators and estimate the result."], ["Add unlike denominators", "Find a common denominator and add fractions."], ["Subtract fractions", "Subtract fractions and check answers for reasonableness."], ["Fractions in real life", "Choose and explain fraction operations in a practical problem."],
    ];
    for (const [index, [title, objective]] of lessonSpecs.entries()) {
      const lesson = await db.lesson.create({ data: { teacherId: teacher.id, classroomId: classroom.id, unitId: unit.id, title, sequence: index + 1, objective, introduction: `Connect ${title.toLowerCase()} to a familiar situation, then model one example.`, activities: ["See a worked example.", "Talk through the steps.", "Try a short practice problem."], assessment: "Complete one exit question and rate your confidence.", status: "PUBLISHED" } });
      if (index === 3) {
        const material = await db.studyMaterial.create({ data: {
          teacherId: teacher.id, classroomId: classroom.id, lessonId: lesson.id, title: "Adding fractions: choose a practice path", kind: "STUDY_GUIDE", status: "PUBLISHED",
          coreContent: "When denominators are different, rename the fractions with a common denominator.\n\nExample: 1/2 + 1/3. A common denominator is 6. Rename: 1/2 = 3/6 and 1/3 = 2/6. Add: 3/6 + 2/6 = 5/6.\n\nCheck: 5/6 is less than 1, which makes sense because each fraction was less than 1.",
          representations: { visual: "Draw a sixths bar: shade 3/6, then 2/6. Count 5/6.", aural: "Say the steps aloud: find a common denominator, rename, add, check.", readWrite: "Write the worked example in your own words. Add the vocabulary: denominator, equivalent.", kinesthetic: "Use fraction strips or paper folds to build 1/2 and 1/3, then compare the sixths." },
        } });
        await db.assignment.create({ data: { teacherId: teacher.id, classroomId: classroom.id, materialId: material.id, title: material.title, instructions: "Choose the path that helps you today. You can switch at any time." } });
        await db.studentProgress.upsert({ where: { studentId_lessonId: { studentId: student.id, lessonId: lesson.id } }, update: { status: "IN_PROGRESS", completion: 50 }, create: { studentId: student.id, lessonId: lesson.id, status: "IN_PROGRESS", completion: 50 } });
      }
    }
  }

  let quiz = await db.quiz.findFirst({ where: { classroomId: classroom.id, title: "Fraction check-in" } });
  if (!quiz) quiz = await db.quiz.create({ data: {
    teacherId: teacher.id, classroomId: classroom.id, title: "Fraction check-in", published: true,
    questions: [
      { prompt: "What is 1/2 written with denominator 6?", options: ["2/6", "3/6", "4/6"], answer: 1, explanation: "Multiply numerator and denominator by 3." },
      { prompt: "What is 1/3 + 1/6?", options: ["2/9", "1/2", "2/6"], answer: 1, explanation: "Rename 1/3 as 2/6. Then 2/6 + 1/6 = 3/6 = 1/2." },
      { prompt: "Which estimate makes sense for 3/4 + 1/8?", options: ["A little less than 1", "About 1/4", "More than 2"], answer: 0, explanation: "3/4 is close to 1, and 1/8 is small. The sum is 7/8." },
    ],
  } });
  if (!(await db.quizAttempt.findFirst({ where: { studentId: student.id, quizId: quiz.id } }))) {
    await db.quizAttempt.create({ data: { studentId: student.id, quizId: quiz.id, responses: [1, 0, 0], score: 2, total: 3 } });
  }
  await db.integration.upsert({ where: { userId_provider: { userId: teacher.id, provider: "GOOGLE_CLASSROOM" } }, update: { status: "DEMO_ONLY" }, create: { userId: teacher.id, provider: "GOOGLE_CLASSROOM", status: "DEMO_ONLY", metadata: { message: "Integration is a demo placeholder; OAuth credentials are not configured." } } });

  console.log("Seeded AbilityTeach demo school, accounts, class, fractions unit, study material, and quiz.");
  console.log("Demo password for teacher, student, and admin: LearnTogether2026!");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
