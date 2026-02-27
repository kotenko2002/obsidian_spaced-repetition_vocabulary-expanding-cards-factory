function normalizeTerm(term: string, spaceReplacement: string): string {
	return term.trim().toLowerCase().replace(/\s+/g, spaceReplacement);
}

export function termToUrlSegment(term: string): string {
	return normalizeTerm(term, "-");
}

export function termToAudioFileBase(term: string): string {
	return normalizeTerm(term, "_");
}

export function termToFlashcardFileBase(term: string): string {
	return normalizeTerm(term, " ");
}
