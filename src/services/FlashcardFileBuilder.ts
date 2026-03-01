import type { IFlashcardFileBuilder } from "./interfaces/IFlashcardFileBuilder";
import type { IFlashcardBuilder } from "./interfaces/IFlashcardBuilder";
import type { FlashcardData } from "../models/FlashcardData";

const SENTENCE_GAP_TITLE = "Вправа з пропущеним словом";
const DIRECT_TRANSLATION_TITLE = "Вправа з прямого перекладу";
const LISTENING_TITLE = "Вправа з сприйняття на слух";
const FRONTMATTER_TAGS = ["flashcards/english/vocabulary"];
const LINE_BREAK = "\n";
const SEPARATOR = `${LINE_BREAK}---${LINE_BREAK}${LINE_BREAK}`;

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
	private cards: string[] = [];
	private readonly flashcardBuilder: IFlashcardBuilder;

	constructor(flashcardBuilder: IFlashcardBuilder) {
		this.flashcardBuilder = flashcardBuilder;
	}

	public addSentenceGapCard(data: FlashcardData, sentenceIndex: number): IFlashcardFileBuilder {
		const sentenceData = data.sentences[sentenceIndex];
		if (sentenceData === undefined) {
			throw new RangeError(`Invalid sentenceIndex: ${sentenceIndex}`);
		}

		const cardContent = this.flashcardBuilder.reset()
			.addTitle(SENTENCE_GAP_TITLE)
			.addSentence(sentenceData.sentence)
			.addQuestionLine()
			.addSentenceAnswer(sentenceData.termInSentenceForm)
			.addTermExplanation(data.term, data.explanation)
			.addAudioUs(data.audioFilePaths.us)
			.addAudioUk(data.audioFilePaths.uk)
			.build();

		this.cards.push(cardContent);

		return this;
	}

	public addSentenceGapCards(data: FlashcardData): IFlashcardFileBuilder {
		for (let i = 0; i < data.sentences.length; i++) {
			this.addSentenceGapCard(data, i);
		}

		return this;
	}

	public addDirectTranslationCard(data: FlashcardData): IFlashcardFileBuilder {
		const cardContent = this.flashcardBuilder.reset()
			.addTitle(DIRECT_TRANSLATION_TITLE)
			.addSentence(data.term)
			.addQuestionLine()
			.addTermExplanation(data.term, data.explanation)
			.addAudioUs(data.audioFilePaths.us)
			.addAudioUk(data.audioFilePaths.uk)
			.build();

		this.cards.push(cardContent);

		return this;
	}

	public addListeningCard(data: FlashcardData): IFlashcardFileBuilder {
		const cardContent = this.flashcardBuilder.reset()
			.addTitle(LISTENING_TITLE)
			.addAudioUs(data.audioFilePaths.us)
			.addAudioUk(data.audioFilePaths.uk)
			.addQuestionLine()
			.addTermExplanation(data.term, data.explanation)
			.build();

		this.cards.push(cardContent);

		return this;
	}

	public reset(): IFlashcardFileBuilder {
		this.cards = [];
		this.flashcardBuilder.reset();
		return this;
	}

	public build(): string {
		return this.addFrontmatter() + this.cards.join(SEPARATOR);
	}

	private addFrontmatter(): string {
		const createdAt = formatCreatedAt(new Date());
		const tagsBlock = FRONTMATTER_TAGS.map((t) => `  - ${t}`).join("\n");

		return `---
created at: "${createdAt}"
tags:
${tagsBlock}
---
`;
	}
}
