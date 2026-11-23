/** One numbered section of a legal document: a heading, paragraphs, and an optional bullet list. */
export type LegalSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};
