import Dropzone from "dropzone";
// Optionally, import the dropzone file to get default styling.
import "dropzone/dist/dropzone.css";
import "./style.css";

const myDropzone = new Dropzone("#my-form",
  {
    dictDefaultMessage: "Upload",
    maxFiles: 1
  }
);

const output = document.querySelector("#output");

//Dropzone("div#myId", { dictDefaultMessage:"Upload",url: "/file/post"});

myDropzone.on("addedfile", (file) => {
  // Add an info line about the added file for each file.
  output.innerHTML += `<div>File added: ${file.name}</div>`;
});

const typeahead = require('typeahead-standalone');
require('typeahead-standalone/dist/basic.css');

// local Data
const colors = ['Grey', 'Brown', 'Black', 'Blue'];

// input element to attach to
const inputElement = document.getElementById("searchInput");

typeahead({
    input: inputElement,
    source: {
      local: colors,
      // prefetch: {...}
      // remote: {...}
    }
});