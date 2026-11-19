import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MaterialViewer } from "@/components/material-viewer";
import { completeMaterialAction } from "@/app/actions/platform";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function StudentMaterialPage({ params, searchParams }: { params: Promise<{ materialId: string }>; searchParams: Promise<{ complete?: string }> }) {
  const student = await requireUser("STUDENT");
  const { materialId } = await params;
  const [material, progress, query] = await Promise.all([
    db.studyMaterial.findFirst({ where: { id: materialId, status: "PUBLISHED", assignments: { some: { classroom: { enrollments: { some: { studentId: student.id } } } } }, include: { classroom: true } }),
    db.studyMaterialProgress.findUnique({ where: { studentId_materialId: { studentId: student.id, materialId } } }),
    searchParams,
  ]);
  if (!material) notFound();
  return <AppShell user={student}><div className="page-header"><div><span className="eyebrow">{material.classroom.name}</span><h1>{material.title}</h1><p>Switch formats or read along. The goal stays the same.</p></div><Link className="text-link" href="/student/materials">← All materials</Link></div>{query.complete && <div className="form-message success">Nice work—you marked this material complete.</div>}<section className="lesson-content"><h2>Let's learn this together</h2><MaterialViewer coreContent={material.coreContent} representations={material.representations as Record<string,string>}/><div style={{marginTop:22,paddingTop:17,borderTop:"1px solid #EBEEE9"}}><form action={completeMaterialAction}><input type="hidden" name="materialId" value={material.id}/><button className="button button-primary">{progress?.completedAt ? "Mark complete again" : "I finished this activity"}</button></form><p className="form-hint" style={{marginTop:9}}>Only you marking this activity complete records it. Opening it isn't counted as mastery.</p></div></section></AppShell>;
}
