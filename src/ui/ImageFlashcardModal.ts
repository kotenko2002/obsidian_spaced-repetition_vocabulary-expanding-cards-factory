import { App, Modal } from "obsidian";
import {
	AudioDownloadService,
	CambridgeAudioService,
	FlashcardBuilder,
	FlashcardFileBuilder,
} from "../index";
import { ErrorNotice, InfoNotice, SuccessNotice } from "./ErrorNotice";
import { ImageEnrichmentWizard } from "./ImageEnrichmentWizard";
import { ImageFlashcardController } from "../controllers/ImageFlashcardController";
import { VaultStorageService } from "../services/VaultStorageService";
import {
	imageInputFlashcardDataArraySchema,
	type ImageInputFlashcardData,
} from "../models/ImageInputFlashcardData";
import type { EnrichedImageFlashcardData } from "../models/ImageFlashcardData";
import type { CreateFlashcardFilesPluginSettings } from "../settings";

const BACKGROUND_DELAY_MULTIPLIER = 3;

type Phase = "INPUT_JSON" | "ENRICH";

export class ImageFlashcardModal extends Modal {
	private phase: Phase = "INPUT_JSON";
	private parsedFlashcards: ImageInputFlashcardData[] = [];
	private inputEl?: HTMLTextAreaElement;
	private continueButtonEl?: HTMLButtonElement;
	private wizard?: ImageEnrichmentWizard;

	constructor(
		app: App,
		private readonly settings: CreateFlashcardFilesPluginSettings,
	) {
		super(app);
	}

	onOpen() {
		this.contentEl.empty();
		this.contentEl.addClass("create-flashcard-file-modal");
		this.renderJsonPhase();
	}

	onClose() {
		this.wizard?.cleanup();
		this.wizard = undefined;
		this.contentEl.empty();
	}

	private renderJsonPhase() {
		this.phase = "INPUT_JSON";
		this.contentEl.empty();

		const titleEl = this.contentEl.createEl("h2", {
			text: "Create image-based flashcards",
		});
		titleEl.addClass("create-flashcard-file-modal__title");

		this.contentEl.createEl("hr", {
			cls: "create-flashcard-file-modal__divider",
		});

		const inputWrapper = this.contentEl.createDiv({
			cls: "create-flashcard-file-modal__input-wrapper",
		});

		this.inputEl = inputWrapper.createEl("textarea", {
			cls: "create-flashcard-file-modal__textarea",
		});
		this.inputEl.rows = 8;
		this.inputEl.placeholder = "Paste JSON array of image flashcard input objects here";

		const buttonWrapper = this.contentEl.createDiv({
			cls: "create-flashcard-file-modal__actions",
		});

		this.continueButtonEl = buttonWrapper.createEl("button", {
			text: "Continue to image setup",
			cls: "mod-cta create-flashcard-file-modal__parse-button",
		});
		this.continueButtonEl.disabled = true;
		this.continueButtonEl.title = "Enter valid JSON to enable";

		this.inputEl.addEventListener("input", () => this.handleInputChange());
		this.continueButtonEl.addEventListener("click", () => this.handleContinue());
	}

	private handleInputChange() {
		if (!this.inputEl || !this.continueButtonEl) return;

		const rawJson = this.inputEl.value.trim();
		if (!rawJson) {
			this.setContinueEnabled(false);
			return;
		}

		try {
			const parsed: unknown = JSON.parse(rawJson);
			const result = imageInputFlashcardDataArraySchema.safeParse(parsed);
			this.setContinueEnabled(result.success);
		} catch {
			this.setContinueEnabled(false);
		}
	}

	private setContinueEnabled(enabled: boolean) {
		if (!this.continueButtonEl) return;
		this.continueButtonEl.disabled = !enabled;
		this.continueButtonEl.title = enabled ? "" : "Enter valid JSON to enable";
	}

	private handleContinue() {
		if (!this.inputEl) return;

		const rawJson = this.inputEl.value.trim();
		let parsed: unknown;
		try {
			parsed = JSON.parse(rawJson) as unknown;
		} catch (error) {
			new ErrorNotice("Failed to parse JSON. See console for details.");
			console.error("Failed to parse JSON", error);
			return;
		}

		const result = imageInputFlashcardDataArraySchema.safeParse(parsed);
		if (!result.success) {
			new ErrorNotice("Invalid flashcard data. See console for details.");
			console.warn("Invalid flashcard data:", result.error.flatten());
			return;
		}

		this.parsedFlashcards = result.data;
		this.renderEnrichPhase();
	}

	private renderEnrichPhase() {
		this.phase = "ENRICH";
		this.contentEl.empty();

		this.wizard = new ImageEnrichmentWizard(
			this.app,
			this.contentEl,
			this.parsedFlashcards,
			this.settings.audioFolderPath,
			(enriched) => {
				this.close();
				new InfoNotice(
					`Background processing started for ${enriched.length} flashcard(s)...`,
				);
				void this.processInBackground(enriched);
			},
		);
	}

	private async processInBackground(items: EnrichedImageFlashcardData[]) {
		const storage = new VaultStorageService(this.app.vault);
		const audioService = new AudioDownloadService(
			storage,
			new CambridgeAudioService(),
			this.settings.audioFolderPath,
			BACKGROUND_DELAY_MULTIPLIER,
		);
		const controller = new ImageFlashcardController(
			storage,
			audioService,
			new FlashcardFileBuilder(new FlashcardBuilder()),
			this.settings,
		);

		const failed: EnrichedImageFlashcardData[] = [];

		for (let i = 0; i < items.length; i++) {
			if (i > 0) {
				await audioService.countdownDelay(items[i]!.term, i + 1, items.length);
			}

			try {
				await controller.createFlashcard(items[i]!);
				new SuccessNotice(`Flashcard for "${items[i]!.term}" term created successfully.`);
			} catch (error) {
				const message = `Failed to create flashcard for "${items[i]!.term}". See console for details.`;
				new ErrorNotice(message);
				console.error(message, error);
				failed.push(items[i]!);
			}
		}

		if (failed.length === 0) {
			new SuccessNotice("All image-based flashcards created successfully!");
		} else {
			new ErrorNotice(`${failed.length} flashcard(s) failed.`);
		}
	}
}
