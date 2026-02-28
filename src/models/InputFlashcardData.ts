import { z } from "zod";

export const inputFlashcardDataSchema = z.object({
	term: z.string(),
	explanation: z.string(),
	sentences: z.array(z.string()),
	lookupTerm: z.array(z.string()).optional(),
});

export type InputFlashcardData = z.infer<typeof inputFlashcardDataSchema>;

export const inputFlashcardDataArraySchema = z.array(inputFlashcardDataSchema);
