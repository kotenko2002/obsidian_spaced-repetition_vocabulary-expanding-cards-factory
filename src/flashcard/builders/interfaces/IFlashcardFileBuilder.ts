import type { FlashcardData } from "../../types";

export interface IFlashcardFileBuilder {
	addFrontmatter(): IFlashcardFileBuilder;
	addSentenceGapCard(data: FlashcardData, sentenceIndex: number): IFlashcardFileBuilder;
	addDirectTranslationCard(data: FlashcardData): IFlashcardFileBuilder;
	addListeningCard(data: FlashcardData): IFlashcardFileBuilder;
	addSeparator(): IFlashcardFileBuilder;
	getContent(): string;
	reset(): IFlashcardFileBuilder;
}
