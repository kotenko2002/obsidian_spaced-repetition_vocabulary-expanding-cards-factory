import type { IFlashcardFileBuilder } from "./interfaces/IFlashcardFileBuilder";
import type { CambridgeAudioService } from "./CambridgeAudioService";
import { VaultStorageService } from "./VaultStorageService";
import { termToAudioFileBase, termToFlashcardFileBase } from "../helpers/termHelpers";
import { CreateFlashcardFilesPluginSettings, DEFAULT_SETTINGS } from "../settings";
import { InputFlashcardData } from "../models/InputFlashcardData";
import type { FlashcardAudio, FlashcardData } from "../models/FlashcardData";

export class FlashcardDirector {
	constructor(
		private readonly storage: VaultStorageService,
		private readonly cambridgeAudioService: CambridgeAudioService,
		private readonly fileBuilder: IFlashcardFileBuilder,
		private readonly settings: CreateFlashcardFilesPluginSettings,
	) { }

	async buildAllCards(data: InputFlashcardData): Promise<string> {
		const storageFolderPath = this.settings.audioFolderPath || DEFAULT_SETTINGS.audioFolderPath;
		const flashcardFolderPath = this.settings.flashcardFileFolderPath || DEFAULT_SETTINGS.flashcardFileFolderPath;

		const lookupPhrase = data.lookupPhrase?.trim() || data.phrase;
		const { ukData, usData } = await this.cambridgeAudioService.fetch(lookupPhrase);

		await this.storage.createFolderIfNotExists(storageFolderPath);

		const audioFileBase = termToAudioFileBase(data.phrase);
		const audio: FlashcardAudio = {
			uk: `${storageFolderPath}/${audioFileBase}_uk.ogg`,
			us: `${storageFolderPath}/${audioFileBase}_us.ogg`,
		};

		await Promise.all([
			this.storage.createBinaryIfNotExists(audio.uk, ukData),
			this.storage.createBinaryIfNotExists(audio.us, usData),
		]);

		const dataWithAudio: FlashcardData = {
			...data,
			audio,
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
