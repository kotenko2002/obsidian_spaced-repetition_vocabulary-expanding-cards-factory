import type { Vault } from "obsidian";
import type { IFlashcardFileBuilder } from "./interfaces/IFlashcardFileBuilder";
import type { FlashcardData } from "../types";
import type { CambridgeAudioService } from "./CambridgeAudioService";
import { VaultStorageService } from "./VaultStorageService";
import { wordOrPhraseToFileBase } from "../helpers/wordPhraseHelpers";

export class FlashcardDirector {
	private readonly vault: Vault;

	constructor(
		vault: Vault,
		private readonly storage: VaultStorageService,
		private readonly cambridgeAudioService: CambridgeAudioService,
		private readonly fileBuilder: IFlashcardFileBuilder,
	) {
		this.vault = vault;
	}

	async buildAllCards(
		data: FlashcardData,
	): Promise<string> {
		const storageFolderPath = "_Cache"; // TODO: take from settings

		const { ukData, usData } = await this.cambridgeAudioService.fetch(data.phrase);

		await this.storage.createFolderIfNotExists(storageFolderPath);

		const fileBase = wordOrPhraseToFileBase(data.phrase);
		const ukFilePath = `${storageFolderPath}/${fileBase}_uk.ogg`;
		const usFilePath = `${storageFolderPath}/${fileBase}_us.ogg`;

		await Promise.all([
			this.storage.createBinaryIfNotExists(ukFilePath, ukData),
			this.storage.createBinaryIfNotExists(usFilePath, usData),
		]);

		const dataWithAudio: FlashcardData = {
			...data,
			audioUk: ukFilePath,
			audioUs: usFilePath,
		};

		return this.fileBuilder
			.reset()
			.addSentenceGapCards(dataWithAudio)
			.addDirectTranslationCard(dataWithAudio)
			.addListeningCard(dataWithAudio)
			.build();
	}
}
