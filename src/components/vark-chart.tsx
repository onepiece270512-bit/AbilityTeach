import type { VarkKey, VarkScores } from "@/lib/vark";

const labels: Record<VarkKey, string> = { visual: "Visual", aural: "Aural", readWrite: "Read / Write", kinesthetic: "Kinesthetic" };
export function VarkChart({ scores }: { scores: VarkScores }) {
  const maximum = Math.max(1, ...Object.values(scores));
  return <div className="score-bars" aria-label="Learning preference responses">
    {(Object.entries(scores) as Array<[VarkKey, number]>).map(([key, score]) => <div key={key} className="score-bar"><span>{labels[key]}</span><div className="score-track" role="img" aria-label={`${labels[key]}: ${score} responses`}><span style={{ width: `${Math.max(score ? 8 : 0, (score / maximum) * 100)}%` }}/></div><b>{score}</b></div>)}
    <p className="form-hint">These are preferences to explore, not a fixed learning type.</p>
  </div>;
}
