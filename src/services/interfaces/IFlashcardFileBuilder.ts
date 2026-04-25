import type { FlashcardData } from "../../models/FlashcardData";
import type { ImageFlashcardData } from "../../models/ImageFlashcardData";

export interface IFlashcardFileBuilder {
	addSentenceGapCard(data: FlashcardData, sentenceIndex: number): IFlashcardFileBuilder;
	addSentenceGapCards(data: FlashcardData): IFlashcardFileBuilder;
	addDirectTranslationCard(data: FlashcardData): IFlashcardFileBuilder;
	addListeningCard(data: FlashcardData): IFlashcardFileBuilder;
	addSentenceGapWithImageCard(data: ImageFlashcardData): IFlashcardFileBuilder;
	withCustomTags(tags: string[]): IFlashcardFileBuilder;
	reset(): IFlashcardFileBuilder;
	build(): string;
}
