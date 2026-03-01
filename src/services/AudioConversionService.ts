import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import ffmpeg from "fluent-ffmpeg";

export async function convertOggToMp3(oggBuffer: ArrayBuffer): Promise<ArrayBuffer> {
	const tmpDir = os.tmpdir();
	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	const oggPath = path.join(tmpDir, `${id}.ogg`);
	const mp3Path = path.join(tmpDir, `${id}.mp3`);

	try {
		await fs.promises.writeFile(oggPath, Buffer.from(oggBuffer));
		await new Promise<void>((resolve, reject) => {
			ffmpeg(oggPath)
				.toFormat("mp3")
				.output(mp3Path)
				.on("end", () => resolve())
				.on("error", (err: Error) => reject(err))
				.run();
		});
		const mp3Buffer = await fs.promises.readFile(mp3Path);
		return mp3Buffer.buffer.slice(
			mp3Buffer.byteOffset,
			mp3Buffer.byteOffset + mp3Buffer.byteLength,
		);
	} finally {
		await fs.promises.unlink(oggPath).catch(() => {});
		await fs.promises.unlink(mp3Path).catch(() => {});
	}
}
