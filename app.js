import Dropzone from "dropzone";
// Optionally, import the dropzone file to get default styling.
import "dropzone/dist/dropzone.css";
import "./style.css";

const myDropzone = new Dropzone("#my-form",
  {
    dictDefaultMessage: "Upload",
    maxFiles: 1,
    autoProcessQueue: false,
    paramName: "document"
  }
);

const output = document.querySelector("#output");

//Dropzone("div#myId", { dictDefaultMessage:"Upload",url: "/file/post"});

myDropzone.on("addedfile", (file) => {
  // Add an info line about the added file for each file.
  output.innerHTML += `<div>File added: ${file.name}</div>`;
});

import typeahead from 'typeahead-standalone'; // imports library (js)
import 'typeahead-standalone/dist/basic.css'; // imports basic styles (css)

// local Data
// const colors = ['Grey', 'Brown', 'Black', 'Blue','Green'];

// input element to attach to
const inputElement = document.getElementById("searchInput");

typeahead({
  input: inputElement,
  minLength: -1,
  source: {
    prefetch: {
      url: 'http://localhost:8095/api/v1/mappingAdministration/'
    },
    identifier: "mappingId",
    // templates: {
    //   suggestion: (item, resultSet) => (
    //     `<span class="preview" style="background-color: ${item.hash}"></span>
    //     <div class="text">${item.label}</div>`)
    // }
  }
});


// typeahead({
//   input: document.getElementById('colorSearch'),
//   highlight: true,
//   source: {
//     local: ['Grey', 'Brown', 'Black', 'Blue'],
//   }
// });

// typeahead({
//   input: inputElement,
//   source: {
//     local: colors,
//     // prefetch: {...}
//     // remote: {...}
//   },
//   showHintOnFocus: true
// });
