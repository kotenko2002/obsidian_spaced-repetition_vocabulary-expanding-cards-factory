import type { IFlashcardFileBuilder } from "./interfaces/IFlashcardFileBuilder";
import type { FlashcardData } from "../types";
import type { CambridgeAudioService } from "./CambridgeAudioService";

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

		return fileBuilder
			.reset()
			.addSentenceGapCards(dataWithAudio)
			.addDirectTranslationCard(dataWithAudio)
			.addListeningCard(dataWithAudio)
			.build();
	}
}
