import "server-only";
import { z } from "zod";

export const unitPlanSchema = z.object({
  description: z.string().min(10).max(500),
  objectives: z.array(z.string().min(5).max(180)).min(2).max(5),
  lessons: z.array(z.object({
    title: z.string().min(3).max(100),
    objective: z.string().min(5).max(220),
    introduction: z.string().min(5).max(500),
    activities: z.array(z.string().min(5).max(220)).min(2).max(5),
    assessment: z.string().min(5).max(250),
    duration: z.number().int().min(15).max(120),
  })).min(3).max(8),
});

export type UnitPlan = z.infer<typeof unitPlanSchema>;

function demoUnit(subject: string, grade: string, topic: string, studentContext?: string, revisionRequest?: string): UnitPlan {
  const topicTitle = topic.trim().slice(0, 90) || "Our next topic";
  return {
    description: `A flexible ${grade} ${subject} unit to explore ${topicTitle} through clear examples, conversation, reading, and practice.${studentContext ? ` Planned using this anonymous class snapshot: ${studentContext}` : ""}${revisionRequest ? ` Teacher change request: ${revisionRequest}` : ""}`,
    objectives: [
      `Explain the key ideas in ${topicTitle}.`,
      `Use ${topicTitle} to solve a new problem or explain an example.`,
      "Reflect on which strategies helped and choose another way to practise.",
    ],
    lessons: [
      { title: `Meet ${topicTitle}`, objective: `Describe the main idea behind ${topicTitle}.`, introduction: "Start with a familiar example. Ask students what they notice and wonder.", activities: ["Look at a worked example and mark what stands out.", "Turn and talk: explain the idea in your own words.", "Write or draw one question you still have."], assessment: "Exit note: one thing I understand and one question I have.", duration: 45 },
      { title: "Make sense of the parts", objective: `Identify the important parts of ${topicTitle}.`, introduction: "Connect yesterday's question to today's example.", activities: ["Sort examples and non-examples.", "Build a labelled diagram or step list.", "Explain one choice to a partner."], assessment: "Quick sort with a one-sentence explanation.", duration: 45 },
      { title: "Try a new example", objective: `Apply ${topicTitle} to a new example.`, introduction: "Model one problem, including a mistake and how to fix it.", activities: ["Solve one problem together.", "Choose a written, visual, or hands-on practice path.", "Compare strategies with a classmate."], assessment: "Teacher checks a practice response and gives one next step.", duration: 50 },
      { title: "Practise and explain", objective: `Use key vocabulary to explain ${topicTitle}.`, introduction: "Review the words students need, with examples in context.", activities: ["Match words to examples.", "Create a short explanation for a younger learner.", "Try two practice questions and check your work."], assessment: "Two-question check with confidence rating.", duration: 45 },
      { title: "Use it in context", objective: `Connect ${topicTitle} to a real-world situation.`, introduction: "Explore a practical scenario connected to the topic.", activities: ["Choose a scenario and identify the relevant idea.", "Make a model, written plan, or spoken explanation.", "Share what you would try next."], assessment: "Short applied task with a teacher feedback note.", duration: 50 },
      { title: "Review and reflect", objective: `Show what you know about ${topicTitle} and plan what to practise next.`, introduction: "Revisit the unit questions and notice progress.", activities: ["Complete a short mixed-format practice set.", "Pick a question and explain your steps.", "Set a personal next-practice goal."], assessment: "Teacher-reviewed check; use results to plan follow-up.", duration: 45 },
    ],
  };
}

async function askModel(system: string, prompt: string, allowExternal = true) {
  if (!allowExternal || process.env.AI_EXTERNAL_PROCESSING_ENABLED !== "true" || !process.env.OPENAI_API_KEY) return null;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`AI request failed (${response.status}). Try again or use demo mode.`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("The AI returned an empty response. Please try again.");
  return content;
}

export async function generateUnitPlan(input: { subject: string; grade: string; topic: string; objectives?: string; curriculum?: string; studentContext?: string; revisionRequest?: string }) {
  const prompt = [
    `Subject: ${input.subject}`, `Grade: ${input.grade}`, `Topic: ${input.topic}`,
    input.objectives ? `Teacher learning goals: ${input.objectives}` : "",
    input.curriculum ? `Curriculum excerpt: ${input.curriculum.slice(0, 6000)}` : "",
    input.studentContext ? `Anonymous class learning and progress snapshot: ${input.studentContext}` : "",
    input.revisionRequest ? `Teacher requested change: ${input.revisionRequest}` : "",
    "Create a 6-lesson unit. Use varied teaching activities so every student can access the same learning goals. Do not assign fixed learner types. Return JSON with description, objectives (array), and lessons (array of title, objective, introduction, activities array, assessment, duration).",
  ].filter(Boolean).join("\n");
  const raw = await askModel(
    "You are a careful teacher co-planner. Use clear, age-appropriate language. Keep the curriculum goals central. Never infer disability, intelligence, or fixed ability. Do not include identifiable student information. Return only valid JSON.",
    prompt,
  );
  if (!raw) return { plan: demoUnit(input.subject, input.grade, input.topic, input.studentContext, input.revisionRequest), demo: true };
  return { plan: unitPlanSchema.parse(JSON.parse(raw)), demo: false };
}

