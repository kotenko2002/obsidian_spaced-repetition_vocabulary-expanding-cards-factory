import type { IFlashcardFileBuilder } from "../services/interfaces/IFlashcardFileBuilder";
import type { CambridgeAudioService } from "../services/CambridgeAudioService";
import { VaultStorageService } from "../services/VaultStorageService";
import { concatenateMp3, convertOggToMp3 } from "../services/AudioConversionService";
import { termToAudioFileBase, termToFlashcardFileBase } from "../helpers/termHelpers";
import { InfoNotice } from "../ui/ErrorNotice";
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
		private readonly delayMultiplier: number = 1,
	) {
		this.audioFolderPath = settings.audioFolderPath || DEFAULT_SETTINGS.audioFolderPath;
		this.flashcardFolderPath = settings.flashcardFileFolderPath || DEFAULT_SETTINGS.flashcardFileFolderPath;
	}

	public async createFlashcard(data: InputFlashcardData) {
		const audioFilePaths = data.skipAudio
			? { uk: [], us: [] }
			: await this.downloadAudioFilesAndGetPaths(data);

		const dataWithAudio: FlashcardData = { ...data, audioFilePaths };
		const flashcardMarkdown = this.buildFlashcardMarkdown(dataWithAudio);

		await this.createFlashcardFile(flashcardMarkdown, data.term);
	}

	private async downloadAudioFilesAndGetPaths(
		data: InputFlashcardData,
	): Promise<FlashcardAudioFilePaths> {
		await this.storage.createFolderIfNotExists(this.audioFolderPath);

		const ukMp3Buffers: ArrayBuffer[] = [];
		const usMp3Buffers: ArrayBuffer[] = [];

		const fetchedBuffers = await this.fetchAndConvert(data.term, data.skipFullTermLookup ?? false);
		for (const { uk, us } of fetchedBuffers) {
			if (uk) ukMp3Buffers.push(uk);
			if (us) usMp3Buffers.push(us);
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

	private async fetchAndConvert(
		term: string,
		skipFullTermLookup: boolean,
	): Promise<{ uk: ArrayBuffer | null; us: ArrayBuffer | null }[]> {
		if (!skipFullTermLookup) {
			try {
				const { ukData, usData } = await this.cambridgeAudioService.fetch(term);
				const uk = ukData ? await convertOggToMp3(ukData) : null;
				const us = usData ? await convertOggToMp3(usData) : null;
				return [{ uk, us }];
			} catch {
				console.log(
					`Audio not found for full term "${term}", falling back to individual words.`,
				);
			}
		}

		const words = term.split(/\s+/).filter((w) => w.length > 0);
		if (words.length <= 1) {
			throw new Error(`Could not find audio for "${term}".`);
		}

		new InfoNotice(`Downloading audio for ${words.length} words with random pauses (4-12s)...`);

		const results: { uk: ArrayBuffer | null; us: ArrayBuffer | null }[] = [];
		for (let i = 0; i < words.length; i++) {
			if (i > 0) {
				await this.countdownDelay(words[i]!);
			}

			new InfoNotice(`Downloading audio: "${words[i]}" (${i + 1}/${words.length})`);
			const { ukData, usData } = await this.cambridgeAudioService.fetch(words[i]!);
			const uk = ukData ? await convertOggToMp3(ukData) : null;
			const us = usData ? await convertOggToMp3(usData) : null;
			results.push({ uk, us });
		}
		return results;
	}

	public async countdownDelay(nextWord: string): Promise<void> {
		const totalSeconds = Math.floor((4 + Math.random() * 9) * this.delayMultiplier);
		const notice = new InfoNotice(`Next word "${nextWord}" in ${totalSeconds}s...`, 0);
		for (let s = totalSeconds; s > 0; s--) {
			notice.setMessage(`Next word "${nextWord}" in ${s}s...`);
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		notice.hide();
	}

	private buildFlashcardMarkdown(dataWithAudio: FlashcardData): string {
		const builder = this.fileBuilder
			.reset()
			.addSentenceGapCards(dataWithAudio)
			.addDirectTranslationCard(dataWithAudio);

		const hasAudio = dataWithAudio.audioFilePaths.uk.length > 0
			|| dataWithAudio.audioFilePaths.us.length > 0;

		if (hasAudio) {
			builder.addListeningCard(dataWithAudio);
		}

		return builder.build();
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
