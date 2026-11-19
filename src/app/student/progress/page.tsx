import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitQuizAction } from "@/app/actions/platform";

type QuizQuestion = { prompt: string; options: string[]; answer: number; explanation?: string };
export default async function StudentProgressPage({ searchParams }: { searchParams: Promise<{ score?: string; total?: string }> }) {
  const student = await requireUser("STUDENT");
  const [quizzes, attempts, progress, materialProgress, params] = await Promise.all([
    db.quiz.findMany({ where: { published: true, classroom: { enrollments: { some: { studentId: student.id } } } }, include: { classroom: true }, take: 3 }),
    db.quizAttempt.findMany({ where: { studentId: student.id }, include: { quiz: true }, orderBy: { completedAt: "desc" }, take: 10 }),
    db.studentProgress.findMany({ where: { studentId: student.id }, include: { lesson: true }, orderBy: { updatedAt: "desc" }, take: 12 }),
    db.studyMaterialProgress.findMany({ where: { studentId: student.id }, include: { material: true }, orderBy: { openedAt: "desc" }, take: 8 }),
    searchParams,
  ]);
  const resultMessage = params.score !== undefined && params.total !== undefined ? `You got ${params.score} out of ${params.total}. Check your answers, then try another practice path.` : null;
  return <AppShell user={student}><div className="page-header"><div><span className="eyebrow">MY PROGRESS</span><h1>Every try counts.</h1><p>Your saved practice history—not a guess at what you know.</p></div></div>{resultMessage && <div role="status" className="form-message success">{resultMessage}</div>}
    <div className="content-grid"><section className="panel"><div className="panel-header"><div><h2>Practice quizzes</h2><p>Try one when you're ready.</p></div></div>{quizzes.length ? quizzes.map((quiz) => {
      const questions = quiz.questions as QuizQuestion[];
      return <form action={submitQuizAction} className="quiz-form" key={quiz.id}><input type="hidden" name="quizId" value={quiz.id}/><h3>{quiz.title}</h3><p className="form-hint">{quiz.classroom.name} · {questions.length} questions</p>{questions.map((question,index)=><fieldset className="quiz-question" key={`${quiz.id}-${index}`}><legend>{index+1}. {question.prompt}</legend>{question.options.map((option,optionIndex)=><label className="quiz-answer" key={option}><input type="radio" name={`answer-${index}`} value={optionIndex} required/><span>{option}</span></label>)}</fieldset>)}<button className="button button-primary">Submit my answers</button></form>;
    }) : <div className="empty-state"><b>No quiz yet</b><p>Your teacher's practice quizzes will appear here.</p></div>}</section>
      <section className="panel"><div className="panel-header"><div><h2>Quiz history</h2><p>Scores saved from your actual attempts</p></div></div>{attempts.length ? <table className="data-table"><thead><tr><th>Quiz</th><th>Score</th><th>Date</th></tr></thead><tbody>{attempts.map((attempt)=><tr key={attempt.id}><td>{attempt.quiz.title}</td><td>{attempt.score}/{attempt.total}</td><td>{attempt.completedAt.toLocaleDateString()}</td></tr>)}</tbody></table> : <div className="empty-state"><p>Your scores will show here after you finish a quiz.</p></div>}</section></div>
    <div className="content-grid"><section className="panel"><div className="panel-header"><div><h2>Lessons I've worked on</h2><p>Progress based on activities and teacher updates</p></div></div>{progress.length ? <div className="profile-list">{progress.map((item)=><div className="profile-row" key={item.id}><div><b>{item.lesson.title}</b><small>{item.status.replaceAll("_"," ").toLowerCase()}</small></div><span className="status-pill">{item.completion}%</span></div>)}</div> : <p className="form-hint">Lesson progress appears when you work through assigned lessons.</p>}</section>
      <section className="panel"><div className="panel-header"><div><h2>Study activity</h2><p>Opened and completed are tracked separately.</p></div></div>{materialProgress.length ? <div className="profile-list">{materialProgress.map((item)=><div className="profile-row" key={item.id}><div><b>{item.material.title}</b><small>{item.completedAt ? "Marked complete by you" : "Opened · not marked complete"}</small></div><span className="status-pill">{item.completedAt ? "Done" : "Open"}</span></div>)}</div> : <div className="empty-state"><p>Open a study guide to see it listed here. Opening it won't affect your progress score.</p><Link className="button button-secondary" href="/student/materials">Browse materials</Link></div>}</section></div>
    <p className="privacy-note"><span>♡</span> Your progress is shared with teachers in your classes so they can plan helpful next steps.</p>
  </AppShell>;
}
