import { App } from "obsidian";
import {
	CambridgeAudioService,
	FlashcardBuilder,
	FlashcardController,
	FlashcardFileBuilder,
	type InputFlashcardData,
} from "../index";
import { ErrorNotice, InfoNotice, SuccessNotice } from "./ErrorNotice";
import { BaseFlashcardModal } from "./BaseFlashcardModal";
import { CreateFlashcardFileModal } from "./CreateFlashcardFileModal";
import { VaultStorageService } from "../services/VaultStorageService";
import type { CreateFlashcardFilesPluginSettings } from "../settings";

const BACKGROUND_DELAY_MULTIPLIER = 3;

export class BackgroundFlashcardModal extends BaseFlashcardModal {
	constructor(app: App, settings: CreateFlashcardFilesPluginSettings) {
		super(app, settings);
	}

	protected getTitle(): string {
		return "Background flashcard processing";
	}

	protected getButtonText(): string {
		return "Start background processing";
	}

	protected handleSubmit(flashcards: InputFlashcardData[]): void {
		this.close();
		new InfoNotice(`Background processing started for ${flashcards.length} flashcard(s)...`);

		// fire-and-forget
		void this.processInBackground(flashcards);
	}

	private async processInBackground(flashcards: InputFlashcardData[]) {
		const controller = new FlashcardController(
			new VaultStorageService(this.app.vault),
			new CambridgeAudioService(),
			new FlashcardFileBuilder(new FlashcardBuilder()),
			this.settings,
			BACKGROUND_DELAY_MULTIPLIER,
		);

		const failedItems: InputFlashcardData[] = [];

		for (let i = 0; i < flashcards.length; i++) {
			if (i > 0) {
				await controller.countdownDelay(flashcards[i]!.term, i + 1, flashcards.length);
			}

			try {
				await controller.createFlashcard(flashcards[i]!);
				new SuccessNotice(`Flashcard for "${flashcards[i]!.term}" term created successfully.`);
			} catch (error) {
				const message = `Failed to create flashcard for "${flashcards[i]!.term}". See console for details.`;
				new ErrorNotice(message);
				console.error(message, error);
				failedItems.push(flashcards[i]!);
			}
		}

		if (failedItems.length > 0) {
			const json = JSON.stringify(failedItems, null, 2);
			new CreateFlashcardFileModal(this.app, this.settings, json).open();
			new ErrorNotice(`${failedItems.length} flashcard(s) failed. Review in modal.`);
		} else {
			new SuccessNotice("All background flashcards created successfully!");
		}
	}
}
