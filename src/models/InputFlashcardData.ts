import { z } from "zod";

export const inputFlashcardDataSchema = z.object({
	phrase: z.string(),
	explanation: z.string(),
	sentences: z.array(z.string()),
	audioUs: z.string(),
	audioUk: z.string(),
});

export type InputFlashcardData = z.infer<typeof inputFlashcardDataSchema>;

export const inputFlashcardDataArraySchema = z.array(inputFlashcardDataSchema);
