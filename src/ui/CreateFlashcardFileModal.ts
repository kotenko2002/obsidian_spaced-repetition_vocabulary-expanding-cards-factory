import { App, Modal } from "obsidian";
import {
	CambridgeAudioService,
	FlashcardBuilder,
	FlashcardDirector,
	FlashcardFileBuilder,
	inputFlashcardDataArraySchema,
	type InputFlashcardData,
} from "../index";
import { VaultStorageService } from "../services/VaultStorageService";

export class CreateFlashcardFileModal extends Modal {
	private inputEl!: HTMLTextAreaElement;
	private parseButtonEl!: HTMLButtonElement;

	constructor(app: App) {
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
		}) as HTMLTextAreaElement;

		this.inputEl.rows = 8;
		this.inputEl.placeholder =
			"Paste JSON array of InputFlashcardData objects here";
	}

	private renderFooter(container: HTMLElement) {
		const buttonWrapper = container.createDiv({
			cls: "create-flashcard-file-modal__actions",
		});

		this.parseButtonEl = buttonWrapper.createEl("button", {
			text: "Parse JSON",
			cls: "mod-cta create-flashcard-file-modal__parse-button",
		}) as HTMLButtonElement;

		this.parseButtonEl.disabled = true;

		this.inputEl.addEventListener("input", this.handleInputChange);
		this.parseButtonEl.addEventListener("click", this.handleParseClick);
	}

	private handleInputChange = () => {
		const rawJson = this.inputEl.value.trim();

		if (!rawJson) {
			this.parseButtonEl.disabled = true;
			return;
		}

		try {
			const parsed = JSON.parse(rawJson);
			const result = inputFlashcardDataArraySchema.safeParse(parsed);
			this.parseButtonEl.disabled = !result.success;
		} catch (_error) {
			this.parseButtonEl.disabled = true;
		}
	};

	private handleParseClick = async () => {
		const rawJson = this.inputEl.value.trim();

		if (!rawJson) {
			console.warn("No JSON provided for flashcards.");
			return;
		}

		try {
			const parsed = JSON.parse(rawJson);
			const result = inputFlashcardDataArraySchema.safeParse(parsed);

			if (!result.success) {
				console.warn("Invalid flashcard data:", result.error.flatten());
				return;
			}

			const flashcards: InputFlashcardData[] = result.data;

			const director = new FlashcardDirector(
				this.app.vault,
				new VaultStorageService(this.app.vault),
				new CambridgeAudioService(),
				new FlashcardFileBuilder(new FlashcardBuilder()),
			);

			const builtCards: string[] = [];
			for (const flashcard of flashcards) {
				const built = await director.buildAllCards(flashcard);
				console.log(built);
				builtCards.push(built);
			}

			console.log("Built flashcard markdown:", builtCards);
		} catch (error) {
			console.error("Failed to parse flashcard JSON:", error);
		}
	};
}
