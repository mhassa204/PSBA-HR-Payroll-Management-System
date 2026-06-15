import React, { useState } from "react";
import { createPortal } from "react-dom";
import PDFPreview from "./PDFPreview";

/**
 * ZoomablePreview — a document/image thumbnail that opens a large, readable
 * lightbox preview on click (requirement #8). Self-contained: manages its own
 * modal. Supports images (jpg/jpeg/png) and PDFs.
 *
 * Props:
 *  - src:        blob/object URL or remote URL
 *  - fileName:   display name
 *  - mimeType:   optional; otherwise inferred from fileName/src extension
 *  - className:  thumbnail wrapper sizing (default small box)
 */
function inferKind(mimeType, fileName = "", src = "") {
  const mt = (mimeType || "").toLowerCase();
  if (mt.startsWith("image/")) return "image";
  if (mt === "application/pdf") return "pdf";
  const s = `${fileName} ${src}`.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp)(\?|$)/.test(s)) return "image";
  if (/\.pdf(\?|$)/.test(s)) return "pdf";
  return "other";
}

const ZoomablePreview = ({
  src,
  fileName = "Document",
  mimeType,
  className = "h-24 w-32",
}) => {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  const kind = inferKind(mimeType, fileName, src);

  const Thumb = (
    <div
      className={`group relative overflow-hidden rounded border border-gray-200 bg-gray-50 ${className}`}
    >
      {/* Actual small preview (image or rendered PDF), like before */}
      {kind === "image" ? (
        <img src={src} alt={fileName} className="h-full w-full object-cover" />
      ) : kind === "pdf" ? (
        <PDFPreview
          url={src}
          fileName={fileName}
          height="100%"
          showControls={false}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center">
          <i className="fas fa-file text-2xl text-gray-400" />
          <span className="mt-1 px-1 text-[10px] text-gray-500 truncate max-w-full">
            {fileName}
          </span>
        </div>
      )}
      {/* Transparent overlay (also covers the PDF iframe) to open the lightbox */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Click to enlarge"
        className="absolute inset-0 flex items-center justify-center text-transparent transition-colors hover:bg-black/30 hover:text-white"
      >
        <i className="fas fa-search-plus" />
      </button>
    </div>
  );

  const Modal =
    open &&
    createPortal(
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4"
        onClick={() => setOpen(false)}
      >
        <div
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="truncate text-sm font-medium text-gray-800">{fileName}</span>
            <div className="flex items-center gap-3">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open in new tab
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-red-500"
                title="Close"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gray-100 p-2">
            {kind === "image" ? (
              <img src={src} alt={fileName} className="mx-auto max-h-[80vh] w-auto object-contain" />
            ) : kind === "pdf" ? (
              <PDFPreview url={src} fileName={fileName} height="80vh" />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                <i className="fas fa-file text-4xl mb-2" />
                <a href={src} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Download {fileName}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      {Thumb}
      {Modal}
    </>
  );
};

export default ZoomablePreview;
