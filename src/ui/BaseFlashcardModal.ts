import { App, Modal } from "obsidian";
import {
	inputFlashcardDataArraySchema,
	type InputFlashcardData,
} from "../index";
import { ErrorNotice } from "./ErrorNotice";
import type { CreateFlashcardFilesPluginSettings } from "../settings";

export abstract class BaseFlashcardModal extends Modal {
	private inputEl!: HTMLTextAreaElement;
	private submitButtonEl!: HTMLButtonElement;

	constructor(
		app: App,
		protected readonly settings: CreateFlashcardFilesPluginSettings,
		private readonly initialJson?: string,
	) {
		super(app);
	}

	protected abstract getTitle(): string;
	protected abstract getButtonText(): string;
	protected abstract handleSubmit(flashcards: InputFlashcardData[]): void | Promise<void>;

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
			text: this.getTitle(),
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

		if (this.initialJson) {
			this.inputEl.value = this.initialJson;
			this.handleInputChange();
		}
	}

	private renderFooter(container: HTMLElement) {
		const buttonWrapper = container.createDiv({
			cls: "create-flashcard-file-modal__actions",
		});

		this.submitButtonEl = buttonWrapper.createEl("button", {
			text: this.getButtonText(),
			cls: "mod-cta create-flashcard-file-modal__parse-button",
		});

		this.submitButtonEl.disabled = true;
		this.submitButtonEl.title = "Enter valid JSON to enable";

		this.inputEl.addEventListener("input", this.handleInputChange);
		this.submitButtonEl.addEventListener("click", () => {
			void this.handleButtonClick();
		});
	}

	private handleInputChange = () => {
		const rawJson = this.inputEl.value.trim();

		if (!rawJson) {
			this.setButtonEnabled(false);
			return;
		}

		try {
			const parsed: unknown = JSON.parse(rawJson);
			const result = inputFlashcardDataArraySchema.safeParse(parsed);
			this.setButtonEnabled(result.success);
		} catch {
			this.setButtonEnabled(false);
		}
	};

	private setButtonEnabled(enabled: boolean) {
		this.submitButtonEl.disabled = !enabled;
		this.submitButtonEl.title = enabled ? "" : "Enter valid JSON to enable";
	}

	private handleButtonClick = async () => {
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

		await this.handleSubmit(result.data);
	};
}
