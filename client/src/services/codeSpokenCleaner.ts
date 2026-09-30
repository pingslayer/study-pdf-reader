/**
 * Transforms raw code syntax into a clean, natural spoken representation for ElevenLabs TTS,
 * avoiding awkward rapid-fire punctuation reading.
 */
export function convertCodeToSpokenText(code: string): string {
  const lines = code.split('\n');
  const spokenLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Handle preprocessor directives
    if (line.startsWith('#include')) {
      const header = line.replace('#include', '').replace(/[<>"]/g, '').trim();
      spokenLines.push(`Include header ${header}.`);
      continue;
    }

    if (line.startsWith('#define')) {
      spokenLines.push(`Define macro ${line.replace('#define', '').trim()}.`);
      continue;
    }

    let spoken = line;

    // Clean common symbols into natural words
    spoken = spoken
      .replace(/->/g, ' arrow ')
      .replace(/==/g, ' is equal to ')
      .replace(/!=/g, ' is not equal to ')
      .replace(/<=/g, ' less than or equal to ')
      .replace(/>=/g, ' greater than or equal to ')
      .replace(/&&/g, ' and ')
      .replace(/\|\|/g, ' or ')
      .replace(/\+\+/g, ' plus plus ')
      .replace(/--/g, ' minus minus ')
      .replace(/\+=/g, ' plus equals ')
      .replace(/-=/g, ' minus equals ')
      .replace(/\*=/g, ' times equals ')
      .replace(/\{/g, ' open brace. ')
      .replace(/\}/g, ' close brace. ')
      .replace(/\(/g, ', open paren, ')
      .replace(/\)/g, ', close paren, ')
      .replace(/\[/g, ', open bracket, ')
      .replace(/\]/g, ', close bracket, ')
      .replace(/;/g, ', semicolon. ')
      .replace(/"([^"]*)"/g, ' string $1 ')
      .replace(/\\n/g, ' newline ')
      .replace(/\\t/g, ' tab ')
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure terminal period
    if (!spoken.endsWith('.')) {
      spoken += '.';
    }

    spokenLines.push(spoken);
  }

  return spokenLines.join(' ');
}
