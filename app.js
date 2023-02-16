// @ts-check

import Dropzone from "dropzone";
// Optionally, import the dropzone file to get default styling.
import "dropzone/dist/dropzone.css";
import "./style.css";

const myDropzone = new Dropzone(
  "#my-form",
  {
    dictDefaultMessage: "Drag and drop your input file here or click this field to choose a file.",
    maxFiles: 1,
    autoProcessQueue: false,
    paramName: "document"
  }
).on("addedfile", (file) => {
  // Add an info line about the added file for each file.
  let output = document.querySelector("#output")
  if (output) {
    output.innerHTML += `File added: ${file.name}`;
  }
});

import typeahead from 'typeahead-standalone'; // imports library (js)
import 'typeahead-standalone/dist/basic.css'; // imports basic styles (css)

// input element to attach to
const inputElement = document.getElementById("searchInput");

typeahead({
  input: inputElement,
  minLength: -1,
  source: {
    local: ['Grey', 'Brown', 'Black', 'Blue','Green'],
    prefetch: {
      url: 'http://localhost:8095/api/v1/mappingAdministration/',
      done: false
    },
    identifier: "mappingId",
    // templates: {
    //   suggestion: (item, resultSet) => (
    //     `<span class="preview" style="background-color: ${item.hash}"></span>
    //     <div class="text">${item.label}</div>`)
    // }
  }
});
