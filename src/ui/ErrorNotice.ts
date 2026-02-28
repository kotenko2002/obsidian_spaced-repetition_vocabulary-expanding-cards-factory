import { Notice } from "obsidian";

type NoticeMessage = string | DocumentFragment;

export class BaseNotice extends Notice {
	constructor(message: NoticeMessage, cssClassName: string, timeout?: number) {
		super(message, timeout ?? 5000);
		this.containerEl.addClass(cssClassName);
	}
}

export class ErrorNotice extends BaseNotice {
	constructor(message: NoticeMessage, timeout?: number) {
		super(message, "error-notice", timeout);
	}
}

export class SuccessNotice extends BaseNotice {
	constructor(message: NoticeMessage, timeout?: number) {
		super(message, "success-notice", timeout);
	}
}
