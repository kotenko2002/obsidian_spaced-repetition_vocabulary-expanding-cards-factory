function normalizeWordOrPhrase(wordOrPhrase: string, spaceReplacement: string): string {
	return wordOrPhrase.trim().toLowerCase().replace(/\s+/g, spaceReplacement);
}

export function wordOrPhraseToUrlSegment(wordOrPhrase: string): string {
	return normalizeWordOrPhrase(wordOrPhrase, "-");
}

export function wordOrPhraseToFileBase(wordOrPhrase: string): string {
	return normalizeWordOrPhrase(wordOrPhrase, "_");
}
