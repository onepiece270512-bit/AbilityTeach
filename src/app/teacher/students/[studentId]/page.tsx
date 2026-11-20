import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { VarkChart } from "@/components/vark-chart";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TeacherStudentProfilePage({ params }: { params: Promise<{studentId:string}> }) {
  const teacher = await requireUser("TEACHER");
  const {studentId} = await params;
  const enrollment = await db.enrollment.findFirst({ where: { studentId, classroom: { teacherId: teacher.id } }, include: { student: { include: { profile: true, surveyResponses: { orderBy: { completedAt: "desc" }, take: 1 } }, }, classroom: true } });
  if (!enrollment) notFound();
  const [attempts, assignments, activity] = await Promise.all([
    db.quizAttempt.findMany({ where: { studentId, quiz: { classroom: { teacherId: teacher.id } } }, include: { quiz: true }, orderBy: { completedAt: "desc" }, take: 8 }),
    db.assignment.findMany({ where: { classroomId: enrollment.classroomId }, include: { material: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.studentProgress.findMany({ where: { studentId, lesson: { classroomId: enrollment.classroomId } }, include: { lesson: true }, orderBy: { updatedAt: "desc" }, take: 8 }),
  ]);
  const {student, classroom} = enrollment;
  const profile = student.profile;
  const latestCheckIn = student.surveyResponses[0];
  const questionLabels: Record<string, string> = {
    "new-topic": "Starting a new topic", remember: "Remembering an idea", instructions: "Following directions", study: "Studying",
    show: "Showing what I know", stuck: "Getting unstuck", group: "Working in a group", confidence: "Confidence",
    "hard-topics": "Topics for extra help", change: "Learning preferences can change",
    "quick-new-skill": "Starting a new skill", "quick-remember": "Remembering an idea", "quick-show": "Showing understanding",
  };
  const choiceLabels: Record<string, string> = {
    visual: "Picture, diagram, or example", aural: "Talk or listen", readWrite: "Read or write", kinesthetic: "Try it in practice",
    "confidence-1": "I feel stuck", "confidence-2": "I could use help", "confidence-3": "I'm not sure yet", "confidence-4": "Mostly okay", "confidence-5": "Ready to try",
    "topic-maths": "Maths", "topic-literacy": "Reading and writing", "topic-science": "Science", "topic-focus": "Focus or organisation", "topic-other": "Something else",
    yes: "Yes", sometimes: "Sometimes", unsure: "Still figuring it out",
  };
  const responseAnswers = latestCheckIn ? Object.entries(latestCheckIn.answers as Record<string, string | string[]>).map(([key, value]) => ({
    question: questionLabels[key] || key.replaceAll("-", " "),
    answer: (Array.isArray(value) ? value : [value]).map((choice) => choiceLabels[choice] || choice).join(", "),
  })) : [];
  return <AppShell user={teacher}><div className="page-header"><div><span className="eyebrow">STUDENT PROFILE · {classroom.name}</span><h1>{student.name}</h1><p>{student.gradeLevel || classroom.gradeLevel} · {classroom.subject}</p></div><Link className="text-link" href="/teacher/students">← All students</Link></div>
    <div className="content-grid"><section className="panel"><div className="panel-header"><div><h2>Student-reported preferences</h2><p>Conversation starters, not fixed learning types</p></div><Link className="button button-secondary" href={`/teacher/planner?classroom=${classroom.id}`}>Create study plan</Link></div>{profile ? <><VarkChart scores={{visual:profile.visual,aural:profile.aural,readWrite:profile.readWrite,kinesthetic:profile.kinesthetic}}/><div className="profile-list" style={{marginTop:17}}><div className="profile-row"><div><b>Confidence</b><small>Self-reported check-in</small></div><span>{profile.confidence}/5</span></div><div className="profile-row"><div><b>Topics for extra help</b><small>What the student asked for</small></div><span>{Array.isArray(profile.difficultTopics) && profile.difficultTopics.length ? (profile.difficultTopics as string[]).join(", ") : "None shared"}</span></div></div></> : <div className="empty-state"><b>No check-in yet</b><p>The student hasn't completed a learning survey. Preferences are optional.</p></div>}</section>
      <section className="panel"><div className="panel-header"><div><h2>Recent quiz scores</h2><p>Stored results from this class</p></div></div>{attempts.length ? <div className="profile-list">{attempts.map((attempt)=><div className="profile-row" key={attempt.id}><div><b>{attempt.quiz.title}</b><small>{attempt.completedAt.toLocaleDateString()}</small></div><span className="status-pill">{attempt.score}/{attempt.total}</span></div>)}</div> : <p className="form-hint">Quiz scores appear after completed attempts.</p>}</section></div>
    <section className="panel" style={{marginBottom:16}}><div className="panel-header"><div><h2>Recent check-in answers</h2><p>What {student.name.split(" ")[0]} picked · {latestCheckIn ? latestCheckIn.completedAt.toLocaleDateString() : "No response yet"}</p></div></div>{responseAnswers.length ? <div className="profile-list">{responseAnswers.map(({question,answer})=><div className="profile-row" key={question}><div><b>{question}</b></div><span>{answer || "No answer"}</span></div>)}</div> : <p className="form-hint">Answers appear after the student completes a check-in.</p>}</section>
    <div className="content-grid"><section className="panel"><div className="panel-header"><div><h2>Lesson activity</h2><p>Not a measure of ability</p></div></div>{activity.length ? <div className="profile-list">{activity.map((item)=><div className="profile-row" key={item.id}><div><b>{item.lesson.title}</b><small>Updated {item.updatedAt.toLocaleDateString()}</small></div><span>{item.completion}%</span></div>)}</div> : <p className="form-hint">No lesson activity has been recorded yet.</p>}</section><section className="panel"><div className="panel-header"><div><h2>Assigned materials</h2><p>What the student can open</p></div></div>{assignments.length ? <div className="profile-list">{assignments.map((assignment)=><div className="profile-row" key={assignment.id}><div><b>{assignment.title}</b><small>{assignment.material?.title || "Assignment"}</small></div><span className="status-pill">Assigned</span></div>)}</div> : <p className="form-hint">No assigned study materials yet.</p>}</section></div>
  </AppShell>;
}
