import type { IFlashcardFileBuilder } from "./interfaces/IFlashcardFileBuilder";
import type { CambridgeAudioService } from "./CambridgeAudioService";
import { VaultStorageService } from "./VaultStorageService";
import { termToAudioFileBase, termToFlashcardFileBase } from "../helpers/termHelpers";
import { CreateFlashcardFilesPluginSettings, DEFAULT_SETTINGS } from "../settings";
import { InputFlashcardData } from "../models/InputFlashcardData";
import type { FlashcardAudioFilePaths, FlashcardData } from "../models/FlashcardData";

export class FlashcardDirector {
	constructor(
		private readonly storage: VaultStorageService,
		private readonly cambridgeAudioService: CambridgeAudioService,
		private readonly fileBuilder: IFlashcardFileBuilder,
		private readonly settings: CreateFlashcardFilesPluginSettings,
	) { }

	public async buildAllCards(data: InputFlashcardData): Promise<string> {
		const storageFolderPath = this.settings.audioFolderPath || DEFAULT_SETTINGS.audioFolderPath;
		const flashcardFolderPath = this.settings.flashcardFileFolderPath || DEFAULT_SETTINGS.flashcardFileFolderPath;

		await this.storage.createFolderIfNotExists(storageFolderPath);

		const lookupPhrases = (data.lookupPhrase && data.lookupPhrase.length > 0)
			? data.lookupPhrase
			: [data.phrase];
		const audioUsPaths: string[] = [];
		const audioUkPaths: string[] = [];

		for (const lookupPhrase of lookupPhrases) {
			const trimmedLookupPhrase = lookupPhrase.trim();
			if (!trimmedLookupPhrase) {
				continue;
			}

			const { ukData, usData } = await this.cambridgeAudioService.fetch(trimmedLookupPhrase);

			const audioFileBase = termToAudioFileBase(trimmedLookupPhrase);
			const ukPath = `${storageFolderPath}/${audioFileBase}_uk.ogg`;
			const usPath = `${storageFolderPath}/${audioFileBase}_us.ogg`;

			audioUkPaths.push(ukPath);
			audioUsPaths.push(usPath);

			await Promise.all([
				this.storage.createBinaryIfNotExists(ukPath, ukData),
				this.storage.createBinaryIfNotExists(usPath, usData),
			]);
		}

		const audioFilePaths: FlashcardAudioFilePaths = {
			uk: audioUkPaths,
			us: audioUsPaths,
		};

		const dataWithAudio: FlashcardData = {
			...data,
			audioFilePaths,
		};

		const flashcardMarkdown = this.fileBuilder
			.reset()
			.addSentenceGapCards(dataWithAudio)
			.addDirectTranslationCard(dataWithAudio)
			.addListeningCard(dataWithAudio)
			.build();

		const flashcardFileBase = termToFlashcardFileBase(data.phrase);
		const flashcardFileName = `(VOC) ${flashcardFileBase}.md`;
		const flashcardFilePath = `${flashcardFolderPath}/${flashcardFileName}`;

		await this.storage.createFolderIfNotExists(flashcardFolderPath);
		await this.storage.createFileIfNotExists(flashcardFilePath, flashcardMarkdown);

		return flashcardMarkdown;
	}
}
