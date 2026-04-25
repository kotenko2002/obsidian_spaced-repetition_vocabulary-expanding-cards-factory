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

export function termToImageFileBase(term: string, uuid: string): string {
	const normalized = normalizeTerm(term, "_");
	return `${normalized}_${uuid}`;
}

export function generateShortUuid(): string {
	return crypto.randomUUID().slice(0, 8);
}
