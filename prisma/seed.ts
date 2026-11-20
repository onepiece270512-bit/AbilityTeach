import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const demoPassword = "LearnTogether2026!";

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const school = await db.school.upsert({ where: { name: "AbilityTeach Demo School" }, update: {}, create: { name: "AbilityTeach Demo School" } });
  const teacher = await db.user.upsert({ where: { email: "teacher@abilityteach.demo" }, update: { teacherApproved: true, schoolId: school.id, passwordHash }, create: { name: "Jordan Lee", email: "teacher@abilityteach.demo", passwordHash, role: "TEACHER", teacherApproved: true, schoolId: school.id, subject: "Mathematics" } });
  const student = await db.user.upsert({ where: { email: "priya@abilityteach.demo" }, update: { schoolId: school.id, gradeLevel: "Grade 9", passwordHash }, create: { name: "Priya Patel", email: "priya@abilityteach.demo", passwordHash, role: "STUDENT", schoolId: school.id, schoolManaged: true, guardianConsent: true, gradeLevel: "Grade 9" } });
  await db.user.upsert({ where: { email: "admin@abilityteach.demo" }, update: { passwordHash, teacherApproved: true }, create: { name: "School administrator", email: "admin@abilityteach.demo", passwordHash, role: "ADMIN", teacherApproved: true, schoolId: school.id } });

  const classroom = await db.classroom.upsert({ where: { joinCode: "FRACT8A" }, update: { teacherId: teacher.id, schoolId: school.id, name: "Grade 9 Mathematics", subject: "Mathematics", gradeLevel: "Grade 9" }, create: { name: "Grade 9 Mathematics", subject: "Mathematics", gradeLevel: "Grade 9", joinCode: "FRACT8A", teacherId: teacher.id, schoolId: school.id } });
  await db.enrollment.upsert({ where: { studentId_classroomId: { studentId: student.id, classroomId: classroom.id } }, update: {}, create: { studentId: student.id, classroomId: classroom.id } });
  await db.learningProfile.upsert({ where: { studentId: student.id }, update: { visual: 2, aural: 2, readWrite: 3, kinesthetic: 3, confidence: 3, difficultTopics: ["maths"], strategies: ["Read the key ideas, then try a worked example.", "Talk through the steps with a partner."] }, create: { studentId: student.id, visual: 2, aural: 2, readWrite: 3, kinesthetic: 3, confidence: 3, difficultTopics: ["maths"], strategies: ["Read the key ideas, then try a worked example.", "Talk through the steps with a partner."] } });

  if (!(await db.surveyResponse.findFirst({ where: { studentId: student.id } }))) {
    await db.surveyResponse.create({ data: { studentId: student.id, classroomId: classroom.id, confidence: 3, difficultTopics: ["maths"], answers: { "new-topic": "readWrite", remember: "kinesthetic", instructions: "readWrite", study: "kinesthetic", show: "aural", stuck: "visual", group: "aural", confidence: "confidence-3", "hard-topics": ["topic-maths"], change: "yes" } } });
  }

  const classmates = [
    { name: "Maya Chen", email: "maya.chen@class.abilityteach.demo", modality: "visual" },
    { name: "Ethan Brooks", email: "ethan.brooks@class.abilityteach.demo", modality: "aural" },
    { name: "Leo Martin", email: "leo.martin@class.abilityteach.demo", modality: "readWrite" },
    { name: "Sofia Rivera", email: "sofia.rivera@class.abilityteach.demo", modality: "kinesthetic" },
    { name: "Avery Wilson", email: "avery.wilson@class.abilityteach.demo", modality: "mixed" },
    { name: "Noah Thompson", email: "noah.thompson@class.abilityteach.demo", modality: "visual" },
    { name: "Emma Davis", email: "emma.davis@class.abilityteach.demo", modality: "aural" },
    { name: "Liam Garcia", email: "liam.garcia@class.abilityteach.demo", modality: "readWrite" },
    { name: "Olivia Kim", email: "olivia.kim@class.abilityteach.demo", modality: "kinesthetic" },
    { name: "Mateo Singh", email: "mateo.singh@class.abilityteach.demo", modality: "visual" },
    { name: "Amira Hassan", email: "amira.hassan@class.abilityteach.demo", modality: "aural" },
    { name: "Lucas Brown", email: "lucas.brown@class.abilityteach.demo", modality: "readWrite" },
    { name: "Zoe Wilson", email: "zoe.wilson@class.abilityteach.demo", modality: "kinesthetic" },
    { name: "Arjun Shah", email: "arjun.shah@class.abilityteach.demo", modality: "visual" },
    { name: "Isabella Moore", email: "isabella.moore@class.abilityteach.demo", modality: "aural" },
    { name: "Jack Taylor", email: "jack.taylor@class.abilityteach.demo", modality: "readWrite" },
    { name: "Ava Patel", email: "ava.patel@class.abilityteach.demo", modality: "kinesthetic" },
    { name: "Mason Clark", email: "mason.clark@class.abilityteach.demo", modality: "visual" },
    { name: "Chloe Nguyen", email: "chloe.nguyen@class.abilityteach.demo", modality: "aural" },
    { name: "Benjamin Scott", email: "benjamin.scott@class.abilityteach.demo", modality: "kinesthetic" },
  ] as const;
  for (const [index, classmate] of classmates.entries()) {
    const privatePassword = randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(privatePassword, 12);
    const classmateUser = await db.user.upsert({
      where: { email: classmate.email },
      update: { schoolId: school.id, gradeLevel: "Grade 9" },
      create: { name: classmate.name, email: classmate.email, passwordHash, role: "STUDENT", schoolId: school.id, schoolManaged: true, gradeLevel: "Grade 9" },
    });
    await db.enrollment.upsert({
      where: { studentId_classroomId: { studentId: classmateUser.id, classroomId: classroom.id } },
      update: {},
      create: { studentId: classmateUser.id, classroomId: classroom.id },
    });
    const keys = classmate.modality === "mixed"
      ? ["visual", "aural", "readWrite", "kinesthetic", "visual", "aural", "readWrite"]
      : Array(7).fill(classmate.modality);
    const answers = {
      "new-topic": keys[0], remember: keys[1], instructions: keys[2], study: keys[3], show: keys[4], stuck: keys[5], group: keys[6],
      confidence: index === 4 ? "confidence-4" : "confidence-3", "hard-topics": ["topic-maths"], change: "yes",
    };
    const scores = { visual: 0, aural: 0, readWrite: 0, kinesthetic: 0 };
    for (const key of keys) scores[key as keyof typeof scores] += 1;
    const strategies = {
      visual: "Try a diagram or worked example, then explain it in your own words.",
      aural: "Talk through the idea or listen to an explanation, then try a practice question.",
      readWrite: "Read the key ideas and make a short summary or vocabulary list.",
      kinesthetic: "Work through a real example or hands-on practice, then reflect on the steps.",
    };
    await db.learningProfile.upsert({
      where: { studentId: classmateUser.id },
      update: { ...scores, confidence: index === 4 ? 4 : 3, difficultTopics: ["maths"], strategies: [strategies[classmate.modality === "mixed" ? "visual" : classmate.modality]] },
      create: { studentId: classmateUser.id, ...scores, confidence: index === 4 ? 4 : 3, difficultTopics: ["maths"], strategies: [strategies[classmate.modality === "mixed" ? "visual" : classmate.modality]] },
    });
    if (!(await db.surveyResponse.findFirst({ where: { studentId: classmateUser.id } }))) {
      await db.surveyResponse.create({ data: { studentId: classmateUser.id, classroomId: classroom.id, confidence: index === 4 ? 4 : 3, difficultTopics: ["maths"], answers } });
    }
  }

  const document = await db.curriculumDocument.findFirst({ where: { teacherId: teacher.id, title: "Grade 9 Algebra curriculum notes" } });
  if (!document) await db.curriculumDocument.create({ data: { teacherId: teacher.id, classroomId: classroom.id, title: "Grade 9 Algebra curriculum notes", sourceType: "text", content: "Students use linear relations, solve two-step equations, compare representations of relationships, and explain how changing a variable affects an equation. Emphasize clear worked examples, graphs, discussion, written reasoning, and practical problems." } });

  let unit = await db.unit.findFirst({ where: { classroomId: classroom.id, title: "Algebra: build confidence" } });
  if (!unit) {
    unit = await db.unit.create({ data: {
      teacherId: teacher.id, classroomId: classroom.id, title: "Algebra: build confidence", subject: "Mathematics", gradeLevel: "Grade 9",
      description: "A six-lesson journey from algebra patterns to practical problem solving.", objectives: ["Represent linear relationships", "Solve two-step equations", "Explain a strategy for a real-world problem"], status: "PUBLISHED",
    } });
  }
  if (!(await db.lesson.findFirst({ where: { unitId: unit.id } }))) {
    const lessonSpecs = [
      ["Explore linear relationships", "Represent a relationship with a table, graph, and rule."], ["Build a rule", "Use a table to find and explain a linear rule."], ["Solve one-step equations", "Use inverse operations to solve one-step equations."], ["Solve two-step equations", "Solve two-step equations and check by substitution."], ["Compare representations", "Connect a graph, table, and equation for the same relationship."], ["Algebra in real life", "Use an equation to represent and solve a practical problem."],
    ];
    for (const [index, [title, objective]] of lessonSpecs.entries()) {
      const lesson = await db.lesson.create({ data: { teacherId: teacher.id, classroomId: classroom.id, unitId: unit.id, title, sequence: index + 1, objective, introduction: `Connect ${title.toLowerCase()} to a familiar situation, then model one example.`, activities: ["See a worked example.", "Talk through the steps.", "Try a short practice problem."], assessment: "Complete one exit question and rate your confidence.", status: "PUBLISHED" } });
      if (index === 3) {
        const material = await db.studyMaterial.create({ data: {
          teacherId: teacher.id, classroomId: classroom.id, lessonId: lesson.id, title: "Two-step equations: choose a practice path", kind: "STUDY_GUIDE", status: "PUBLISHED",
          coreContent: "Use inverse operations to solve an equation.\n\nExample: 3x + 4 = 19. Subtract 4: 3x = 15. Divide by 3: x = 5.\n\nCheck: 3(5) + 4 = 19, so the answer works.",
          representations: { visual: "Draw a balance model: remove 4 from both sides, then split the remaining 15 into 3 equal groups.", aural: "Say the steps aloud: undo addition, undo multiplication, then check your answer.", readWrite: "Write the worked example in your own words. Add the vocabulary: inverse operation, coefficient.", kinesthetic: "Use counters or algebra tiles to model 3 equal groups and a total of 19." },
        } });
        await db.assignment.create({ data: { teacherId: teacher.id, classroomId: classroom.id, materialId: material.id, title: material.title, instructions: "Choose the path that helps you today. You can switch at any time." } });
        await db.studentProgress.upsert({ where: { studentId_lessonId: { studentId: student.id, lessonId: lesson.id } }, update: { status: "IN_PROGRESS", completion: 50 }, create: { studentId: student.id, lessonId: lesson.id, status: "IN_PROGRESS", completion: 50 } });
      }
    }
  }

  let quiz = await db.quiz.findFirst({ where: { classroomId: classroom.id, title: "Equation check-in" } });
  if (!quiz) quiz = await db.quiz.create({ data: {
    teacherId: teacher.id, classroomId: classroom.id, title: "Equation check-in", published: true,
    questions: [
      { prompt: "If 3x = 15, what is x?", options: ["3", "5", "18"], answer: 1, explanation: "Divide both sides by 3." },
      { prompt: "Solve 2x + 5 = 17.", options: ["5", "6", "11"], answer: 1, explanation: "Subtract 5 from both sides, then divide by 2. x = 6." },
      { prompt: "Which value makes 4x - 3 = 13 true?", options: ["2", "4", "7"], answer: 0, explanation: "Substitute 4: 16 - 3 = 13." },
    ],
  } });
  if (!(await db.quizAttempt.findFirst({ where: { studentId: student.id, quizId: quiz.id } }))) {
    await db.quizAttempt.create({ data: { studentId: student.id, quizId: quiz.id, responses: [1, 0, 0], score: 2, total: 3 } });
  }
  await db.integration.upsert({ where: { userId_provider: { userId: teacher.id, provider: "GOOGLE_CLASSROOM" } }, update: { status: "DEMO_ONLY" }, create: { userId: teacher.id, provider: "GOOGLE_CLASSROOM", status: "DEMO_ONLY", metadata: { message: "Integration is a demo placeholder; OAuth credentials are not configured." } } });

  console.log("Seeded AbilityTeach demo school, accounts, class, Grade 9 algebra unit, study material, and quiz.");
  console.log("Demo password for teacher, student, and admin: LearnTogether2026!");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
