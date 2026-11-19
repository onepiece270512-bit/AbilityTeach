import { AppShell } from "@/components/app-shell";
import { ActionForm } from "@/components/action-form";
import { approveUnitAction, editLessonAction, editUnitAction, generateUnitAction, regenerateLessonAction, teacherAssistantAction } from "@/app/actions/platform";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TeacherPlannerPage({ searchParams }: { searchParams: Promise<{ classroom?: string; published?: string }> }) {
  const teacher = await requireUser("TEACHER");
  const params = await searchParams;
  const [classes, units, documents, conversations] = await Promise.all([
    db.classroom.findMany({ where: { teacherId: teacher.id }, orderBy: { name: "asc" } }),
    db.unit.findMany({ where: { teacherId: teacher.id }, include: { classroom: true, lessons: { orderBy: { sequence: "asc" } } }, orderBy: { updatedAt: "desc" }, take: 10 }),
    db.curriculumDocument.findMany({ where: { teacherId: teacher.id }, select: { id: true, title: true, classroomId: true, sourceType: true }, orderBy: { createdAt: "desc" } }),
    db.aIConversation.findMany({ where: { userId: teacher.id }, orderBy: { updatedAt: "desc" }, take: 3 }),
  ]);
  return <AppShell user={teacher}>
    <div className="page-header"><div><span className="eyebrow">AI TEACHING ASSISTANT</span><h1>Plan with a co-planner.</h1><p>Build a draft from your curriculum. You review every lesson before it reaches students.</p></div><span className="status-pill">{process.env.AI_EXTERNAL_PROCESSING_ENABLED === "true" && process.env.OPENAI_API_KEY ? "AI service enabled" : "Local demo co-planner"}</span></div>
    {params.published && <div role="status" className="form-message success">Published {params.published} and assigned its lesson materials to the class.</div>}
    <div className="content-grid">
      <section className="form-card"><h2>Draft a curriculum unit</h2><p>Start with the learning goal. The co-planner offers different ways to reach it.</p>
        <ActionForm action={generateUnitAction} label="Generate unit draft">
          <div className="form-field"><label htmlFor="classroomId">Class</label><select className="field-select" id="classroomId" name="classroomId" required defaultValue={params.classroom || ""}><option value="" disabled>Choose a class</option>{classes.map((classroom)=><option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></div>
          <div className="form-field"><label htmlFor="topic">Unit topic</label><input className="field-input" id="topic" name="topic" required minLength={3} maxLength={120} placeholder="Adding fractions"/></div>
          <div className="form-field"><label htmlFor="objectives">Learning goals <span className="optional">optional</span></label><textarea className="field-textarea" id="objectives" name="objectives" maxLength={800} placeholder="What should students understand or be able to do?"/></div>
          <div className="form-field"><label htmlFor="documentId">Curriculum document <span className="optional">optional</span></label><select className="field-select" id="documentId" name="documentId" defaultValue=""><option value="">No document selected</option>{documents.filter((doc)=>!params.classroom||!doc.classroomId||doc.classroomId===params.classroom).map((doc)=><option key={doc.id} value={doc.id}>{doc.title} · {doc.sourceType.toUpperCase()}</option>)}</select></div>
          <div className="form-field"><label htmlFor="curriculum">Paste curriculum notes <span className="optional">optional</span></label><textarea className="field-textarea" id="curriculum" name="curriculum" maxLength={6000} placeholder="Paste expectations or key notes to ground the draft…"/></div>
          <p className="form-hint">Drafts are saved privately. No student information is sent to the AI co-planner.</p>
        </ActionForm>
      </section>
      <section className="panel"><div className="panel-header"><div><h2>Ask the teaching assistant</h2><p>Get a practical starting point.</p></div></div>
        <ActionForm action={teacherAssistantAction} label="Ask co-planner" className="form-card">
          <div className="form-field"><label htmlFor="assistantClass">Class context</label><select className="field-select" name="classroomId" id="assistantClass" required defaultValue={params.classroom || ""}><option value="" disabled>Choose a class</option>{classes.map((classroom)=><option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></div>
          <div className="form-field"><label htmlFor="prompt">What are you planning?</label><textarea className="field-textarea" name="prompt" id="prompt" minLength={5} maxLength={1600} required placeholder="Help me plan tomorrow's lesson on equivalent fractions…"/></div>
        </ActionForm>
        <div className="notice-box" style={{marginTop:13}}>AI outputs are drafts. Check accuracy, curriculum fit, accessibility, and age suitability before using them.</div>
        {conversations.map((conversation)=><div key={conversation.id} className="chat-bubble assistant" style={{marginTop:12}}>{Array.isArray(conversation.messages) ? String([...conversation.messages as Array<{role:string;content:string}>].reverse().find((message)=>message.role==="assistant")?.content || "") : ""}</div>)}
      </section>
    </div>
    <section style={{marginTop:24}}><div className="panel-header"><div><h2>Unit drafts</h2><p>Preview, edit, regenerate a lesson, then approve before assigning.</p></div></div>
      {units.length ? <div className="draft-list">{units.map((unit)=><article className="draft-card" key={unit.id}>
        <div className="draft-card-footer" style={{borderTop:0,paddingTop:0}}><div><span className={`status-pill ${unit.status === "DRAFT" ? "pending" : ""}`}>{unit.status === "DRAFT" ? "Draft · private" : "Published"}</span><h3>{unit.title}</h3><small>{unit.classroom.name} · {unit.subject} · {unit.gradeLevel}</small></div></div><p>{unit.description}</p>
        <details><summary className="text-link">Preview {unit.lessons.length} lessons</summary><ol>{unit.lessons.map((lesson)=><li key={lesson.id}><b>{lesson.title}</b> — {lesson.objective}<br/><small>{lesson.duration} min · {lesson.assessment}</small></li>)}</ol></details>
        {unit.status === "DRAFT" && <>
          <details style={{marginTop:10}}><summary className="text-link">Edit unit details</summary><ActionForm action={editUnitAction} label="Save draft changes" className="form-card"><input type="hidden" name="unitId" value={unit.id}/><div className="form-field"><label htmlFor={`desc-${unit.id}`}>Description</label><textarea className="field-textarea" id={`desc-${unit.id}`} name="description" defaultValue={unit.description} maxLength={700}/></div><div className="form-field"><label htmlFor={`obj-${unit.id}`}>Objectives, one per line</label><textarea className="field-textarea" id={`obj-${unit.id}`} name="objectives" defaultValue={(unit.objectives as string[]).join("\n")} maxLength={1200}/></div></ActionForm></details>
          <details style={{marginTop:10}}><summary className="text-link">Edit or regenerate a lesson</summary><div className="draft-list" style={{marginTop:10}}>{unit.lessons.map((lesson)=><details className="lesson-edit" key={lesson.id}><summary>{lesson.sequence}. {lesson.title}</summary><ActionForm action={editLessonAction} label="Save lesson draft" className="form-card"><input type="hidden" name="lessonId" value={lesson.id}/><div className="form-field"><label htmlFor={`lesson-title-${lesson.id}`}>Title</label><input className="field-input" id={`lesson-title-${lesson.id}`} name="title" defaultValue={lesson.title} maxLength={100}/></div><div className="form-field"><label htmlFor={`lesson-objective-${lesson.id}`}>Learning objective</label><textarea className="field-textarea" id={`lesson-objective-${lesson.id}`} name="objective" defaultValue={lesson.objective} maxLength={220}/></div><div className="form-field"><label htmlFor={`lesson-intro-${lesson.id}`}>Introduction</label><textarea className="field-textarea" id={`lesson-intro-${lesson.id}`} name="introduction" defaultValue={lesson.introduction} maxLength={500}/></div><div className="form-field"><label htmlFor={`lesson-activities-${lesson.id}`}>Activities, one per line</label><textarea className="field-textarea" id={`lesson-activities-${lesson.id}`} name="activities" defaultValue={(lesson.activities as string[]).join("\n")} maxLength={1000}/></div><div className="form-field"><label htmlFor={`lesson-assess-${lesson.id}`}>Assessment idea</label><input className="field-input" id={`lesson-assess-${lesson.id}`} name="assessment" defaultValue={lesson.assessment} maxLength={250}/></div></ActionForm><ActionForm action={regenerateLessonAction} label="Regenerate this lesson" className="form-card"><input type="hidden" name="lessonId" value={lesson.id}/><p className="form-hint">Keeps this unit's learning goal. Review the new draft before publishing.</p></ActionForm></details>)}</div></details>
          <form action={approveUnitAction} style={{marginTop:15}}><input type="hidden" name="unitId" value={unit.id}/><button className="button button-primary">Approve &amp; assign lessons</button></form>
        </>}
      </article>)}</div> : <div className="panel empty-state"><b>No unit plans yet</b><p>Choose a class and topic to make your first draft.</p></div>}
    </section>
  </AppShell>;
}
