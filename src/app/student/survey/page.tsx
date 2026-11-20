import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SurveyFlow } from "@/components/survey-flow";
import { VarkChart } from "@/components/vark-chart";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const labels = { visual: "Visual", aural: "Aural", readWrite: "Read / Write", kinesthetic: "Hands-on" } as const;

export default async function StudentSurveyPage({ searchParams }: { searchParams: Promise<{ updated?: string; quick?: string; welcome?: string; result?: string }> }) {
  const student = await requireUser("STUDENT");
  const [profile, params] = await Promise.all([db.learningProfile.findUnique({ where: { studentId: student.id } }), searchParams]);
  const quick = params.quick === "1" || params.welcome === "1";
  if (params.result === "1" && profile) {
    const scores = { visual: profile.visual, aural: profile.aural, readWrite: profile.readWrite, kinesthetic: profile.kinesthetic };
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top = ranked[0][1];
    const preferences = ranked.filter(([, score]) => score === top).map(([key]) => labels[key as keyof typeof labels]);
    return <AppShell user={student}><div className="page-header"><div><span className="eyebrow">YOUR LEARNING PROFILE</span><h1>Here’s what you told us</h1><p>Use the ways that feel helpful today. You can always try another one.</p></div></div>
      <section className="panel" style={{maxWidth:760,margin:"0 auto"}}>
        <div className="panel-header"><div><h2>{preferences.length > 1 ? "You like a mix of ways to learn" : `You chose ${preferences[0]} ways most often`}</h2><p>Your answers from the three quick questions</p></div></div>
        <VarkChart scores={scores}/>
        <div className="notice-box" style={{marginTop:18}}>This is a snapshot of what sounds useful today, not a permanent label. You can learn in different ways for different topics.</div>
        <div style={{display:"flex",gap:10,marginTop:20,flexWrap:"wrap"}}><Link className="button button-primary" href="/student/dashboard">Go to my dashboard</Link><Link className="button button-secondary" href="/student/survey">Change my answers</Link></div>
      </section>
    </AppShell>;
  }
  return <AppShell user={student}><div className="page-header"><div><span className="eyebrow">LEARNING PROFILE</span><h1>{quick ? "Three quick questions" : "What helps me learn?"}</h1><p>{quick ? "Pick what feels helpful today. It only takes a moment." : "A quick check-in you can update whenever you like."}</p></div>{!quick && <Link className="text-link" href="/student/dashboard">← Back to my learning</Link>}</div>
    {params.updated && <p className="form-message success">Great—let's refresh your answers.</p>}
    {!quick && <div className="notice-box" style={{marginBottom:17}}>This is about preferences, not a test. Most people like a mix of ways to learn, and what works can change by topic. <a className="demo-source" href="https://vark-learn.com/the-vark-questionnaire/" target="_blank" rel="noreferrer">Read about VARK</a>.</div>}
    {!quick && profile && <section className="panel" style={{maxWidth:760,margin:"0 auto 17px"}}><div className="panel-header"><div><h2>My current answers</h2><p>Updated {profile.updatedAt.toLocaleDateString()}</p></div></div><p className="form-hint">Take the check-in below to try different answers.</p></section>}
    <SurveyFlow fontSize={student.learningMode} quick={quick}/>
  </AppShell>;
}
