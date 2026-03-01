import type { InputSentenceData } from "./InputFlashcardData";

export interface FlashcardData {
	term: string;
	explanation: string;
	sentences: InputSentenceData[];
	audioFilePaths: FlashcardAudioFilePaths;
}

export interface FlashcardAudioFilePaths {
	us: string[];
	uk: string[];
}
