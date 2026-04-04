import type { IFlashcardFileBuilder } from "../services/interfaces/IFlashcardFileBuilder";
import type { CambridgeAudioService } from "../services/CambridgeAudioService";
import { VaultStorageService } from "../services/VaultStorageService";
import { concatenateMp3, convertOggToMp3 } from "../services/AudioConversionService";
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

		await this.createFlashcardFile(flashcardMarkdown, data.term);
	}

	private async downloadAudioFilesAndGetPaths(
		data: InputFlashcardData,
	): Promise<FlashcardAudioFilePaths> {
		await this.storage.createFolderIfNotExists(this.audioFolderPath);

		const lookupTerms = (data.lookupTerm && data.lookupTerm.length > 0)
			? data.lookupTerm
			: [data.term];

		const ukMp3Buffers: ArrayBuffer[] = [];
		const usMp3Buffers: ArrayBuffer[] = [];

		for (const lookupTerm of lookupTerms) {
			const trimmed = lookupTerm.trim();
			if (!trimmed) {
				continue;
			}

			const { ukData, usData } = await this.cambridgeAudioService.fetch(trimmed);

			const ukMp3 = ukData ? await convertOggToMp3(ukData) : null;
			const usMp3 = usData ? await convertOggToMp3(usData) : null;

			if (ukMp3) ukMp3Buffers.push(ukMp3);
			if (usMp3) usMp3Buffers.push(usMp3);
		}

		const audioFileBase = termToAudioFileBase(data.term);
		const ukPaths: string[] = [];
		const usPaths: string[] = [];

		if (ukMp3Buffers.length > 0) {
			const finalUk = ukMp3Buffers.length > 1
				? await concatenateMp3(ukMp3Buffers)
				: ukMp3Buffers[0]!;
			const ukPath = `${this.audioFolderPath}/${audioFileBase}_uk.mp3`;
			await this.storage.createBinaryIfNotExists(ukPath, finalUk);
			ukPaths.push(ukPath);
		}

		if (usMp3Buffers.length > 0) {
			const finalUs = usMp3Buffers.length > 1
				? await concatenateMp3(usMp3Buffers)
				: usMp3Buffers[0]!;
			const usPath = `${this.audioFolderPath}/${audioFileBase}_us.mp3`;
			await this.storage.createBinaryIfNotExists(usPath, finalUs);
			usPaths.push(usPath);
		}

		return {
			uk: ukPaths,
			us: usPaths,
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
		term: string,
	): Promise<string> {
		const flashcardFileBase = termToFlashcardFileBase(term);
		const flashcardFileName = `(VOC) ${flashcardFileBase}.md`;
		const flashcardFilePath = `${this.flashcardFolderPath}/${flashcardFileName}`;

		await this.storage.createFolderIfNotExists(this.flashcardFolderPath);
		await this.storage.createFileIfNotExists(flashcardFilePath, flashcardMarkdown);

		return flashcardFilePath;
	}
}
