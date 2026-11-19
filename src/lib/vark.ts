export type VarkKey = "visual" | "aural" | "readWrite" | "kinesthetic";
export type VarkScores = Record<VarkKey, number>;

export const surveyQuestions = [
  { id: "new-topic", category: "preferences", prompt: "When I start learning something new, I like to…", options: [
    { label: "See a picture, diagram, or example", key: "visual" }, { label: "Hear someone explain it", key: "aural" }, { label: "Read the steps or write notes", key: "readWrite" }, { label: "Try it out for myself", key: "kinesthetic" },
  ] },
  { id: "remember", category: "preferences", prompt: "I remember an idea best when I…", options: [
    { label: "Make a mind map or use colours", key: "visual" }, { label: "Talk about it with someone", key: "aural" }, { label: "Write a summary in my own words", key: "readWrite" }, { label: "Use it to solve a real problem", key: "kinesthetic" },
  ] },
  { id: "instructions", category: "preferences", prompt: "For directions, I like…", options: [
    { label: "A chart or a model to look at", key: "visual" }, { label: "Someone to talk me through it", key: "aural" }, { label: "Written steps I can check", key: "readWrite" }, { label: "A chance to practise as I go", key: "kinesthetic" },
  ] },
  { id: "study", category: "preferences", prompt: "When I study, I often…", options: [
    { label: "Draw or look at diagrams", key: "visual" }, { label: "Say ideas out loud or listen", key: "aural" }, { label: "Read, write, or make a list", key: "readWrite" }, { label: "Use flashcards or practise problems", key: "kinesthetic" },
  ] },
  { id: "show", category: "preferences", prompt: "I like to show what I know by…", options: [
    { label: "Drawing a diagram or making a model", key: "visual" }, { label: "Explaining it to someone", key: "aural" }, { label: "Writing an answer", key: "readWrite" }, { label: "Building or demonstrating it", key: "kinesthetic" },
  ] },
  { id: "stuck", category: "support", prompt: "When I get stuck, a good first step is…", options: [
    { label: "Look at an example", key: "visual" }, { label: "Ask someone to explain it", key: "aural" }, { label: "Read the instructions again", key: "readWrite" }, { label: "Try a smaller practice question", key: "kinesthetic" },
  ] },
  { id: "group", category: "preferences", prompt: "In a group, I enjoy…", options: [
    { label: "Making a poster or sketch", key: "visual" }, { label: "Sharing ideas and listening", key: "aural" }, { label: "Taking notes or writing a plan", key: "readWrite" }, { label: "Making something together", key: "kinesthetic" },
  ] },
  { id: "confidence", category: "confidence", prompt: "How confident do you feel about schoolwork right now?", options: [
    { label: "I feel ready to try", key: "confidence-5" }, { label: "I feel mostly okay", key: "confidence-4" }, { label: "I'm not sure yet", key: "confidence-3" }, { label: "I could use some help", key: "confidence-2" }, { label: "I feel stuck and want to talk", key: "confidence-1" },
  ] },
  { id: "hard-topics", category: "support", prompt: "What would you like more help with?", options: [
    { label: "Maths", key: "topic-maths" }, { label: "Reading and writing", key: "topic-literacy" }, { label: "Science", key: "topic-science" }, { label: "Staying focused or organised", key: "topic-focus" }, { label: "Something else", key: "topic-other" },
  ], multi: true },
  { id: "change", category: "reflection", prompt: "Can your favourite way to learn change from lesson to lesson?", options: [
    { label: "Yes, it depends what I'm learning", key: "yes" }, { label: "Sometimes", key: "sometimes" }, { label: "I'm still figuring that out", key: "unsure" },
  ] },
];

export function calculateVark(answers: Record<string, string | string[]>): VarkScores {
  const scores: VarkScores = { visual: 0, aural: 0, readWrite: 0, kinesthetic: 0 };
  for (const question of surveyQuestions) {
    const answer = answers[question.id];
    const values = Array.isArray(answer) ? answer : answer ? [answer] : [];
    for (const value of values) {
      if (value in scores) scores[value as VarkKey] += 1;
    }
  }
  return scores;
}

export function confidenceFromAnswer(answer: string | string[] | undefined) {
  const value = Array.isArray(answer) ? answer[0] : answer;
  const match = value?.match(/^confidence-(\d)$/);
  return match ? Number(match[1]) : 3;
}

export function difficultTopicsFromAnswer(answer: string | string[] | undefined) {
  const values = Array.isArray(answer) ? answer : answer ? [answer] : [];
  return values.filter((value) => value.startsWith("topic-")).map((value) => value.slice(6));
}
