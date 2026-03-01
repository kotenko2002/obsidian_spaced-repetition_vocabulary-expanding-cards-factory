import { z } from "zod";

const inputSentenceSchema = z.object({
	sentence: z.string(),
	termInSentenceForm: z.string(),
});

export const inputFlashcardDataSchema = z.object({
	term: z.string(),
	explanation: z.string(),
	sentences: z.array(inputSentenceSchema),
	lookupTerm: z.array(z.string()).optional(),
});

export type InputSentenceData = z.infer<typeof inputSentenceSchema>;
export type InputFlashcardData = z.infer<typeof inputFlashcardDataSchema>;

export const inputFlashcardDataArraySchema = z.array(inputFlashcardDataSchema);
