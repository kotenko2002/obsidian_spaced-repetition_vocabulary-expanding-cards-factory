import type { IFlashcardFileBuilder } from "../services/interfaces/IFlashcardFileBuilder";
import type { AudioDownloadService } from "../services/AudioDownloadService";
import { VaultStorageService } from "../services/VaultStorageService";
import { termToFlashcardFileBase } from "../helpers/termHelpers";
import { CreateFlashcardFilesPluginSettings, DEFAULT_SETTINGS } from "../settings";
import type {
	EnrichedImageFlashcardData,
	ImageFlashcardData,
} from "../models/ImageFlashcardData";

const IMAGE_FLASHCARD_TAGS = ["flashcards/english/vocabulary-v2"];

export class ImageFlashcardController {
	private readonly flashcardFolderPath: string;

	constructor(
		private readonly storage: VaultStorageService,
		private readonly audioService: AudioDownloadService,
		private readonly fileBuilder: IFlashcardFileBuilder,
		settings: CreateFlashcardFilesPluginSettings,
	) {
		this.flashcardFolderPath = settings.flashcardFileFolderPath || DEFAULT_SETTINGS.flashcardFileFolderPath;
	}

	public async createFlashcard(data: EnrichedImageFlashcardData): Promise<void> {
		const audioFilePaths = await this.audioService.downloadAudioFiles(
			data.term,
			data.skipFullTermLookup ?? false,
			data.skipAudio ?? false,
		);

		const dataWithAudio: ImageFlashcardData = { ...data, audioFilePaths };
		const flashcardMarkdown = this.fileBuilder
			.reset()
			.addSentenceGapWithImageCard(dataWithAudio)
			.withCustomTags(IMAGE_FLASHCARD_TAGS)
			.build();

		await this.createFlashcardFile(flashcardMarkdown, data.term, data.uuid);
	}

	public async countdownDelay(nextWord: string, index?: number, total?: number): Promise<void> {
		await this.audioService.countdownDelay(nextWord, index, total);
	}

	private async createFlashcardFile(
		flashcardMarkdown: string,
		term: string,
		uuid: string,
	): Promise<string> {
		const flashcardFileBase = termToFlashcardFileBase(term);
		const flashcardFileName = `(VOC) ${flashcardFileBase} ${uuid}.md`;
		const flashcardFilePath = `${this.flashcardFolderPath}/${flashcardFileName}`;

		await this.storage.createFolderIfNotExists(this.flashcardFolderPath);
		await this.storage.createFileIfNotExists(flashcardFilePath, flashcardMarkdown);

		return flashcardFilePath;
	}
}
