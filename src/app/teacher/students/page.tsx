import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { VarkChart } from "@/components/vark-chart";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TeacherStudentsPage() {
  const teacher = await requireUser("TEACHER");
  const enrollments = await db.enrollment.findMany({ where: { classroom: { teacherId: teacher.id } }, include: { classroom: true, student: { include: { profile: true, surveyResponses: { orderBy: { completedAt: "desc" }, take: 1 } } } }, orderBy: { joinedAt: "desc" } });
  const unique = [...new Map(enrollments.map((entry) => [entry.studentId, entry])).values()];
  return <AppShell user={teacher}><div className="page-header"><div><span className="eyebrow">STUDENT VOICES</span><h1>Students in your classes</h1><p>Only students enrolled in your classes appear here. Preferences are not labels.</p></div></div>{unique.length ? <div className="panel"><table className="data-table"><thead><tr><th>Student</th><th>Grade</th><th>Profile</th><th>Recent check-in</th><th></th></tr></thead><tbody>{unique.map(({student,classroom})=><tr key={student.id}><td><b>{student.name}</b><br/><small>{classroom.name}</small></td><td>{student.gradeLevel || "—"}</td><td>{student.profile ? <span className="status-pill">Available</span> : <span className="status-pill pending">Not yet</span>}</td><td>{student.surveyResponses[0]?.completedAt.toLocaleDateString() || "—"}</td><td><Link href={`/teacher/students/${student.id}`} className="text-link">View profile →</Link></td></tr>)}</tbody></table></div> : <div className="panel empty-state"><b>No students have joined yet</b><p>Create a class and share its code with your students.</p><Link className="button button-primary" href="/teacher/classes">Go to classes</Link></div>}</AppShell>;
}
