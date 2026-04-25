import { App, setIcon } from "obsidian";
import { VaultStorageService } from "../services/VaultStorageService";
import { generateShortUuid, termToImageFileBase } from "../helpers/termHelpers";
import { ErrorNotice } from "./ErrorNotice";
import type { ImageInputFlashcardData } from "../models/ImageInputFlashcardData";
import type { EnrichedImageFlashcardData } from "../models/ImageFlashcardData";

export class ImageEnrichmentWizard {
	private readonly storage: VaultStorageService;
	private readonly enrichedItems: EnrichedImageFlashcardData[];
	private currentIndex = 0;
	private currentObjectUrl: string | null = null;
	private isActive = true;
	private readonly documentPasteListener: (event: ClipboardEvent) => void;

	private previewWrapperEl!: HTMLDivElement;
	private translationInputEl!: HTMLInputElement;
	private nextButtonEl!: HTMLButtonElement;

	constructor(
		app: App,
		private readonly containerEl: HTMLElement,
		flashcards: ImageInputFlashcardData[],
		private readonly imageFolderPath: string,
		private readonly onComplete: (enriched: EnrichedImageFlashcardData[]) => void,
	) {
		this.storage = new VaultStorageService(app.vault);
		this.enrichedItems = flashcards.map((item) => ({
			...item,
			uuid: generateShortUuid(),
		}));

		this.documentPasteListener = (event) => {
			if (!this.isActive) return;
			console.log("[ImageEnrichmentWizard] document paste fired", {
				targetTag: (event.target as HTMLElement | null)?.tagName,
				itemsCount: event.clipboardData?.items.length ?? 0,
			});
			void this.handlePaste(event);
		};
		document.addEventListener("paste", this.documentPasteListener, true);
		console.log("[ImageEnrichmentWizard] document paste listener attached");

		this.renderCurrentStep();
	}

	private async handlePaste(event: ClipboardEvent) {
		const items = event.clipboardData?.items;
		if (!items) {
			console.log("[ImageEnrichmentWizard] no clipboardData.items");
			return;
		}

		const types = Array.from(items).map((it) => it.type);
		console.log("[ImageEnrichmentWizard] clipboard types:", types);

		for (const item of Array.from(items)) {
			if (!item.type.startsWith("image/")) continue;

			const blob = item.getAsFile();
			if (!blob) {
				console.warn("[ImageEnrichmentWizard] image item but getAsFile returned null");
				continue;
			}

			event.preventDefault();
			console.log("[ImageEnrichmentWizard] image found, type:", item.type, "size:", blob.size);

			try {
				const ext = item.type.split("/")[1] || "png";
				const currentItem = this.enrichedItems[this.currentIndex]!;
				const fileName = `${termToImageFileBase(currentItem.term, currentItem.uuid)}.${ext}`;
				const path = `${this.imageFolderPath}/${fileName}`;

				const buffer = await blob.arrayBuffer();
				await this.storage.createFolderIfNotExists(this.imageFolderPath);
				await this.storage.writeBinary(path, buffer);

				console.log("[ImageEnrichmentWizard] image saved at", path);

				currentItem.imagePath = path;
				this.renderImagePreview(blob);
				this.updateButtonStates();
			} catch (error) {
				new ErrorNotice("Failed to save pasted image. See console for details.");
				console.error("[ImageEnrichmentWizard] failed to save pasted image", error);
			}

			return;
		}

		console.log("[ImageEnrichmentWizard] no image in clipboard items");
	}

	public cleanup() {
		if (!this.isActive) return;
		this.isActive = false;
		document.removeEventListener("paste", this.documentPasteListener, true);
		this.releaseObjectUrl();
		console.log("[ImageEnrichmentWizard] cleaned up");
	}

