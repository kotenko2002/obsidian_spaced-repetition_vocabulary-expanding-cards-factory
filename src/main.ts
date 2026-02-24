import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, CreateFlashcardFilesPluginSettings, CreateFlashcardFilesSettingTab } from "./settings";
import { CreateFlashcardFileModal } from "./ui/CreateFlashcardFileModal";

export default class CreateFlashcardFilesPlugin extends Plugin {
	settings: CreateFlashcardFilesPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CreateFlashcardFilesSettingTab(this.app, this));

		this.addRibbonIcon('sheets-in-box', 'Sheets in box', (_: MouseEvent) => {
			new CreateFlashcardFileModal(this.app).open();
		});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<CreateFlashcardFilesPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
