import { App, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
import { CreateFlashcardFileModal } from "./ui/CreateFlashcardFileModal";

// TODO: rename MyPlugin
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log('attachmentFolderPath', (this.app.vault as any).config.attachmentFolderPath);

		await this.loadSettings();
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.addRibbonIcon('sheets-in-box', 'Sheets in Box', (_: MouseEvent) => {
			new CreateFlashcardFileModal(this.app).open();
		});

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
