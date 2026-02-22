import type { IFlashcardFileBuilder } from "../builders/interfaces/IFlashcardFileBuilder";
import type { FlashcardData } from "../types";

export class FlashcardDirector {
	buildAllCards(fileBuilder: IFlashcardFileBuilder, data: FlashcardData): string {
		fileBuilder.reset();

		fileBuilder.addFrontmatter();
		for (let i = 0; i < data.sentences.length; i++) {
			fileBuilder.addSentenceGapCard(data, i).addSeparator();
		}
		fileBuilder.addDirectTranslationCard(data).addSeparator();
		fileBuilder.addListeningCard(data);

		const content = fileBuilder.getContent();
		fileBuilder.reset();

		return content;
	}
}
