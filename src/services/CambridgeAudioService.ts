import { requestUrl } from "obsidian";
import { termToUrlSegment } from "../helpers/termHelpers";
import {ErrorNotice} from "../ui/ErrorNotice";

const CAMBRIDGE_BASE_URL = "https://dictionary.cambridge.org";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const OGG_URL_PATTERN = /\/media\/english\/[^"']+\.ogg/g;

export interface CambridgeAudioDownloadResult {
	ukData: ArrayBuffer;
	usData: ArrayBuffer;
}

function extractOggUrlsFromPosHeaders(html: string): string[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const entryElement = doc.querySelector(".entry-body__el:has(.pos-header)");

	if (!entryElement) {
		return [];
	}

	const posHeaderElement = entryElement.querySelector("div.pos-header")!;
	const matches = posHeaderElement.innerHTML.match(OGG_URL_PATTERN);
	return matches ?? [];
}

// TODO: add interface and create fallback class
export class CambridgeAudioService {
	public async fetch(term: string): Promise<CambridgeAudioDownloadResult> {
		const urlSegment = termToUrlSegment(term);
		const dictUrl = `${CAMBRIDGE_BASE_URL}/dictionary/english/${urlSegment}`;

		const response = await requestUrl({
			url: dictUrl,
			headers: { "User-Agent": USER_AGENT },
			throw: true,
		});

		const matches = extractOggUrlsFromPosHeaders(response.text);
		if (!matches || matches.length < 2) {
			const message =
				`Could not find both UK and US audio for "${term}". Found ${matches?.length ?? 0} match(es).`;

			new ErrorNotice(message);
			throw new Error(message);
		}

		const ukRelativePath = matches[0];
		const usRelativePath = matches[1];

		const [ukBuffer, usBuffer] = await Promise.all([
			this.downloadAudio(`${CAMBRIDGE_BASE_URL}${ukRelativePath}`),
			this.downloadAudio(`${CAMBRIDGE_BASE_URL}${usRelativePath}`),
		]);

		if (ukBuffer.byteLength === 0 || usBuffer.byteLength === 0) {
			const message = "One or both audio files are empty.";
			new ErrorNotice(message);
			throw new Error(message);
		}

		return { ukData: ukBuffer, usData: usBuffer };
	}

	private async downloadAudio(url: string): Promise<ArrayBuffer> {
		const response = await requestUrl({
			url,
			headers: { "User-Agent": USER_AGENT },
			throw: true,
		});
		return response.arrayBuffer;
	}
}
