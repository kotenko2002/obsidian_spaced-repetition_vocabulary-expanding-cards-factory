export interface FlashcardData {
	phrase: string;
	explanation: string;
	sentences: string[];
	audio: FlashcardAudio;
}

export interface FlashcardAudio {
	us: string;
	uk: string;
}
