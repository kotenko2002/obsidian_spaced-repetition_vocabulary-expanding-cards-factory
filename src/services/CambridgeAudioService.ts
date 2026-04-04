import { requestUrl } from "obsidian";
import { termToUrlSegment } from "../helpers/termHelpers";
import { ErrorNotice } from "../ui/ErrorNotice";

const CAMBRIDGE_BASE_URL = "https://dictionary.cambridge.org";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const OGG_URL_PATTERN = /\/media\/english\/[^"']+\.ogg/g;

export interface CambridgeAudioDownloadResult {
	ukData: ArrayBuffer | null;
	usData: ArrayBuffer | null;
}

interface ExtractedAudioUrls {
	uk: string | null;
	us: string | null;
}

function extractOggUrlsFromPosHeaders(html: string): ExtractedAudioUrls {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const entryElement = doc.querySelector(".entry-body__el:has(.pos-header)");

	if (!entryElement) {
		return { uk: null, us: null };
	}

	const posHeaderElement = entryElement.querySelector("div.pos-header")!;
	const matches = posHeaderElement.innerHTML.match(OGG_URL_PATTERN);
	if (!matches) {
		return { uk: null, us: null };
	}

	let uk: string | null = null;
	let us: string | null = null;
	for (const url of matches) {
		if (!uk && url.includes("uk_pron")) {
			uk = url;
		} else if (!us && url.includes("us_pron")) {
			us = url;
		}
	}

	return { uk, us };
}

function randomDelay(): Promise<void> {
	const ms = 4000 + Math.random() * 8000;
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// TODO: add interface and create fallback class
export class CambridgeAudioService {
	private isFirstFetch = true;

	public async fetch(term: string): Promise<CambridgeAudioDownloadResult> {
		if (this.isFirstFetch) {
			this.isFirstFetch = false;
		} else {
			await randomDelay();
		}

		const urlSegment = termToUrlSegment(term);
		const dictUrl = `${CAMBRIDGE_BASE_URL}/dictionary/english/${urlSegment}`;

		console.log('dictUrl', dictUrl);

		const response = await requestUrl({
			url: dictUrl,
			headers: { "User-Agent": USER_AGENT },
			throw: true,
		});

		const audioUrls = extractOggUrlsFromPosHeaders(response.text);
		if (!audioUrls.uk && !audioUrls.us) {
			const message = `Could not find any audio for "${term}".`;
			new ErrorNotice(message);
			throw new Error(message);
		}

		const ukBuffer = audioUrls.uk
			? await this.downloadAudio(`${CAMBRIDGE_BASE_URL}${audioUrls.uk}`)
			: null;
		const usBuffer = audioUrls.us
			? await this.downloadAudio(`${CAMBRIDGE_BASE_URL}${audioUrls.us}`)
			: null;

		return {
			ukData: ukBuffer && ukBuffer.byteLength > 0 ? ukBuffer : null,
			usData: usBuffer && usBuffer.byteLength > 0 ? usBuffer : null,
		};
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
