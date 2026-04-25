import type { CambridgeAudioService } from "./CambridgeAudioService";
import { VaultStorageService } from "./VaultStorageService";
import { concatenateMp3, convertOggToMp3 } from "./AudioConversionService";
import { termToAudioFileBase } from "../helpers/termHelpers";
import { InfoNotice } from "../ui/ErrorNotice";
import type { FlashcardAudioFilePaths } from "../models/FlashcardData";

export class AudioDownloadService {
	constructor(
		private readonly storage: VaultStorageService,
		private readonly cambridgeAudioService: CambridgeAudioService,
		private readonly audioFolderPath: string,
		private readonly delayMultiplier: number = 1,
	) {}

	public async downloadAudioFiles(
		term: string,
		skipFullTermLookup: boolean,
		skipAudio: boolean,
	): Promise<FlashcardAudioFilePaths> {
		if (skipAudio) {
			return { uk: [], us: [] };
		}

		await this.storage.createFolderIfNotExists(this.audioFolderPath);

		const audioFileBase = termToAudioFileBase(term);
		const ukPath = `${this.audioFolderPath}/${audioFileBase}_uk.mp3`;
		const usPath = `${this.audioFolderPath}/${audioFileBase}_us.mp3`;

		const ukTermCached = await this.storage.binaryExists(ukPath);
		const usTermCached = await this.storage.binaryExists(usPath);
		if (ukTermCached && usTermCached) {
			new InfoNotice(`Using cached audio for term "${term}"`);
			return { uk: [ukPath], us: [usPath] };
		}

		const ukMp3Buffers: ArrayBuffer[] = [];
		const usMp3Buffers: ArrayBuffer[] = [];

		const fetchedBuffers = await this.fetchAndConvertAudio(term, skipFullTermLookup);
		for (const { uk, us } of fetchedBuffers) {
			if (uk) ukMp3Buffers.push(uk);
			if (us) usMp3Buffers.push(us);
		}

		const ukPaths: string[] = [];
		const usPaths: string[] = [];

		if (ukMp3Buffers.length > 0) {
			const finalUk = ukMp3Buffers.length > 1
				? await concatenateMp3(ukMp3Buffers)
				: ukMp3Buffers[0]!;
			await this.storage.createBinaryIfNotExists(ukPath, finalUk);
			ukPaths.push(ukPath);
		}

		if (usMp3Buffers.length > 0) {
			const finalUs = usMp3Buffers.length > 1
				? await concatenateMp3(usMp3Buffers)
				: usMp3Buffers[0]!;
			await this.storage.createBinaryIfNotExists(usPath, finalUs);
			usPaths.push(usPath);
		}

		return {
			uk: ukPaths,
			us: usPaths,
		};
	}

	public async countdownDelay(nextWord: string, index?: number, total?: number): Promise<void> {
		const totalSeconds = Math.floor((4 + Math.random() * 9) * this.delayMultiplier);
		const label = index != null && total != null
			? `Next term "${nextWord}" (${index}/${total})`
			: `Next word "${nextWord}"`;
		const notice = new InfoNotice(`${label} in ${totalSeconds}s...`, 0);
		for (let s = totalSeconds; s > 0; s--) {
			notice.setMessage(`${label} in ${s}s...`);
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		notice.hide();
	}

	private async fetchAndConvertAudio(
		term: string,
		skipFullTermLookup: boolean,
	): Promise<{ uk: ArrayBuffer | null; us: ArrayBuffer | null }[]> {
		const fullLookupAttempted = !skipFullTermLookup;

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

		let cambridgeFetchAttempted = fullLookupAttempted;
		const results: { uk: ArrayBuffer | null; us: ArrayBuffer | null }[] = [];

		for (let i = 0; i < words.length; i++) {
			const word = words[i]!;
			const wordBase = termToAudioFileBase(word);
			const wordUkPath = `${this.audioFolderPath}/${wordBase}_uk.mp3`;
			const wordUsPath = `${this.audioFolderPath}/${wordBase}_us.mp3`;

			const ukCached = await this.storage.binaryExists(wordUkPath);
			const usCached = await this.storage.binaryExists(wordUsPath);

			if (ukCached && usCached) {
				new InfoNotice(`Using cached audio: "${word}" (${i + 1}/${words.length})`);
				const uk = await this.storage.readBinary(wordUkPath);
				const us = await this.storage.readBinary(wordUsPath);
				results.push({ uk, us });
				continue;
			}

			if (cambridgeFetchAttempted) {
				await this.countdownDelay(word);
			}
			cambridgeFetchAttempted = true;

			new InfoNotice(`Downloading audio: "${word}" (${i + 1}/${words.length})`);
			const { ukData, usData } = await this.cambridgeAudioService.fetch(word);
			const uk = ukData ? await convertOggToMp3(ukData) : null;
			const us = usData ? await convertOggToMp3(usData) : null;

			if (uk) await this.storage.createBinaryIfNotExists(wordUkPath, uk);
			if (us) await this.storage.createBinaryIfNotExists(wordUsPath, us);

			results.push({ uk, us });
		}
		return results;
	}
}
