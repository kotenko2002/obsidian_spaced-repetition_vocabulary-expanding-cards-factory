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
// TODO: extract create binary and folder logic according to SRP
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

		await this.createFolderIfNotExists(storageFolderPath);

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
			this.createBinaryIfNotExists(ukFilePath, ukBuffer),
			this.createBinaryIfNotExists(usFilePath, usBuffer),
		]);

		return { ukPath: ukFilePath, usPath: usFilePath };
	}

	private async createFolderIfNotExists(folderPath: string): Promise<void> {
		const folderAlreadyExists = await this.vault.adapter.exists(folderPath);
		if (folderAlreadyExists) {
			return;
		}

		try {
			await this.vault.createFolder(folderPath);
		} catch (error) {
			console.error(`[Plugin Name] Failed to create folder at: ${folderPath}`, error);
			throw new Error(`Could not create folder: ${folderPath}`);
		}
	}

	private async createBinaryIfNotExists(binaryPath: string, data: ArrayBuffer): Promise<void> {
		const binaryAlreadyExists = await this.vault.adapter.exists(binaryPath);
		if (binaryAlreadyExists) {
			return;
		}

		try {
			await this.vault.createBinary(binaryPath, data);
		} catch (error) {
			console.error(`[Plugin Name] Failed to create binary at: ${binaryPath}`, error);
			throw new Error(`Could not create folder: ${binaryPath}`);
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
