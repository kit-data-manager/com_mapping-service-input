import { Dropzone } from "dropzone";
import "dropzone/dist/dropzone.css";
import "./style.css";

const myDropzone = new Dropzone("#my-form",
  {
    dictDefaultMessage: "Choose your file",
    maxFiles: 1,
    autoProcessQueue: false,
    paramName: "document",
    highlight: true
  }
);

const output = document.querySelector("#output");

myDropzone.on("addedfile", (file) => {
  // Add an info line about the added file for each file.
  output.innerHTML += `<div>File added: ${file.name}</div>`;
});

import typeahead from 'typeahead-standalone'; // imports library (js)
import 'typeahead-standalone/dist/basic.css'; // imports basic styles (css)

// input element to attach to
const inputElement = document.getElementById("searchInput");

typeahead({
  input: inputElement,
  minLength: -1,
  source: {
    prefetch: {
      url: 'http://localhost:8095/api/v1/mappingAdministration/'
    },
    identifier: "mappingId"
  }
});

