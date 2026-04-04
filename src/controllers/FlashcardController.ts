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

			const [ukMp3, usMp3] = await Promise.all([
				convertOggToMp3(ukData),
				convertOggToMp3(usData),
			]);

			ukMp3Buffers.push(ukMp3);
			usMp3Buffers.push(usMp3);
		}

		const [finalUk, finalUs] = ukMp3Buffers.length > 1
			? await Promise.all([
				concatenateMp3(ukMp3Buffers),
				concatenateMp3(usMp3Buffers),
			])
			: [ukMp3Buffers[0]!, usMp3Buffers[0]!];

		const audioFileBase = termToAudioFileBase(data.term);
		const ukPath = `${this.audioFolderPath}/${audioFileBase}_uk.mp3`;
		const usPath = `${this.audioFolderPath}/${audioFileBase}_us.mp3`;

		await Promise.all([
			this.storage.createBinaryIfNotExists(ukPath, finalUk),
			this.storage.createBinaryIfNotExists(usPath, finalUs),
		]);

		return {
			uk: [ukPath],
			us: [usPath],
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
