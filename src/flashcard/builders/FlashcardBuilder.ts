import { FlashcardFile } from "../FlashcardFile";
import type { IFlashcardBuilder } from "./interfaces/IFlashcardBuilder";

const LINE_BREAK = "\n";

export class FlashcardBuilder implements IFlashcardBuilder {
	private readonly card: FlashcardFile;

	constructor(card: FlashcardFile) {
		this.card = card;
	}

	addRaw(text: string): IFlashcardBuilder {
		this.card.content += text;
		return this;
	}

	addTitle(title: string): IFlashcardBuilder {
		this.card.content += `## ${title}${LINE_BREAK}${LINE_BREAK}`;
		return this;
	}

	addSentence(sentence: string): IFlashcardBuilder {
		this.card.content += `${sentence}${LINE_BREAK}`;
		return this;
	}

	addQuestionLine(): IFlashcardBuilder {
		this.card.content += `?${LINE_BREAK}`;
		return this;
	}

	addPhraseExplanation(phrase: string, explanation: string): IFlashcardBuilder {
		this.card.content += `**${phrase}** — ${explanation}${LINE_BREAK}`;
		return this;
	}

	addAudioUs(audioUs: string): IFlashcardBuilder {
		this.card.content += `🗽${LINE_BREAK}`;
		this.card.content += `![[${audioUs}]]${LINE_BREAK}`;
		return this;
	}

	addAudioUk(audioUk: string): IFlashcardBuilder {
		this.card.content += `💂‍♂️${LINE_BREAK}`;
		this.card.content += `![[${audioUk}]]${LINE_BREAK}`;
		return this;
	}

	addSeparator(): IFlashcardBuilder {
		this.card.content += `${LINE_BREAK}---${LINE_BREAK}${LINE_BREAK}`;
		return this;
	}

	reset(): IFlashcardBuilder {
		this.card.content = "";
		return this;
	}

	getCard(): FlashcardFile {
		return this.card;
	}
}
