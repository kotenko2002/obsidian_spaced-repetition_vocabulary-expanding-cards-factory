import { Notice } from "obsidian";

export class ErrorNotice extends Notice {
	constructor(message: string | DocumentFragment, timeout?: number) {
		super(message, timeout ?? 5000);
		this.containerEl.addClass("error-notice");
	}
}
