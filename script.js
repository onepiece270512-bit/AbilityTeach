const questions = [
  {
    kicker: 'A LITTLE ABOUT YOU',
    title: "When you're learning something new, what helps you get started?",
    subtitle: 'Choose what sounds like you. You can pick more than one.',
    answers: ['Seeing an example first', 'Talking it through with someone', 'Trying it out for myself', 'Reading the instructions']
  },
  {
    kicker: 'YOUR KIND OF CLASSROOM',
    title: 'How do you like to share what you know?',
    subtitle: 'Pick any that feel comfortable for you.',
    answers: ['Talking with the class', 'Writing or drawing my ideas', 'Making or showing something', 'Talking with a partner first']
  },
  {
    kicker: 'A LITTLE MORE ABOUT YOU',
    title: 'When something feels tricky, what helps you keep going?',
    subtitle: 'Choose the things that help you feel ready to try again.',
    answers: ['A hint or a small first step', 'A quiet moment to think', 'Working with a classmate', 'Trying a different way']
  }
];

let currentQuestion = 0;
const selections = questions.map(() => new Set());
const questionTitle = document.querySelector('#survey-question');
const questionSubtitle = document.querySelector('#survey-subtitle');
const questionKicker = document.querySelector('.survey-kicker');
const optionsContainer = document.querySelector('#survey-options');
const progressLabel = document.querySelector('#progress-label');
const progressFill = document.querySelector('#progress-fill');
const nextButton = document.querySelector('#survey-next');
const backButton = document.querySelector('#survey-back');
const surveyContent = document.querySelector('#survey-content');
const success = document.querySelector('#survey-success');

function renderQuestion() {
  const question = questions[currentQuestion];
  questionKicker.textContent = question.kicker;
  questionTitle.textContent = question.title;
  questionSubtitle.textContent = question.subtitle;
  progressLabel.textContent = `${currentQuestion + 1} of ${questions.length}`;
  progressFill.style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
  backButton.hidden = currentQuestion === 0;
  nextButton.innerHTML = currentQuestion === questions.length - 1
    ? 'Finish check-in <span>✓</span>'
    : 'Next question <span>→</span>';
  optionsContainer.replaceChildren(...question.answers.map((answer, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `survey-option${selections[currentQuestion].has(index) ? ' selected' : ''}`;
    button.setAttribute('aria-pressed', selections[currentQuestion].has(index));
    button.innerHTML = `<span class="option-mark" aria-hidden="true">✓</span><span></span>`;
    button.querySelector('span:last-child').textContent = answer;
    button.addEventListener('click', () => {
      if (selections[currentQuestion].has(index)) selections[currentQuestion].delete(index);
      else selections[currentQuestion].add(index);
      renderQuestion();
    });
    return button;
  }));
}

nextButton.addEventListener('click', () => {
  if (currentQuestion < questions.length - 1) {
    currentQuestion += 1;
    renderQuestion();
    return;
  }
  surveyContent.hidden = true;
  success.hidden = false;
  progressLabel.textContent = 'All done!';
  progressFill.style.width = '100%';
});

backButton.addEventListener('click', () => {
  if (currentQuestion > 0) {
    currentQuestion -= 1;
    renderQuestion();
  }
});

document.querySelector('#survey-again').addEventListener('click', () => {
  currentQuestion = 0;
  selections.forEach(selection => selection.clear());
  surveyContent.hidden = false;
  success.hidden = true;
  renderQuestion();
});

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav-links');
menuButton.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', isOpen);
  menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}));

renderQuestion();

const lessonActivities = {
  story: 'Your class can switch paths anytime.',
  listen: 'Talk it out: what does a seed need to grow?',
  try: 'Try it: plant a seed and check on it each day.'
};
document.querySelectorAll('.lesson-choice').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.lesson-choice').forEach(choice => {
      const active = choice === button;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-selected', active);
    });
    document.querySelector('#lesson-result').textContent = lessonActivities[button.dataset.choice];
  });
});
