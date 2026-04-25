import { z } from "zod";

export const imageInputFlashcardDataSchema = z.object({
	term: z.string(),
	explanation: z.string(),
	sentence: z.string(),
	termInSentenceForm: z.string(),
	fallbackTranslation: z.string().optional(),
	source: z.string().optional(),
	skipFullTermLookup: z.boolean().optional(),
	skipAudio: z.boolean().optional(),
});

export type ImageInputFlashcardData = z.infer<typeof imageInputFlashcardDataSchema>;

export const imageInputFlashcardDataArraySchema = z.array(imageInputFlashcardDataSchema);
