import type { IFlashcardBuilder } from "./interfaces/IFlashcardBuilder";

const LINE_BREAK = "\n";

export class FlashcardBuilder implements IFlashcardBuilder {
	private content: string = "";

	addTitle(title: string): IFlashcardBuilder {
		this.content += `## ${title}${LINE_BREAK}${LINE_BREAK}`;
		return this;
	}

	addSentence(sentence: string): IFlashcardBuilder {
		this.content += `${sentence}${LINE_BREAK}`;
		return this;
	}

	addQuestionLine(): IFlashcardBuilder {
		this.content += `?${LINE_BREAK}`;
		return this;
	}

	addPhraseExplanation(phrase: string, explanation: string): IFlashcardBuilder {
		this.content += `**${phrase}** — ${explanation}${LINE_BREAK}`;
		return this;
	}

	addAudioUs(audioUs: string): IFlashcardBuilder {
		this.content += `🗽${LINE_BREAK}`;
		this.content += `![[${audioUs}]]${LINE_BREAK}`;
		return this;
	}

	addAudioUk(audioUk: string): IFlashcardBuilder {
		this.content += `💂‍♂️${LINE_BREAK}`;
		this.content += `![[${audioUk}]]${LINE_BREAK}`;
		return this;
	}

	reset(): IFlashcardBuilder {
		this.content = "";
		return this;
	}

	build(): string {
		return this.content;
	}
}
