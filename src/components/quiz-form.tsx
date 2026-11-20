"use client";

import { useActionState } from "react";
import { submitQuizAction } from "@/app/actions/platform";

type Question = { prompt: string; options: string[]; answer: number; explanation?: string };
type Quiz = { id: string; title: string; questions: Question[]; classroom: { name: string } };

export function QuizForm({ quiz }: { quiz: Quiz }) {
  const [state, action, pending] = useActionState(submitQuizAction, {});
  return <form action={action} className="quiz-form">
    <input type="hidden" name="quizId" value={quiz.id}/><h3>{quiz.title}</h3><p className="form-hint">{quiz.classroom.name} · {quiz.questions.length} questions</p>
    {quiz.questions.map((question,index)=><fieldset className="quiz-question" key={`${quiz.id}-${index}`}><legend>{index+1}. {question.prompt}</legend>{question.options.map((option,optionIndex)=><label className="quiz-answer" key={option}><input type="radio" name={`answer-${index}`} value={optionIndex} required/><span>{option}</span></label>)}</fieldset>)}
    {state.error && <p role="alert" className="form-message error">{state.error}</p>}{state.success && <p role="status" className="form-message success">{state.success}</p>}
    <button className="button button-primary" disabled={pending}>{pending ? "Checking your answers…" : "Submit my answers"}</button>
  </form>;
}
