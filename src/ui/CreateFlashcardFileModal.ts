import { App, Modal } from "obsidian";
import {
	CambridgeAudioService,
	FlashcardBuilder,
	FlashcardController,
	FlashcardFileBuilder,
	inputFlashcardDataArraySchema,
	type InputFlashcardData,
} from "../index";
import { ErrorNotice, SuccessNotice } from "./ErrorNotice";
import { VaultStorageService } from "../services/VaultStorageService";
import type { CreateFlashcardFilesPluginSettings } from "../settings";

export class CreateFlashcardFileModal extends Modal {
	private inputEl!: HTMLTextAreaElement;
	private parseButtonEl!: HTMLButtonElement;

	constructor(app: App, private readonly settings: CreateFlashcardFilesPluginSettings) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("create-flashcard-file-modal");

		this.renderHeader(contentEl);
		this.renderBody(contentEl);
		this.renderFooter(contentEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private renderHeader(container: HTMLElement) {
		const titleEl = container.createEl("h2", {
			text: "Create new flashcard",
		});

		titleEl.addClass("create-flashcard-file-modal__title");

		container.createEl("hr", {
			cls: "create-flashcard-file-modal__divider",
		});
	}

	private renderBody(container: HTMLElement) {
		const inputWrapper = container.createDiv({
			cls: "create-flashcard-file-modal__input-wrapper",
		});

		this.inputEl = inputWrapper.createEl("textarea", {
			cls: "create-flashcard-file-modal__textarea",
		});

		this.inputEl.rows = 8;
		this.inputEl.placeholder =
			"Paste JSON array of input flashcard data objects here";
	}

	private renderFooter(container: HTMLElement) {
		const buttonWrapper = container.createDiv({
			cls: "create-flashcard-file-modal__actions",
		});

		this.parseButtonEl = buttonWrapper.createEl("button", {
			text: "Parse JSON",
			cls: "mod-cta create-flashcard-file-modal__parse-button",
		});

		this.parseButtonEl.disabled = true;

		this.inputEl.addEventListener("input", this.handleInputChange);
		this.parseButtonEl.addEventListener("click", () => {
			void this.handleParseClick();
		});
	}

	private handleInputChange = () => {
		const rawJson = this.inputEl.value.trim();

		if (!rawJson) {
			this.parseButtonEl.disabled = true;
			return;
		}

		try {
			const parsed: unknown = JSON.parse(rawJson);
			const result = inputFlashcardDataArraySchema.safeParse(parsed);
			this.parseButtonEl.disabled = !result.success;
		} catch {
			this.parseButtonEl.disabled = true;
		}
	};

	private handleParseClick = async () => {
		const rawJson = this.inputEl.value.trim();

		if (!rawJson) {
			console.warn("No JSON provided for flashcards.");
			return;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(rawJson) as unknown;
		} catch (error) {
			const message = "Failed to parse flashcard JSON. See console for details.";
			new ErrorNotice(message);
			console.error(message, error);
			return;
		}

		const result = inputFlashcardDataArraySchema.safeParse(parsed);
		if (!result.success) {
			console.warn("Invalid flashcard data:", result.error.flatten());
			return;
		}

		const controller = new FlashcardController(
			new VaultStorageService(this.app.vault),
			new CambridgeAudioService(),
			new FlashcardFileBuilder(new FlashcardBuilder()),
			this.settings,
		);

		const flashcards: InputFlashcardData[] = result.data;
		for (const flashcard of flashcards) {
			try {
				await controller.createFlashcard(flashcard);
				new SuccessNotice(`Flashcard for "${flashcard.phrase}" term created successfully.`);
			} catch (error) {
				const message = "Failed to create flashcard. See console for details.";
				new ErrorNotice(message);
				console.error(message, error);
			}
		}
	};
}
