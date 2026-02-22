import { requestUrl, type Vault } from "obsidian";

const CAMBRIDGE_BASE_URL = "https://dictionary.cambridge.org";
const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const OGG_URL_PATTERN = /\/media\/english\/[^"']+\.ogg/g;

export interface CambridgeAudioResult {
	ukPath: string;
	usPath: string;
}

function wordOrPhraseToUrlSegment(wordOrPhrase: string): string {
	return wordOrPhrase.trim().toLowerCase().replace(/\s+/g, "-");
}

function wordOrPhraseToFileBase(wordOrPhrase: string): string {
	return wordOrPhrase.trim().toLowerCase().replace(/\s+/g, "_");
}

// TODO: add interface and create fallback class
export class CambridgeAudioService {
	constructor(private readonly vault: Vault) {}

	async fetchAndSave(wordOrPhrase: string): Promise<CambridgeAudioResult> {
		const storageFolderPath =
			(this.vault as any).config?.attachmentFolderPath ?? "_Cache";
		const urlSegment = wordOrPhraseToUrlSegment(wordOrPhrase);
		const fileBase = wordOrPhraseToFileBase(wordOrPhrase);
		const dictUrl = `${CAMBRIDGE_BASE_URL}/dictionary/english/${urlSegment}`;

		const response = await requestUrl({
			url: dictUrl,
			headers: { "User-Agent": USER_AGENT },
			throw: true,
		});

		const matches = response.text.match(OGG_URL_PATTERN);
		if (!matches || matches.length < 2) {
			throw new Error(
				`Could not find both UK and US audio for "${wordOrPhrase}". Found ${matches?.length ?? 0} match(es).`,
			);
		}

		const ukRelativePath = matches[0];
		const usRelativePath = matches[1];

		// TODO: fix
		// await this.ensureFolderExists(storageFolderPath);

		const ukFilePath = `${storageFolderPath}/${fileBase}_uk.ogg`;
		const usFilePath = `${storageFolderPath}/${fileBase}_us.ogg`;

		const [ukBuffer, usBuffer] = await Promise.all([
			this.downloadAudio(`${CAMBRIDGE_BASE_URL}${ukRelativePath}`),
			this.downloadAudio(`${CAMBRIDGE_BASE_URL}${usRelativePath}`),
		]);

		if (ukBuffer.byteLength === 0 || usBuffer.byteLength === 0) {
			throw new Error("One or both audio files are empty.");
		}

		await Promise.all([
			this.vault.createBinary(ukFilePath, ukBuffer),
			this.vault.createBinary(usFilePath, usBuffer),
		]);

		return { ukPath: ukFilePath, usPath: usFilePath };
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		const normalized = folderPath.replace(/\/+$/, "");
		if (!normalized) return;
		const existing = this.vault.getAbstractFileByPath(normalized);
		if (existing) return;
		try {
			await this.vault.createFolder(normalized);
		} catch (error) {
			if (
				!(error instanceof Error) ||
				!error.message?.toLowerCase().includes("already exists")
			) {
				throw error;
			}
		}
	}

	private async downloadAudio(url: string): Promise<ArrayBuffer> {
		const response = await requestUrl({
			url,
			headers: { "User-Agent": USER_AGENT },
			throw: true,
		});
		return response.arrayBuffer;
	}
}