export async function generateMaterialRepresentations(title: string, content: string) {
  const responseSchema = z.object({ visual: z.string().min(20).max(3000), aural: z.string().min(20).max(3000), readWrite: z.string().min(20).max(3000), kinesthetic: z.string().min(20).max(3000) });
  const raw = await askModel(
    "You are a curriculum writer. Create four genuinely useful representations of the same teacher-provided learning content: a visual organizer in plain text, a short spoken explanation script, concise reading notes with a key vocabulary word, and a guided hands-on or worked-example activity. Keep every format aligned to the same learning goal. Don't infer student ability or create fixed learner labels. Return JSON with visual, aural, readWrite, and kinesthetic strings.",
    `Material title: ${title}\n\nTeacher-provided content:\n${content.slice(0, 8000)}`,
  );
  if (raw) return { representations: responseSchema.parse(JSON.parse(raw)), demo: false };
  const excerpt = content.trim().slice(0, 1300);
  return {
    demo: true,
    representations: {
      visual: `MAKE A QUICK MAP\n\nMain idea: ${title}\n↓\nKey example or evidence\n↓\nWhat the example helps us understand\n\nUse this teacher-provided content to label the map:\n${excerpt}`,
      aural: `SAY IT OUT LOUD\n\n“Today we're exploring ${title}. The big idea is…”\n\nRead the key information together, then ask: What stands out? What would you explain to a partner?\n\nTeacher-provided notes:\n${excerpt}`,
      readWrite: `KEY NOTES · ${title}\n\nRead the teacher's notes. Underline a key word, write a three-sentence summary, and add one question.\n\n${excerpt}`,
      kinesthetic: `TRY A WORKED EXAMPLE · ${title}\n\n1. Pick one idea from the notes below.\n2. Make a small example, model, or practice question.\n3. Work through it one step at a time.\n4. Check: how does your example connect to the big idea?\n\n${excerpt}`,
    },
  };
}

export async function generateQuizDraft(title: string, content: string) {
  const schema = z.object({ questions: z.array(z.object({ prompt: z.string().min(8).max(300), options: z.array(z.string().min(1).max(180)).length(4), answer: z.number().int().min(0).max(3), explanation: z.string().min(5).max(350) })).min(3).max(5) });
  const raw = await askModel(
    "You write age-appropriate formative practice questions from teacher-provided course material. Questions must test understanding, not trick students. Include exactly four plausible answer choices, one correct answer index, and a short explanation for each. Return JSON {questions:[{prompt,options,answer,explanation}]}.",
    `Quiz title: ${title}\n\nTeacher-provided material:\n${content.slice(0, 6000)}`,
  );
  if (raw) return { questions: schema.parse(JSON.parse(raw)).questions, demo: false };
  return {
    demo: true,
    questions: [
      { prompt: `Which choice best supports the learning goal in “${title}”?`, options: ["Explain the main idea with a relevant example", "Skip the example and guess", "Copy a sentence without checking", "Choose an answer at random"], answer: 0, explanation: "A relevant example helps you show how the idea works." },
      { prompt: "After you try a practice question, what is a helpful next step?", options: ["Check your steps and explain your choice", "Hide the work and move on", "Change the answer without a reason", "Stop practising"], answer: 0, explanation: "Checking and explaining your steps helps you notice what to try next." },
      { prompt: "If the first approach feels tricky, what could you try?", options: ["Use another example or representation", "Assume you cannot learn it", "Skip the whole lesson", "Wait for someone to give the answer"], answer: 0, explanation: "Trying another explanation or example can give you a new way into the same idea." },
    ],
  };
}

export async function teachingReply(prompt: string, context: string) {
  const raw = await askModel(
    "You are a supportive teaching co-planner. Use the supplied curriculum only as context. Offer practical, age-appropriate next steps and multiple ways to explore the same learning goal. Do not diagnose students, assign fixed learning types, or reveal student data. Return JSON with a single string property named reply.",
    `Curriculum context:\n${context.slice(0, 6000)}\n\nTeacher request:\n${prompt.slice(0, 1600)}`,
  );
  if (raw) {
    const parsed = z.object({ reply: z.string().min(1).max(5000) }).parse(JSON.parse(raw));
    return { reply: parsed.reply, demo: false };
  }
  return { reply: demoTeacherReply(prompt, context), demo: true };
}

export async function studentTutorReply(prompt: string, assignedContent: string, guardianConsent: boolean) {
  const raw = await askModel(
    "You are a kind study tutor for school students. Explain in small steps. Give hints and a similar practice example before giving a full solution. Encourage the student to try. Never ask for personal information. Mention that you can make mistakes and the student can check with their teacher. Return JSON with a single string property named reply.",
    `Assigned lesson material:\n${assignedContent.slice(0, 4000)}\n\nStudent question:\n${prompt.slice(0, 1000)}`,
    guardianConsent,
  );
  if (raw) {
    const parsed = z.object({ reply: z.string().min(1).max(3000) }).parse(JSON.parse(raw));
    return { reply: parsed.reply, demo: false };
  }
  return { reply: `Let's work through it together. First, look at this idea from your lesson: ${assignedContent.slice(0, 260).trim()}\n\nWhat part feels clear so far? Try explaining the first step in your own words. I can make mistakes, so check your work with your teacher too.`, demo: true };
}

function demoTeacherReply(prompt: string, context: string) {
  const topic = prompt.match(/(?:on|about|unit for|lesson on)\s+([^?.!]+)/i)?.[1]?.trim() || "this topic";
  return `Here is a starting point for ${topic}:\n\n1. Name one clear learning goal.\n2. Model a worked example and think aloud.\n3. Let students explore it by reading, talking, drawing, or trying a practice task.\n4. Ask for a short explanation or exit response to see what to revisit.\n\n${context ? `I used the curriculum notes you provided: “${context.slice(0, 180).trim()}…”` : "Add a curriculum excerpt to ground the plan in your course expectations."}\n\nThis is a draft for you to review and edit before sharing.`;
}
