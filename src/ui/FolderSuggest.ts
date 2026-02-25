import {
	App,
	AbstractInputSuggest,
	TFolder,
} from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private readonly inputElRef: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputElRef = inputEl;
	}

	getSuggestions(query: string): TFolder[] {
		const normalized = query.trim().toLowerCase();
		const folders: TFolder[] = [];

		this.app.vault.getAllLoadedFiles().forEach((file) => {
			if (file instanceof TFolder) {
				const path = file.path.toLowerCase();
				if (!normalized || path.includes(normalized)) {
					folders.push(file);
				}
			}
		});

		return folders;
	}

	renderSuggestion(folder: TFolder, el: HTMLElement) {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder) {
		this.inputElRef.value = folder.path;
		this.inputElRef.dispatchEvent(new Event("input"));
		this.close();
	}
}

