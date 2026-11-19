import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordMaterialOpenAction } from "@/app/actions/platform";

export default async function StudentMaterialsPage() {
  const student = await requireUser("STUDENT");
  const assignments = await db.assignment.findMany({ where: { classroom: { enrollments: { some: { studentId: student.id } } }, material: { status: "PUBLISHED" } }, include: { classroom: true, material: { include: { progress: { where: { studentId: student.id } } } } }, orderBy: { createdAt: "desc" } });
  return <AppShell user={student}><div className="page-header"><div><span className="eyebrow">MY STUDY MATERIALS</span><h1>Choose a way to explore.</h1><p>You can switch formats whenever you want.</p></div></div>{assignments.length ? <div className="material-grid">{assignments.map((assignment) => assignment.material && <article className="material-card" key={assignment.id}><span className="eyebrow">{assignment.classroom.subject} · {assignment.classroom.gradeLevel}</span><h3>{assignment.title}</h3><p>{assignment.instructions}</p><div className="material-actions"><form action={recordMaterialOpenAction}><input type="hidden" name="materialId" value={assignment.material.id}/><button className="button button-primary">Open material</button></form>{assignment.material.progress[0]?.completedAt ? <span className="status-pill">Completed</span> : assignment.material.progress[0] ? <span className="status-pill">Opened</span> : null}</div></article>)}</div> : <div className="panel empty-state"><b>No study materials yet</b><p>Your teacher's approved lessons and study guides will show here.</p></div>}</AppShell>;
}
