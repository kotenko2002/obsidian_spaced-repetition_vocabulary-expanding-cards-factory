import type { FlashcardFile } from "../../FlashcardFile";

export interface IFlashcardBuilder {
	addRaw(text: string): IFlashcardBuilder;
	addTitle(title: string): IFlashcardBuilder;
	addSentence(sentence: string): IFlashcardBuilder;
	addQuestionLine(): IFlashcardBuilder;
	addPhraseExplanation(phrase: string, explanation: string): IFlashcardBuilder;
	addAudioUs(audioUs: string): IFlashcardBuilder;
	addAudioUk(audioUk: string): IFlashcardBuilder;
	addSeparator(): IFlashcardBuilder;
	reset(): IFlashcardBuilder;
	getCard(): FlashcardFile;
}
