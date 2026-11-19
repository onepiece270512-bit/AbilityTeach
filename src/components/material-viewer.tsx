"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";

const labels: Record<string, string> = { visual: "See it", aural: "Hear & talk", readWrite: "Read & write", kinesthetic: "Try it" };
export function MaterialViewer({ coreContent, representations }: { coreContent: string; representations: Record<string, string> }) {
  const [active, setActive] = useState("readWrite");
  const text = representations[active] || coreContent;
  const speak = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  };
  return <><div className="representation-tabs" role="tablist" aria-label="Choose a way to explore this material">{Object.keys(labels).map((key) => <button key={key} type="button" role="tab" aria-selected={active === key} onClick={() => setActive(key)}>{labels[key]}</button>)}</div><div className="representation-box" role="tabpanel"><p>{coreContent}</p><p><b>{labels[active]}:</b> {text}</p></div><button type="button" className="icon-button speak-button" onClick={speak} aria-label="Read this activity aloud"><Volume2 size={17}/> Read aloud</button></>;
}
