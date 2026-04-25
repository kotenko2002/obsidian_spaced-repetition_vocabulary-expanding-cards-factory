import type { ImageInputFlashcardData } from "./ImageInputFlashcardData";
import type { FlashcardAudioFilePaths } from "./FlashcardData";

export interface EnrichedImageFlashcardData extends ImageInputFlashcardData {
	uuid: string;
	imagePath?: string;
}

export interface ImageFlashcardData extends EnrichedImageFlashcardData {
	audioFilePaths: FlashcardAudioFilePaths;
}
