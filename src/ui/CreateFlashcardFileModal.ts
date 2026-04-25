import { App } from "obsidian";
import {
	AudioDownloadService,
	CambridgeAudioService,
	FlashcardBuilder,
	FlashcardController,
	FlashcardFileBuilder,
	type InputFlashcardData,
} from "../index";
import { ErrorNotice, SuccessNotice } from "./ErrorNotice";
import { BaseFlashcardModal } from "./BaseFlashcardModal";
import { VaultStorageService } from "../services/VaultStorageService";
import type { CreateFlashcardFilesPluginSettings } from "../settings";

export class CreateFlashcardFileModal extends BaseFlashcardModal {
	constructor(
		app: App,
		settings: CreateFlashcardFilesPluginSettings,
		initialJson?: string,
	) {
		super(app, settings, initialJson);
	}

	protected getTitle(): string {
		return "Create new flashcard";
	}

	protected getButtonText(): string {
		return "Parse JSON";
	}

	protected async handleSubmit(flashcards: InputFlashcardData[]): Promise<void> {
		const storage = new VaultStorageService(this.app.vault);
		const audioService = new AudioDownloadService(
			storage,
			new CambridgeAudioService(),
			this.settings.audioFolderPath,
		);
		const controller = new FlashcardController(
			storage,
			audioService,
			new FlashcardFileBuilder(new FlashcardBuilder()),
			this.settings,
		);

		let hadError = false;
		for (const flashcard of flashcards) {
			try {
				await controller.createFlashcard(flashcard);
				new SuccessNotice(`Flashcard for "${flashcard.term}" term created successfully.`);
			} catch (error) {
				const message = "Failed to create flashcard. See console for details.";
				new ErrorNotice(message);
				console.error(message, error);
				hadError = true;
			}
		}

		if (!hadError) {
			this.close();
		}
	}
}
