import { App, PluginSettingTab, Setting } from "obsidian";
import CreateFlashcardFilesPlugin from "./main";
import { FolderSuggest } from "./ui/FolderSuggest";

export interface CreateFlashcardFilesPluginSettings {
	audioFolderPath: string;
	flashcardFileFolderPath: string;
}

export const DEFAULT_SETTINGS: CreateFlashcardFilesPluginSettings = {
	audioFolderPath: "_Cache",
	flashcardFileFolderPath: "Flashcard",
};

export class CreateFlashcardFilesSettingTab extends PluginSettingTab {
	plugin: CreateFlashcardFilesPlugin;

	constructor(app: App, plugin: CreateFlashcardFilesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Flashcard audio folder")
			.setDesc(
				"Folder where pronunciation audio (and other flashcard media) will be stored. Path is relative to the vault root.",
			)
			.addText((text) => {
				text
					.setPlaceholder("Specify the folder for audio cache")
					.setValue(this.plugin.settings.audioFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.audioFolderPath = value.trim();
						await this.plugin.saveSettings();
					});

				new FolderSuggest(this.app, text.inputEl);
			});

		new Setting(containerEl)
			.setName("Flashcard files folder")
			.setDesc(
				"Folder where generated flashcard notes (e.g. '(VOC) attract.md') will be stored. Leave empty to use the vault root.",
			)
			.addText((text) => {
				text
					.setPlaceholder("Specify the folder for flashcard markdown files")
					.setValue(this.plugin.settings.flashcardFileFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.flashcardFileFolderPath = value.trim();
						await this.plugin.saveSettings();
					});

				new FolderSuggest(this.app, text.inputEl);
			});
	}
}
