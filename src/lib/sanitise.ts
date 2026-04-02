const MAX_TTS_CHARS = 500;

/**
 * Sanitises text for TTS output: strips markdown syntax, URLs, headings,
 * HTML tags, and excess whitespace, then hard-truncates to MAX_TTS_CHARS.
 */
export function sanitiseForTTS(input: string, maxChars = MAX_TTS_CHARS): string {
  let text = input;

  // Strip fenced code blocks
  text = text.replace(/```[\s\S]*?```/g, "");
  // Strip inline code
  text = text.replace(/`[^`]*`/g, "");
  // Strip bold/italic markers (**text**, __text__, *text*, _text_)
  text = text.replace(/(\*{1,3}|_{1,3})([^*_]+)\1/g, "$2");
  // Strip ATX headings (# ## ### …)
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Strip blockquotes
  text = text.replace(/^>\s*/gm, "");
  // Strip HTML tags — loop until stable to handle nested/malformed tags
  let prevText = "";
  while (prevText !== text) {
    prevText = text;
    text = text.replace(/<[^>]+>/g, "");
  }
  // Strip URLs (http/https/ftp)
  text = text.replace(/https?:\/\/\S+/g, "");
  text = text.replace(/ftp:\/\/\S+/g, "");
  // Strip bullet / numbered list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");
  // Collapse excess newlines / whitespace
  text = text.replace(/\n{2,}/g, " ").replace(/\s{2,}/g, " ").trim();

  // Hard truncate
  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    // Avoid cutting in the middle of a word
    const lastSpace = text.lastIndexOf(" ");
    if (lastSpace > maxChars - 50) {
      text = text.slice(0, lastSpace);
    }
  }

  return text;
}
