import type { IFlashcardFileBuilder } from "./interfaces/IFlashcardFileBuilder";
import type { IFlashcardBuilder } from "./interfaces/IFlashcardBuilder";
import type { FlashcardData } from "../types";

const SENTENCE_GAP_TITLE = "Вправа з пропущеним словом";
const DIRECT_TRANSLATION_TITLE = "Вправа з прямого перекладу";
const LISTENING_TITLE = "Вправа з сприйняття на слух";
const DEFAULT_FRONTMATTER_TAGS = ["flashcards/english/vocabulary"];

function formatCreatedAt(date: Date): string {
	return new Intl.DateTimeFormat("sv-SE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(date);
}

export class FlashcardFileBuilder implements IFlashcardFileBuilder {
	constructor(private readonly flashcardBuilder: IFlashcardBuilder) {}

	addFrontmatter(): IFlashcardFileBuilder {
		const createdAt = formatCreatedAt(new Date());
		const tagsBlock = DEFAULT_FRONTMATTER_TAGS.map((t) => `  - ${t}`).join("\n");

		const frontmatter = `---
created at: "${createdAt}"
tags:
${tagsBlock}
---
`;
		this.flashcardBuilder.addRaw(frontmatter);
		return this;
	}

	addSentenceGapCard(data: FlashcardData, sentenceIndex: number): IFlashcardFileBuilder {
		const sentence = data.sentences[sentenceIndex];
		if (sentence === undefined) {
			throw new RangeError(`Invalid sentenceIndex: ${sentenceIndex}`);
		}

		this.flashcardBuilder
			.addTitle(SENTENCE_GAP_TITLE)
			.addSentence(sentence)
			.addQuestionLine()
			.addPhraseExplanation(data.phrase, data.explanation)
			.addAudioUs(data.audioUs)
			.addAudioUk(data.audioUk);
		return this;
	}

	addDirectTranslationCard(data: FlashcardData): IFlashcardFileBuilder {
		this.flashcardBuilder
			.addTitle(DIRECT_TRANSLATION_TITLE)
			.addSentence(data.phrase)
			.addQuestionLine()
			.addPhraseExplanation(data.phrase, data.explanation)
			.addAudioUs(data.audioUs)
			.addAudioUk(data.audioUk);
		return this;
	}

	addListeningCard(data: FlashcardData): IFlashcardFileBuilder {
		this.flashcardBuilder
			.addTitle(LISTENING_TITLE)
			.addAudioUs(data.audioUs)
			.addAudioUk(data.audioUk)
			.addQuestionLine()
			.addPhraseExplanation(data.phrase, data.explanation);
		return this;
	}

	addSeparator(): IFlashcardFileBuilder {
		this.flashcardBuilder.addSeparator();
		return this;
	}

	getContent(): string {
		return this.flashcardBuilder.getCard().content;
	}

	reset(): IFlashcardFileBuilder {
		this.flashcardBuilder.reset();
		return this;
	}
}
