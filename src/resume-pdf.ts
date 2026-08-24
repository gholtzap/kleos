import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { linesFromTextItems, type ResumeLine } from "./resume-lines.js";
import { parseResumeLines, type ResumeImport } from "./resume-import.js";

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
export const MAX_RESUME_PAGES = 10;

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
