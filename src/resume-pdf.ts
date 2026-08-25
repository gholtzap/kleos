import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { linesFromTextItems, type ResumeLine } from "./resume-lines.js";
import {
  parseResumeLines,
  resumeImportIsEmpty,
  type ResumeImport,
} from "./resume-import.js";

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
export const MAX_RESUME_PAGES = 10;

export type ResumeFileResult =
  | { imported: ResumeImport; problem?: undefined }
  | { imported?: undefined; problem: string };

/**
 * Reads a chosen resume file into profile data, or the message explaining why
 * it could not be — too large, unreadable, or without any resume substance.
 * Every screen that accepts a resume goes through here, so they all refuse
 * the same files with the same words.
 */
export async function resumeImportFromFile(
  file: File,
): Promise<ResumeFileResult> {
  if (file.size > MAX_RESUME_BYTES) {
    return { problem: "That PDF is over 10 MB. Export a smaller copy." };
  }
  try {
    const imported = await resumeImportFromPdf(await file.arrayBuffer());
    if (resumeImportIsEmpty(imported)) {
      return {
        problem:
          "Kleos could not find profile details in that PDF. A text-based, single-column resume works best. Scanned images cannot be read.",
      };
    }
    return { imported };
  } catch {
    return {
      problem:
        "Could not read that file. Export your resume as a PDF and try again.",
    };
  }
}

/**
 * Reads a resume PDF into profile data, entirely in the browser: the file
 * never leaves the member's machine. pdf.js loads on first use so the import
 * screen does not carry it before a resume is chosen.
 */
export async function resumeImportFromPdf(
  data: ArrayBuffer,
): Promise<ResumeImport> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const task = pdfjs.getDocument({ data });
  const document = await task.promise;
  try {
    const lines: ResumeLine[] = [];
    const pages = Math.min(document.numPages, MAX_RESUME_PAGES);
    for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.flatMap((item) =>
        "str" in item
          ? [
              {
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
              },
            ]
          : [],
      );
      lines.push(...linesFromTextItems(items, pageNumber));
    }
    return parseResumeLines(lines);
  } finally {
    void task.destroy();
  }
}
