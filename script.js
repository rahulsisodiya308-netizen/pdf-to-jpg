script.js
import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

import JSZip from
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const pdfInput = document.getElementById("pdfInput");
const dropZone = document.getElementById("dropZone");
const convertBtn = document.getElementById("convertBtn");
const fileName = document.getElementById("fileName");
const progress = document.getElementById("progress");
const results = document.getElementById("results");
const quality = document.getElementById("quality");
const pageMode = document.getElementById("pageMode");
const pageInput = document.getElementById("pageInput");

let selectedFile = null;
let convertedImages = [];

dropZone.addEventListener("click", () => {
  pdfInput.click();
});

pdfInput.addEventListener("change", () => {
  if (pdfInput.files && pdfInput.files.length > 0) {
    selectedFile = pdfInput.files[0];
    fileName.textContent = selectedFile.name;

    convertBtn.disabled = false;
    convertBtn.style.cursor = "pointer";
    convertBtn.style.opacity = "1";
  }
});

pageMode.addEventListener("change", () => {
  if (pageMode.value === "all") {
    pageInput.style.display = "none";
    pageInput.value = "";
  }

  if (
    pageMode.value === "selected" ||
    pageMode.value === "range"
  ) {
    pageInput.style.display = "inline-block";
  }
});

function getSelectedPages(totalPages) {
  if (pageMode.value === "all") {
    return Array.from(
      { length: totalPages },
      (_, i) => i + 1
    );
  }

  const input = pageInput.value.trim();

  if (!input) {
    throw new Error("Please enter page numbers.");
  }

  const pages = new Set();
  const parts = input.split(",");

  for (const part of parts) {
    const value = part.trim();

    if (value.includes("-")) {
      const [start, end] = value
        .split("-")
        .map(Number);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end > totalPages ||
        start > end
      ) {
        throw new Error("Invalid page range.");
      }

      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const page = Number(value);

      if (
        !Number.isInteger(page) ||
        page < 1 ||
        page > totalPages
      ) {
        throw new Error("Invalid page number.");
      }

      pages.add(page);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

convertBtn.addEventListener("click", async () => {
 alert("Convert button working!");
  if (!selectedFile) return;

  try {
    convertBtn.disabled = true;
    results.innerHTML = "";
    progress.textContent = "Loading PDF...";

    convertedImages = [];

    const arrayBuffer =
      await selectedFile.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;

    const pages = getSelectedPages(pdf.numPages);

    for (let index = 0; index < pages.length; index++) {
      const pageNumber = pages[index];

      progress.textContent =
        `Converting page ${index + 1} of ${pages.length}...`;

      const page = await pdf.getPage(pageNumber);

      const scale = Number(quality.value);

      const viewport =
        page.getViewport({ scale });

      const canvas =
        document.createElement("canvas");

      const context =
        canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const jpgData =
        canvas.toDataURL("image/jpeg", 0.92);

      convertedImages.push({
        name: `page-${pageNumber}.jpg`,
        data: jpgData
      });

      const card =
        document.createElement("div");

      card.className = "result-card";

      card.innerHTML = `
        <img src="${jpgData}" alt="Page ${pageNumber}">
        <p>Page ${pageNumber}</p>
        <a
          class="download-btn"
          href="${jpgData}"
          download="page-${pageNumber}.jpg"
        >
          Download JPG
        </a>
      `;

      results.appendChild(card);
    }

    progress.textContent =
      "Conversion completed successfully!";

    createZipButton();

  } catch (error) {
    console.error(error);

    progress.textContent =
      error.message || "Something went wrong.";

  } finally {
    convertBtn.disabled = false;
  }
});

function createZipButton() {
  const button =
    document.createElement("button");

  button.className = "zip-button";
  button.textContent =
    "Download All as ZIP";

  button.addEventListener(
    "click",
    downloadZIP
  );

  results.prepend(button);
}

async function downloadZIP() {
  const zip = new JSZip();

  for (const image of convertedImages) {
    const base64 =
      image.data.split(",")[1];

    zip.file(
      image.name,
      base64,
      { base64: true }
    );
  }

  const content =
    await zip.generateAsync({
      type: "blob"
    });

  const url =
    URL.createObjectURL(content);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "converted-jpg-images.zip";

  link.click();

  URL.revokeObjectURL(url);
}
