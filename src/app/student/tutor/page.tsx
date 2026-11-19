import { AppShell } from "@/components/app-shell";
import { ActionForm } from "@/components/action-form";
import { studentTutorAction } from "@/app/actions/platform";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function StudentTutorPage() {
  const student = await requireUser("STUDENT");
  const [materials, conversation] = await Promise.all([
    db.studyMaterial.findMany({ where: { status: "PUBLISHED", assignments: { some: { classroom: { enrollments: { some: { studentId: student.id } } } } } }, select: { id: true, title: true }, take: 30 }),
    db.aIConversation.findFirst({ where: { userId: student.id, title: "Study tutor" }, orderBy: { updatedAt: "desc" } }),
  ]);
  const messages = Array.isArray(conversation?.messages) ? conversation.messages as Array<{role:string;content:string}> : [];
  const aiReady = process.env.AI_EXTERNAL_PROCESSING_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY) && student.guardianConsent;
  return <AppShell user={student}><div className="page-header"><div><span className="eyebrow">STUDY TUTOR</span><h1>Let's figure it out together.</h1><p>Ask for a hint, another example, or a simpler explanation.</p></div></div><div className="notice-box" style={{marginBottom:17}}>This tutor can make mistakes. Don't share personal information. {aiReady ? "Your school has enabled the approved AI service for this account." : "You're using the local demo helper; your question stays in this app."}</div>
    <div className="panel" style={{maxWidth:820}}><div className="chat-log" aria-live="polite">{messages.length ? messages.map((message,index)=><div key={index} className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`}>{message.content}</div>) : <div className="chat-bubble assistant">Try asking: “Can you explain adding unlike fractions in smaller steps?”</div>}</div><ActionForm action={studentTutorAction} label="Ask the tutor" className="form-card"><div className="form-field"><label htmlFor="prompt">What are you working on?</label><textarea id="prompt" name="prompt" className="field-textarea" minLength={2} maxLength={1000} required placeholder="Ask for a hint, example, or practice question…"/></div><div className="form-field"><label htmlFor="materialId">Use a class material <span className="optional">optional</span></label><select id="materialId" name="materialId" className="field-select" defaultValue=""><option value="">No material selected</option>{materials.map((material)=><option value={material.id} key={material.id}>{material.title}</option>)}</select></div></ActionForm></div></AppShell>;
}
