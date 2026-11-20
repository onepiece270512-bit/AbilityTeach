"use client";

import { useActionState, useMemo, useState } from "react";
import { saveSurveyAction } from "@/app/actions/platform";
import { quickSurveyQuestions, surveyQuestions } from "@/lib/vark";
import { Volume2 } from "lucide-react";

export function SurveyFlow({ fontSize = "standard", quick = false }: { fontSize?: string; quick?: boolean }) {
  const [state, saveAction, pending] = useActionState(saveSurveyAction, {});
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState("");
  const questions = quick ? quickSurveyQuestions : surveyQuestions;
  const current = questions[step];
  const value = answers[current.id];
  const selected = useMemo(() => Array.isArray(value) ? value : value ? [value] : [], [value]);
  const choose = (key: string) => {
    setError("");
    setAnswers((previous) => {
      if (current.multi) {
        const choices = Array.isArray(previous[current.id]) ? previous[current.id] as string[] : [];
        return { ...previous, [current.id]: choices.includes(key) ? choices.filter((choice) => choice !== key) : [...choices, key].slice(0, 3) };
      }
      return { ...previous, [current.id]: key };
    });
  };
  const readQuestion = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${current.prompt}. ${current.options.map((option) => option.label).join(". ")}`));
    }
  };
  return <div className={`survey-flow mode-${fontSize}`}>
    <div className="survey-head"><div><span className="eyebrow">{quick ? "3 QUESTION QUICK CHECK IN" : "YOUR LEARNING PROFILE"}</span><p>There are no right answers. Pick what feels useful to you.</p></div><button className="icon-button speak-button" type="button" onClick={readQuestion} aria-label="Read this question aloud"><Volume2 size={18}/><span>Read aloud</span></button></div>
    <div className="progress-row"><span>Question {step + 1} of {questions.length}</span><span>{Math.round(((step + 1) / questions.length) * 100)}%</span></div><div className="progress-track" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={questions.length} aria-label={`Question ${step + 1} of ${questions.length}`}><span style={{ width: `${((step + 1) / questions.length) * 100}%` }}/></div>
    <div className="survey-question"><span className="eyebrow">{current.category === "confidence" ? "HOW YOU FEEL" : current.category === "support" ? "WHAT HELPS" : "WHAT YOU PREFER"}</span><h2>{current.prompt}</h2>{current.multi && <p>{quick ? "Pick one or more." : "Choose up to three."}</p>}</div>
    <fieldset className="survey-answers"><legend className="sr-only">{current.prompt}</legend>{current.options.map((option) => <label key={option.key} className={selected.includes(option.key) ? "survey-answer selected" : "survey-answer"}><input type={current.multi ? "checkbox" : "radio"} name={current.id} checked={selected.includes(option.key)} onChange={() => choose(option.key)}/><span className="answer-mark" aria-hidden="true">✓</span><span>{option.label}</span></label>)}</fieldset>
    {(state.error || error) && <p role="alert" className="form-message error">{state.error || error}</p>}
    <div className="survey-actions"><button className="button button-quiet" type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>{step < questions.length - 1 ? <button className="button button-primary" type="button" onClick={() => selected.length ? setStep(step + 1) : setError("Choose an answer to keep going.")}>Next question <span>→</span></button> : <form action={saveAction}><input type="hidden" name="answers" value={JSON.stringify(answers)}/><button className="button button-primary" type="submit" disabled={selected.length === 0 || pending}>{pending ? "Saving…" : "Save my profile"}</button></form>}</div>
    <p className="survey-privacy">Your answers help your teacher offer choices. They don't label or limit you.</p>
  </div>;
}
