import { AppShell } from "@/components/app-shell";
import { ActionForm } from "@/components/action-form";
import { joinClassAction } from "@/app/actions/platform";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function StudentClassesPage() {
  const student = await requireUser("STUDENT");
  const enrollments = await db.enrollment.findMany({ where: { studentId: student.id }, include: { classroom: { include: { teacher: { select: { name: true } }, _count: { select: { enrollments: true } } } } } });
  return <AppShell user={student}><div className="page-header"><div><span className="eyebrow">MY CLASSES</span><h1>My learning group</h1><p>Join with a class code your teacher gave you.</p></div></div><section className="panel" style={{maxWidth:650,marginBottom:18}}><h2>Join a class</h2><p className="form-hint" style={{margin:"5px 0 15px"}}>Class codes connect your dashboard to your teacher's lessons.</p><ActionForm action={joinClassAction} label="Join class" className="form-grid"><div className="form-field"><label htmlFor="joinCode">Class code</label><input id="joinCode" name="joinCode" className="field-input" placeholder="Example: FRACT8A" required autoCapitalize="characters" maxLength={24}/></div></ActionForm></section><div className="panel"><div className="panel-header"><div><h2>Enrolled classes</h2><p>Only your classes are shown here.</p></div></div>{enrollments.length ? <div className="class-list">{enrollments.map(({classroom})=><div className="class-row" key={classroom.id}><div><b>{classroom.name}</b><small>{classroom.subject} · {classroom.gradeLevel} · {classroom.teacher.name}</small></div><span className="status-pill">{classroom._count.enrollments} learners</span></div>)}</div>:<div className="empty-state"><b>No classes yet</b><p>Ask your teacher for a class code, then add it above.</p></div>}</div></AppShell>;
}
