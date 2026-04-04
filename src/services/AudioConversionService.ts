import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import ffmpeg from "fluent-ffmpeg";

export async function concatenateMp3(mp3Buffers: ArrayBuffer[]): Promise<ArrayBuffer> {
	if (mp3Buffers.length === 1) {
		return mp3Buffers[0]!;
	}

	const tmpDir = os.tmpdir();
	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	const inputPaths: string[] = [];
	const outputPath = path.join(tmpDir, `${id}_merged.mp3`);

	try {
		for (let i = 0; i < mp3Buffers.length; i++) {
			const inputPath = path.join(tmpDir, `${id}_${i}.mp3`);
			await fs.promises.writeFile(inputPath, Buffer.from(mp3Buffers[i]!));
			inputPaths.push(inputPath);
		}

		await new Promise<void>((resolve, reject) => {
			const cmd = ffmpeg();
			for (const inputPath of inputPaths) {
				cmd.input(inputPath);
			}
			const filterInputs = inputPaths.map((_, i) => `[${i}:a]`).join("");
			cmd.complexFilter(`${filterInputs}concat=n=${inputPaths.length}:v=0:a=1`)
				.output(outputPath)
				.toFormat("mp3")
				.on("end", () => resolve())
				.on("error", (err: Error) => reject(err))
				.run();
		});

		const mp3Buffer = await fs.promises.readFile(outputPath);
		return mp3Buffer.buffer.slice(
			mp3Buffer.byteOffset,
			mp3Buffer.byteOffset + mp3Buffer.byteLength,
		);
	} finally {
		await Promise.all(
			[...inputPaths, outputPath].map((p) => fs.promises.unlink(p).catch(() => {})),
		);
	}
}

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
