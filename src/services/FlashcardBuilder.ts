import type { IFlashcardBuilder } from "./interfaces/IFlashcardBuilder";

const LINE_BREAK = "\n";

export class FlashcardBuilder implements IFlashcardBuilder {
	private content: string = "";

	public addTitle(title: string): IFlashcardBuilder {
		this.content += `## ${title}${LINE_BREAK}${LINE_BREAK}`;
		return this;
	}

	public addSentence(sentence: string): IFlashcardBuilder {
		this.content += `${sentence}${LINE_BREAK}`;
		return this;
	}

	public addQuestionLine(): IFlashcardBuilder {
		this.content += `?${LINE_BREAK}`;
		return this;
	}

	public addPhraseExplanation(phrase: string, explanation: string): IFlashcardBuilder {
		this.content += `**${phrase}** — ${explanation}${LINE_BREAK}`;
		return this;
	}

	public addAudioUs(audioUs: string[]): IFlashcardBuilder {
		return this.addAudioSection("🗽", audioUs);
	}

	public addAudioUk(audioUk: string[]): IFlashcardBuilder {
		return this.addAudioSection("💂‍♂️", audioUk);
	}

	public reset(): IFlashcardBuilder {
		this.content = "";
		return this;
	}

	public build(): string {
		return this.content;
	}

	private addAudioSection(emoji: string, audioPaths: string[]): IFlashcardBuilder {
		this.content += `${emoji}${LINE_BREAK}`;
		for (const path of audioPaths) {
			this.content += `![[${path}]]${LINE_BREAK}`;
		}
		return this;
	}
}
