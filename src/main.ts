import templateContent from "./template.html?raw";
import * as FilePondLib from "filepond";
import { FilePond, FilePondOptions } from "filepond";
import filepondCSS from "filepond/dist/filepond.min.css?inline";
import typeahead from "typeahead-standalone";
import { Dictionary, typeaheadResult } from "typeahead-standalone/dist/types";
import typeaheadCSS from "typeahead-standalone/dist/basic.css?inline";

const ATTRIBUTES: string[] = ["base-url"];

export class MappingInputProvider extends HTMLElement {
  shadowRoot: ShadowRoot;
  private testingFileChooser: FilePond | null = null;
  private filechooser: Dropzone | null = null;
  private mappingchooser: typeaheadResult<Dictionary> | null = null;

  // --- Attributes accessible from the HTML tag:
  baseUrl: URL = new URL("http://localhost:8090");
  selectedMappingId: unknown;
  // ---

  // --- Helper methods
  addCssContent(css: string): void {
    let styleElem: HTMLStyleElement = document.createElement("style");
    styleElem.textContent = css;
    this.shadowRoot.append(styleElem);
  }
  // ---

  /**
   * Contruct element properties etc, without DOM access.
   *
   * "an element's attributes are unavailable until connected to the DOM"
   * So you may write to, but not read from it.
   *
   * Sources:
   * - https://andyogo.github.io/custom-element-reactions-diagram/
   * - https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
   */
  constructor() {
    super();
    // Create Shadow DOM
    this.shadowRoot = this.attachShadow({ mode: "open" });
    this.addCssContent(filepondCSS);
    this.addCssContent(typeaheadCSS);

    {
      // Apply HTML Template to shadow DOM
      const template = document.createElement("template");
      template.innerHTML = templateContent;
      this.shadowRoot.append(template.content.cloneNode(true));
    }
  }

  /**
   * Which attributes to notice change for.
   *
   * For all returned attributes, attributeChangedCallback might be called
   * due to add/remove/change events.
   */
  static get observedAttributes() {
    return ATTRIBUTES;
  }

  /**
   * Initialize your component.
   *
   * Invoked each time the custom element is appended into a document-connected element.
   * This will happen each time the node is moved, and may happen before the element's
   * contents have been fully parsed.
   *
   * Note: connectedCallback may be called once your element is no longer connected,
   * use Node.isConnected to make sure.
   *
   * Source: https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
   */
  connectedCallback(): void {
    if (!this.isConnected) {
      // Might be called after disconnected. Handle this here.
      return;
    }
    let baseUrl = this.getAttribute(ATTRIBUTES[0]);
    if (baseUrl != null) {
      this.baseUrl = new URL(baseUrl);
    }

    let filepondElement = this.shadowRoot.querySelector('input[type="file"]');
    if (filepondElement != null) {
      let options: FilePondOptions = FilePondLib.getOptions();
      options.credits = false; // does not work for some reason
      options.maxFiles = 1;
      this.testingFileChooser = FilePondLib.create(filepondElement, options);
    }
    let inputElement: HTMLInputElement = <HTMLInputElement>(
      this.shadowRoot.getElementById("mappingchooser")
    );
    if (inputElement != null) {
      this.mappingchooser = typeahead({
        input: inputElement,
        minLength: -1,
        highlight: true,
        source: {
          prefetch: {
            url: "http://localhost:8095/api/v1/mappingAdministration/",
            done: false,
          },
          identifier: "name",
          transform: (data) => {
            for (let item of data) {
              if (typeof item == "object") {
                item.name = `${item.mappingId} - ${item.description}`
              }
            }
            return data
          },
          dataTokens: ["description"],
          identity: (suggestion) => `${suggestion.mappingId}${suggestion.description}`
        },
        preventSubmit: true,
        onSubmit: (e, selectedSuggestion) => {
          if (selectedSuggestion) {
            this.selectedMappingId = selectedSuggestion.mappingId;
            console.log(this.selectedMappingId);
            alert('Selected suggestion - ' + JSON.stringify(selectedSuggestion));

          }
        },
      });
    } else {
      console.error("Could not find element for mapping selector (typeahead).");
    }
  }

  /**
   * Invoked each time the custom element is disconnected from the document's DOM.
   */
  disconnectedCallback(): void {
    return;
  }

  /**
   * Invoked each time the custom element is moved to a new document.
   */
  adoptedCallback() {
    return;
  }

