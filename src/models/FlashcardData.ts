export interface FlashcardData {
	term: string;
	explanation: string;
	sentences: string[];
	audioFilePaths: FlashcardAudioFilePaths;
}

export interface FlashcardAudioFilePaths {
	us: string[];
	uk: string[];
}
