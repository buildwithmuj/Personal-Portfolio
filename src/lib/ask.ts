/**
 * The search in Ask me (Interview.astro): which of the owner's written answers fit
 * what a visitor types. Plain word matching, no AI: every meaningful word typed must start a word
 * in the question or its answer, questions that match coming before answers that do.
 */
const FILLER = new Set(
  [
    'a about an and are can could did do does for how i in is it me my of on or so tell the',
    'to what when where which who why with would you your',
  ]
    .join(' ')
    .split(' '),
);

const words = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** The words of a query worth matching on, lower-cased, with filler like "how do you" left out. */
export function queryWords(query: string): string[] {
  return words(query).filter((word) => !FILLER.has(word));
}

/** The indexes of the questions that fit the query, best first; all of them for an empty query. */
export function matchQuestions(
  query: string,
  items: readonly { question: string; answer: string }[],
): number[] {
  const wanted = queryWords(query);
  const fits = (text: string) => {
    const own = words(text);
    return wanted.every((word) => own.some((candidate) => candidate.startsWith(word)));
  };
  const byQuestion = items.flatMap((item, index) => (fits(item.question) ? [index] : []));
  const byAnswer = items.flatMap((item, index) =>
    !byQuestion.includes(index) && fits(`${item.question} ${item.answer}`) ? [index] : [],
  );
  return [...byQuestion, ...byAnswer];
}

/** An email to the owner with the visitor's unanswered question in it. */
export function askMailto(email: string, question: string): string {
  const subject = encodeURIComponent('A question from your site');
  return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(question)}`;
}
