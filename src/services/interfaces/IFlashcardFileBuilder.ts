import type { FlashcardData } from "../../models/FlashcardData";

export interface IFlashcardFileBuilder {
	addSentenceGapCard(data: FlashcardData, sentenceIndex: number): IFlashcardFileBuilder;
	addSentenceGapCards(data: FlashcardData): IFlashcardFileBuilder;
	addDirectTranslationCard(data: FlashcardData): IFlashcardFileBuilder;
	addListeningCard(data: FlashcardData): IFlashcardFileBuilder;
	reset(): IFlashcardFileBuilder;
	build(): string;
}