  /**
   * Invoked each time one of the custom element's attributes is added, removed, or changed.
   * Which attributes to notice change for is specified in a static get observedAttributes method.
   *
   * @param name attributes name
   * @param oldValue attributes value before the change
   * @param newValue attributes value after the change
   */
  attributeChangedCallback(name: string, _oldValue: any, newValue: any) {
    if (name == ATTRIBUTES[0]) {
      this.baseUrl = newValue;
      this.connectedCallback();
    }
    this.filechooser;
    this.testingFileChooser;
    this.mappingchooser;
  }
  // Steps to for executemapping function
  // figure out the selected/current mapping ID
  // use the selected mapping ID to execute the mapping
  // figure out the selected/current file content (for the request body later)
  // do the request (fetch & stuff)
  // read result from response
  // return the response (json)

  // Using HttpRequest : Working fine
  executeMapping() {
    let inputElement: HTMLInputElement = <HTMLInputElement>(
      this.shadowRoot.getElementById("mappingchooser")
    );
    console.log(inputElement);
    const selectedValue = inputElement && inputElement.value ? inputElement.value : null;
    const selectedMappingId = selectedValue ? selectedValue.split("-")[0].trim() : null;
    console.log(selectedMappingId);

    if (this.testingFileChooser != null) {
      const uploadedFile = this.testingFileChooser.getFile();
      if (uploadedFile != null) {

        const execUrl = "http://localhost:8095/api/v1/mappingExecution/" + selectedMappingId;
        const apiUrl = "http://localhost:8095/api/v1/mappingAdministration/" + selectedMappingId;
        const file = uploadedFile.file

        let formData = new FormData()
        if (file != undefined) {
          console.log(file.size)
          formData.append("document", file)
        }

        const http = new XMLHttpRequest();
        http.open("POST", execUrl)
        http.send(formData)
        http.onload = () => {
          console.log('responseText :: ' + http.responseText)
          const downloadHTTP = new XMLHttpRequest();
          downloadHTTP.open("GET", apiUrl);
          downloadHTTP.send();
          downloadHTTP.onload = () => {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(http.responseText));
            element.setAttribute('download', "result.json");
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
          }
        }
        http.onprogress = () => {
          console.log("In progress...")
        }
        http.ontimeout = () => {
          console.log(http.responseText)
          console.log("TIMEOUT")
        }
        http.onerror = () => {
          console.log(http.responseText)
          console.log("ERROR")
        }
      };
    }
  }

}

// Alternate solution using Fetch not working
//   executeMapping() {

//     if (this.testingFileChooser != null) {
//       const uploadedFile = this.testingFileChooser.getFile();
//       if (uploadedFile != null) {
//         const file = uploadedFile.file;
//         const reader = new FileReader();
//         const execUrl = "http://localhost:8095/api/v1/mappingExecution/";
//         // reader.readAsDataURL(file);
//         reader.readAsBinaryString(file)
//         reader.onloadend = () => {
//           const fileData = reader.result as String;

//           console.log('value of filedata' +fileData)
//           const fileName = uploadedFile.filename;
//           const mimeType = uploadedFile.fileType;
//           const requestOptions = {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ fileData, fileName,mimeType}),

//           };
//           fetch(execUrl + selectedMappingId, requestOptions)
//           .then((response) => {
//             response.json();
//             console.log(response.status)
//           console.log('response' +response)})
//             // .then((response) => response.json()).catch((error) => console.error(error));

//               // const downloadHTTP = new XMLHttpRequest();
//               // const apiUrl = "http://localhost:8095/api/v1/mappingAdministration/";
//               // const responseOptions = {
//               //   method: "GET",
//               //   // headers: { "Content-Type": "multipart/form-data" }
//               // };
//               // fetch( apiUrl + selectedMappingId, responseOptions)

//               // downloadHTTP.open("GET", apiUrl + selectedMappingId);
//               // downloadHTTP.send();
//               // downloadHTTP.onload = () => {
//               //   const element = document.createElement("a");
//               //   element.setAttribute(
//               //     "href",
//               //     "data:text/plain;charset=utf-8," +
//               //       encodeURIComponent(downloadHTTP.responseText)
//               //   );
//               //   console.log(downloadHTTP.getAllResponseHeaders)
//               //   element.setAttribute("download", "result.json");
//               //   element.style.display = "none";
//               //   document.body.appendChild(element);
//               //   element.click();
//               //   document.body.removeChild(element);
//               // };


//         };
//       }
//     }

//   }
// }
// Custom Elements:
// If you inherit e.g. from HTMLUListElement instead of HTMLElement,
// you need to write some additional boilerplate here (see commented code).
// Also, the HTML will work different, then. Example:
// <ul is="my-list"></ul>
window.customElements.define(
  "mapping-input",
  MappingInputProvider /* { extends: "ul" } */
);