	private renderCurrentStep() {
		this.releaseObjectUrl();
		this.containerEl.empty();
		this.containerEl.addClass("image-enrichment-wizard");

		const item = this.enrichedItems[this.currentIndex]!;
		const total = this.enrichedItems.length;

		const headerEl = this.containerEl.createEl("h2", {
			cls: "image-enrichment-wizard__title",
			text: `Term ${this.currentIndex + 1} of ${total} — "${item.term}"`,
		});
		headerEl.addClass("create-flashcard-file-modal__title");

		this.containerEl.createEl("hr", {
			cls: "create-flashcard-file-modal__divider",
		});

		this.containerEl.createEl("p", {
			cls: "image-enrichment-wizard__sentence",
			text: item.sentence,
		});

		const imageSectionEl = this.containerEl.createDiv({
			cls: "image-enrichment-wizard__image-section",
		});

		this.previewWrapperEl = imageSectionEl.createDiv({
			cls: "image-enrichment-wizard__preview",
		});
		this.previewWrapperEl.tabIndex = 0;
		this.previewWrapperEl.style.position = "relative";
		this.previewWrapperEl.style.outline = "2px dashed var(--background-modifier-border)";
		this.previewWrapperEl.style.padding = "12px";
		this.previewWrapperEl.style.minHeight = "80px";
		this.previewWrapperEl.style.cursor = "pointer";
		this.previewWrapperEl.style.borderRadius = "4px";
		this.previewWrapperEl.addEventListener("focus", () => {
			this.previewWrapperEl.style.outlineColor = "var(--interactive-accent)";
		});
		this.previewWrapperEl.addEventListener("blur", () => {
			this.previewWrapperEl.style.outlineColor = "var(--background-modifier-border)";
		});
		this.previewWrapperEl.addEventListener("click", () => {
			this.previewWrapperEl.focus();
		});

		if (item.imagePath) {
			const placeholder = this.previewWrapperEl.createDiv({
				cls: "image-enrichment-wizard__preview-placeholder",
				text: `Image saved: ${item.imagePath}`,
			});
			placeholder.style.opacity = "0.7";
			this.renderClearXButton();
		} else {
			this.renderPlaceholder();
		}

		const translationSectionEl = this.containerEl.createDiv({
			cls: "image-enrichment-wizard__translation-section",
		});

		translationSectionEl.createEl("label", {
			cls: "image-enrichment-wizard__label",
			text: "Or fallback translation (used when no image is set):",
		});

		this.translationInputEl = translationSectionEl.createEl("input", {
			cls: "image-enrichment-wizard__translation-input",
			type: "text",
		});
		this.translationInputEl.placeholder = "e.g. вручну";
		this.translationInputEl.value = item.fallbackTranslation ?? "";
		this.translationInputEl.addEventListener("input", () => {
			const value = this.translationInputEl.value.trim();
			this.enrichedItems[this.currentIndex]!.fallbackTranslation = value || undefined;
			this.updateButtonStates();
		});

		const footerEl = this.containerEl.createDiv({
			cls: "create-flashcard-file-modal__actions",
		});

		const isLast = this.currentIndex === total - 1;
		this.nextButtonEl = footerEl.createEl("button", {
			cls: "mod-cta create-flashcard-file-modal__parse-button",
			text: isLast ? "Finish" : "Next",
		});
		this.nextButtonEl.addEventListener("click", () => this.goNext());

		this.updateButtonStates();

		setTimeout(() => {
			this.previewWrapperEl.focus();
			console.log("[ImageEnrichmentWizard] preview wrapper focused for term:", item.term);
		}, 0);
	}

	private renderPlaceholder() {
		const placeholder = this.previewWrapperEl.createDiv({
			cls: "image-enrichment-wizard__preview-placeholder",
			text: "Click this box, then press Ctrl+V to paste a screenshot",
		});
		placeholder.style.opacity = "0.7";
		placeholder.style.textAlign = "center";
	}

	private renderImagePreview(blob: Blob) {
		this.releaseObjectUrl();
		this.previewWrapperEl.empty();

		this.currentObjectUrl = URL.createObjectURL(blob);
		const img = this.previewWrapperEl.createEl("img", {
			cls: "image-enrichment-wizard__preview-image",
		});
		img.src = this.currentObjectUrl;
		img.style.maxWidth = "400px";
		img.style.maxHeight = "300px";

		this.renderClearXButton();
	}

	private renderClearXButton() {
		const xBtn = this.previewWrapperEl.createEl("button", {
			cls: "image-enrichment-wizard__clear-x",
		});
		setIcon(xBtn, "x");
		xBtn.setAttribute("aria-label", "Clear image");
		xBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.enrichedItems[this.currentIndex]!.imagePath = undefined;
			this.releaseObjectUrl();
			this.renderCurrentStep();
		});
	}

	private updateButtonStates() {
		const item = this.enrichedItems[this.currentIndex]!;
		const hasImage = !!item.imagePath;
		const hasTranslation = !!(item.fallbackTranslation && item.fallbackTranslation.trim());
		this.nextButtonEl.disabled = !hasImage && !hasTranslation;
	}

	private goNext() {
		const total = this.enrichedItems.length;
		if (this.currentIndex >= total - 1) {
			this.cleanup();
			this.onComplete(this.enrichedItems);
			return;
		}

		this.currentIndex += 1;
		this.renderCurrentStep();
	}

	private releaseObjectUrl() {
		if (this.currentObjectUrl) {
			URL.revokeObjectURL(this.currentObjectUrl);
			this.currentObjectUrl = null;
		}
	}
}
