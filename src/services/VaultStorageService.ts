import type { Vault } from "obsidian";
import { ErrorNotice } from "../ui/ErrorNotice";

export class VaultStorageService {
	constructor(private readonly vault: Vault) {}

	async createFolderIfNotExists(folderPath: string): Promise<void> {
		const folderAlreadyExists = await this.vault.adapter.exists(folderPath);
		if (folderAlreadyExists) {
			return;
		}

		try {
			await this.vault.createFolder(folderPath);
		} catch (error) {
			const logMessage = `[VaultStorage] Failed to create folder at: ${folderPath}`;
			new ErrorNotice(logMessage);
			console.error(logMessage, error);
			throw new Error(`Could not create folder: ${folderPath}`);
		}
	}

	async createBinaryIfNotExists(binaryPath: string, data: ArrayBuffer): Promise<void> {
		const binaryAlreadyExists = await this.vault.adapter.exists(binaryPath);
		if (binaryAlreadyExists) {
			return;
		}

		try {
			await this.vault.createBinary(binaryPath, data);
		} catch (error) {
			const logMessage = `[VaultStorage] Failed to create binary at: ${binaryPath}`;
			new ErrorNotice(logMessage);
			console.error(logMessage, error);
			throw new Error(`Could not create file: ${binaryPath}`);
		}
	}
}
