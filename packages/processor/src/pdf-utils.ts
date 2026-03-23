/**
 * PDF utility functions for gazette processing.
 *
 * Handles PDF validation, text extraction, page counting,
 * native-vs-scanned detection, and image conversion.
 */

import pdfParse from "pdf-parse";
import { PDFDocument } from "pdf-lib";

/**
 * Checks whether a PDF contains selectable (native) text.
 * Returns true if the extracted text is longer than 100 characters,
 * indicating the PDF is digitally-generated rather than a scanned image.
 *
 * @param buffer - Raw PDF file bytes
 * @returns true if the PDF has extractable text (native PDF)
 */
export async function isPdfNative(buffer: Buffer): Promise<boolean> {
  try {
    const parsed = await pdfParse(buffer);
    return parsed.text.trim().length > 100;
  } catch {
    return false;
  }
}

/**
 * Gets the total number of pages in a PDF document.
 *
 * @param buffer - Raw PDF file bytes
 * @returns Total page count
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
  });
  return pdfDoc.getPageCount();
}

/**
 * Extracts all text content from a native PDF using pdf-parse.
 *
 * @param buffer - Raw PDF file bytes
 * @returns Extracted text content
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

/**
 * Converts each page of a PDF to a base64-encoded PNG image.
 *
 * NOTE: This function requires pdf-to-img or system poppler bindings
 * for actual PDF-to-image rasterization. The current implementation is
 * a placeholder stub that throws an error indicating the missing dependency.
 *
 * When a proper binding is available, the implementation should:
 * 1. Rasterize each PDF page at the specified DPI
 * 2. Convert each rasterized page to PNG via sharp
 * 3. Return base64-encoded image data for each page
 *
 * @param buffer - Raw PDF file bytes
 * @param dpi - Resolution for rasterization (default: 300)
 * @returns Array of page images with page number, base64 data, and media type
 */
export async function convertPdfToImages(
  buffer: Buffer,
  dpi: number = 300,
): Promise<Array<{ page: number; data: string; mediaType: string }>> {
  // Validate the PDF first so we can give a meaningful page count in the error
  const pageCount = await getPdfPageCount(buffer);

  // TODO: Replace this stub with actual implementation once pdf-to-img
  // or poppler bindings are installed. Example implementation:
  //
  //   import { pdf } from "pdf-to-img";
  //   import sharp from "sharp";
  //
  //   const document = await pdf(buffer, { scale: dpi / 72 });
  //   const results = [];
  //   let pageNum = 1;
  //   for await (const image of document) {
  //     const pngBuffer = await sharp(image).png().toBuffer();
  //     results.push({
  //       page: pageNum++,
  //       data: pngBuffer.toString("base64"),
  //       mediaType: "image/png",
  //     });
  //   }
  //   return results;

  throw new Error(
    `PDF to image conversion requires poppler bindings. ` +
      `Install pdf-to-img or use system poppler. ` +
      `PDF has ${pageCount} page(s) at requested ${dpi} DPI.`,
  );
}

/**
 * Validates the structural integrity of a PDF document.
 * Uses pdf-lib to attempt loading and basic parsing.
 *
 * @param buffer - Raw PDF file bytes
 * @returns Object with valid flag and optional error message
 */
export async function validatePdf(
  buffer: Buffer,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
    });

    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) {
      return { valid: false, error: "PDF contains no pages" };
    }

    return { valid: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Invalid PDF: ${message}` };
  }
}
