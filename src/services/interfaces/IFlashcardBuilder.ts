export interface IFlashcardBuilder {
	addTitle(title: string): IFlashcardBuilder;
	addSentence(sentence: string): IFlashcardBuilder;
	addQuestionLine(): IFlashcardBuilder;
	addSentenceAnswer(sentenceAnswer: string): IFlashcardBuilder;
	addTermExplanation(term: string, explanation: string): IFlashcardBuilder;
	addAudioUs(audioUs: string[]): IFlashcardBuilder;
	addAudioUk(audioUk: string[]): IFlashcardBuilder;
	reset(): IFlashcardBuilder;
	build(): string;
}
