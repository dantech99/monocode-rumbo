import { createContext } from "react";

/** Reveal clocks stop even when a pooled transcript stays mounted. */
export const TranscriptVisibility = createContext(true);

/** Whether the transcript paces its own reveal as content grows. */
export const TranscriptPacing = createContext(true);
