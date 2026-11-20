import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SurveyFlow } from "@/components/survey-flow";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function StudentSurveyPage({ searchParams }: { searchParams: Promise<{ updated?: string; quick?: string }> }) {
  const student = await requireUser("STUDENT");
  const [profile, params] = await Promise.all([db.learningProfile.findUnique({ where: { studentId: student.id } }), searchParams]);
  return <AppShell user={student}><div className="page-header"><div><span className="eyebrow">LEARNING PROFILE</span><h1>{params.quick === "1" ? "Three quick questions" : "What helps me learn?"}</h1><p>{params.quick === "1" ? "Pick what feels helpful today. It only takes a moment." : "A quick check-in you can update whenever you like."}</p></div><Link className="text-link" href="/student/dashboard">← Back to my learning</Link></div>
    {params.updated && <p className="form-message success">Great—let's refresh your answers.</p>}
    <div className="notice-box" style={{marginBottom:17}}>This is about preferences, not a test. Most people like a mix of ways to learn, and what works can change by topic. {params.quick === "1" ? "This short demo is inspired by the kinds of situations in the VARK questionnaire." : ""} <a className="demo-source" href="https://vark-learn.com/the-vark-questionnaire/" target="_blank" rel="noreferrer">Read the VARK questionnaire</a>.</div>
    {profile && <section className="panel" style={{maxWidth:760,margin:"0 auto 17px"}}><div className="panel-header"><div><h2>My current answers</h2><p>Updated {profile.updatedAt.toLocaleDateString()}</p></div></div><p className="form-hint">Take the check-in below to try different answers.</p></section>}
    <SurveyFlow fontSize={student.learningMode} quick={params.quick === "1"}/>
  </AppShell>;
}
