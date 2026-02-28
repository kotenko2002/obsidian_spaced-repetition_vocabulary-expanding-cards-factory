import type { IFlashcardFileBuilder } from "../services/interfaces/IFlashcardFileBuilder";
import type { CambridgeAudioService } from "../services/CambridgeAudioService";
import { VaultStorageService } from "../services/VaultStorageService";
import { termToAudioFileBase, termToFlashcardFileBase } from "../helpers/termHelpers";
import { CreateFlashcardFilesPluginSettings, DEFAULT_SETTINGS } from "../settings";
import { InputFlashcardData } from "../models/InputFlashcardData";
import type { FlashcardAudioFilePaths, FlashcardData } from "../models/FlashcardData";

export class FlashcardController {
	private readonly audioFolderPath: string;
	private readonly flashcardFolderPath: string;

	constructor(
		private readonly storage: VaultStorageService,
		private readonly cambridgeAudioService: CambridgeAudioService,
		private readonly fileBuilder: IFlashcardFileBuilder,
		settings: CreateFlashcardFilesPluginSettings,
	) {
		this.audioFolderPath = settings.audioFolderPath || DEFAULT_SETTINGS.audioFolderPath;
		this.flashcardFolderPath = settings.flashcardFileFolderPath || DEFAULT_SETTINGS.flashcardFileFolderPath;
	}

	public async createFlashcard(data: InputFlashcardData) {
		const audioFilePaths = await this.downloadAudioFilesAndGetPaths(data);

		const dataWithAudio: FlashcardData = { ...data, audioFilePaths };
		const flashcardMarkdown = this.buildFlashcardMarkdown(dataWithAudio);

		await this.createFlashcardFile(flashcardMarkdown, data.phrase);
	}

	private async downloadAudioFilesAndGetPaths(
		data: InputFlashcardData,
	): Promise<FlashcardAudioFilePaths> {
		await this.storage.createFolderIfNotExists(this.audioFolderPath);

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
			const ukPath = `${this.audioFolderPath}/${audioFileBase}_uk.ogg`;
			const usPath = `${this.audioFolderPath}/${audioFileBase}_us.ogg`;

			audioUkPaths.push(ukPath);
			audioUsPaths.push(usPath);

			await Promise.all([
				this.storage.createBinaryIfNotExists(ukPath, ukData),
				this.storage.createBinaryIfNotExists(usPath, usData),
			]);
		}

		return {
			uk: audioUkPaths,
			us: audioUsPaths,
		};
	}

	private buildFlashcardMarkdown(dataWithAudio: FlashcardData): string {
		return this.fileBuilder
			.reset()
			.addSentenceGapCards(dataWithAudio)
			.addDirectTranslationCard(dataWithAudio)
			.addListeningCard(dataWithAudio)
			.build();
	}

	private async createFlashcardFile(
		flashcardMarkdown: string,
		phrase: string,
	): Promise<string> {
		const flashcardFileBase = termToFlashcardFileBase(phrase);
		const flashcardFileName = `(VOC) ${flashcardFileBase}.md`;
		const flashcardFilePath = `${this.flashcardFolderPath}/${flashcardFileName}`;

		await this.storage.createFolderIfNotExists(this.flashcardFolderPath);
		await this.storage.createFileIfNotExists(flashcardFilePath, flashcardMarkdown);

		return flashcardFilePath;
	}
}
