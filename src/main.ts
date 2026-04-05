import { Menu, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, CreateFlashcardFilesPluginSettings, CreateFlashcardFilesSettingTab } from "./settings";
import { CreateFlashcardFileModal } from "./ui/CreateFlashcardFileModal";
import { BackgroundFlashcardModal } from "./ui/BackgroundFlashcardModal";

export default class CreateFlashcardFilesPlugin extends Plugin {
	settings: CreateFlashcardFilesPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CreateFlashcardFilesSettingTab(this.app, this));

		this.addRibbonIcon('sheets-in-box', 'Flashcard factory', (evt: MouseEvent) => {
			const menu = new Menu();
			menu.addItem(item => item
				.setTitle("Create flashcard")
				.setIcon("file-plus")
				.onClick(() => new CreateFlashcardFileModal(this.app, this.settings).open())
			);
			menu.addItem(item => item
				.setTitle("Background processing")
				.setIcon("clock")
				.onClick(() => new BackgroundFlashcardModal(this.app, this.settings).open())
			);
			menu.showAtMouseEvent(evt);
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
