export interface FlashcardData {
	phrase: string;
	explanation: string;
	sentences: string[];
	audioFilePaths: FlashcardAudioFilePaths;
}

export interface FlashcardAudioFilePaths {
	us: string[];
	uk: string[];
}
