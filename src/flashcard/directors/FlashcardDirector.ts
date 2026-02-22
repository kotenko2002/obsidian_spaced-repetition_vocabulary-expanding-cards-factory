import type { IFlashcardFileBuilder } from "../builders/interfaces/IFlashcardFileBuilder";
import type { FlashcardData } from "../types";
import type { CambridgeAudioService } from "../services/CambridgeAudioService";

export class FlashcardDirector {
	constructor(private readonly cambridgeAudioService: CambridgeAudioService) {}

	async buildAllCards(
		fileBuilder: IFlashcardFileBuilder,
		data: FlashcardData,
	): Promise<string> {
		const { ukPath, usPath } = await this.cambridgeAudioService.fetchAndSave(
			data.phrase,
		);
		const dataWithAudio: FlashcardData = {
			...data,
			audioUk: ukPath,
			audioUs: usPath,
		};

		fileBuilder.reset();

		fileBuilder.addFrontmatter();
		for (let i = 0; i < dataWithAudio.sentences.length; i++) {
			fileBuilder.addSentenceGapCard(dataWithAudio, i).addSeparator();
		}
		fileBuilder.addDirectTranslationCard(dataWithAudio).addSeparator();
		fileBuilder.addListeningCard(dataWithAudio);

		const content = fileBuilder.getContent();
		fileBuilder.reset();

		return content;
	}
}
