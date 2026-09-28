const pdfInput = document.getElementById("pdfInput");
const convertBtn = document.getElementById("convertBtn");
const fileName = document.getElementById("fileName");
const progress = document.getElementById("progress");
const results = document.getElementById("results");
const quality = document.getElementById("quality");
const pageMode = document.getElementById("pageMode");
const pageInput = document.getElementById("pageInput");

let selectedFile = null;
let convertedImages = [];

pdfInput.addEventListener("change", function () {

  if (this.files && this.files.length > 0) {

    selectedFile = this.files[0];

    fileName.textContent =
      "Selected: " + selectedFile.name;

    convertBtn.disabled = false;

  }

});


pageMode.addEventListener("change", function () {

  if (
    pageMode.value === "selected" ||
    pageMode.value === "range"
  ) {

    pageInput.style.display = "inline-block";

  } else {

    pageInput.style.display = "none";
    pageInput.value = "";

  }

});


function getPages(totalPages) {

  if (pageMode.value === "all") {

    const pages = [];

    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return pages;
  }


  const text = pageInput.value.trim();

  if (!text) {
    throw new Error("Please enter page numbers.");
  }


  const pages = new Set();

  const parts = text.split(",");


  for (const part of parts) {

    const value = part.trim();


    if (value.includes("-")) {

      const range = value.split("-");

      const start = Number(range[0]);
      const end = Number(range[1]);


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


  return Array.from(pages).sort(
    function (a, b) {
      return a - b;
    }
  );

}


convertBtn.addEventListener("click", async function () {

  if (!selectedFile) {

    alert("Please select a PDF first.");

    return;

  }


  try {

    convertBtn.disabled = true;

    progress.textContent =
      "Loading PDF...";

    results.innerHTML = "";

    convertedImages = [];


    const buffer =
      await selectedFile.arrayBuffer();


    const pdf =
      await pdfjsLib.getDocument({
        data: buffer
      }).promise;


    const pages =
      getPages(pdf.numPages);


    for (
      let index = 0;
      index < pages.length;
      index++
    ) {

      const pageNumber =
        pages[index];


      progress.textContent =
        "Converting page " +
        (index + 1) +
        " of " +
        pages.length +
        "...";


      const page =
        await pdf.getPage(pageNumber);


      const scale =
        Number(quality.value);


      const viewport =
        page.getViewport({
          scale: scale
        });


      const canvas =
        document.createElement("canvas");


      const context =
        canvas.getContext("2d");


      canvas.width =
        viewport.width;

      canvas.height =
        viewport.height;


      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;


      const image =
        canvas.toDataURL(
          "image/jpeg",
          0.92
        );


      convertedImages.push({

        name:
          "page-" +
          pageNumber +
          ".jpg",

        data: image

      });


      const card =
        document.createElement("div");


      card.className =
        "result-card";


      card.innerHTML =

        '<img src="' +
        image +
        '" alt="Page ' +
        pageNumber +
        '">' +

        '<p>Page ' +
        pageNumber +
        '</p>' +

        '<a class="download-btn" ' +
        'href="' +
        image +
        '" ' +
        'download="page-' +
        pageNumber +
        '.jpg">' +

        'Download JPG' +

        '</a>';


      results.appendChild(card);

    }


    progress.textContent =
      "Conversion completed!";


    createZipButton();


  } catch (error) {

    console.error(error);

    progress.textContent =
      "Error: " +
      error.message;


  } finally {

    convertBtn.disabled = false;

  }

});


function createZipButton() {

  const button =
    document.createElement("button");


  button.className =
    "zip-button";


  button.textContent =
    "Download All as ZIP";


  button.addEventListener(
    "click",
    downloadZIP
  );


  results.prepend(button);

}


async function downloadZIP() {

  if (!convertedImages.length) {
    return;
  }


  const zip =
    new JSZip();


  convertedImages.forEach(
    function (image) {

      const base64 =
        image.data.split(",")[1];


      zip.file(
        image.name,
        base64,
        {
          base64: true
        }
      );

    }
  );


  const blob =
    await zip.generateAsync({
      type: "blob"
    });


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;

  link.download =
    "converted-jpg-images.zip";


  document.body.appendChild(link);

  link.click();

  link.remove();


  URL.revokeObjectURL(url);

}
