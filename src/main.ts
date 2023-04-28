import templateContent from "./template.html?raw";
import * as FilePondLib from "filepond";
import { FilePond, FilePondOptions } from "filepond";
import filepondCSS from "filepond/dist/filepond.min.css?inline";
import typeahead from "typeahead-standalone";
import { Dictionary, typeaheadResult } from "typeahead-standalone/dist/types";
import typeaheadCSS from "typeahead-standalone/dist/basic.css?inline";


const ATTRIBUTES: string[] = ["base-url"
];

export class MappingInputProvider extends HTMLElement {
  shadowRoot: ShadowRoot;
  private testingFileChooser: FilePond | null = null;
  private filechooser: Dropzone | null = null;
  private mappingchooser: typeaheadResult<Dictionary> | null = null;

  // --- Attributes accessible from the HTML tag:
  baseUrl: URL = new URL("http://localhost:8095/");
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
            // url: "http://localhost:8095/api/v1/mappingAdministration/",
            // url: "https://metarepo.nffa.eu/mapping-service/api/v1/mappingAdministration/",
            url: this.baseUrl.toString() + "api/v1/mappingAdministration/",
            done: false,
          },
          identifier: "name",
          transform: (data) => {
            for (let item of data) {
              if (typeof item == "object") {
                item.name = item.title ? `${item.mappingId} - ${item.title}` : item.mappingId;
              }
            }
            return data
          },
          dataTokens: ["description"],
          identity: (suggestion) => `${suggestion.mappingId}${suggestion.title}`
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
  // executeMapping() {
  //   let inputElement: HTMLInputElement = <HTMLInputElement>(
  //     this.shadowRoot.getElementById("mappingchooser")
  //   );
  //   console.log(inputElement);
  //   const selectedValue = inputElement && inputElement.value ? inputElement.value : null;
  //   const selectedMappingId = selectedValue ? selectedValue.split("-")[0].trim() : null;
  //   console.log(selectedMappingId);
  
  //   if (this.testingFileChooser != null) {
  //     const uploadedFile = this.testingFileChooser.getFile();
  //     if (uploadedFile != null) {
  //       // const execUrl = "http://localhost:8095/api/v1/mappingExecution/" + selectedMappingId;
  //       const execUrl = "https://metarepo.nffa.eu/mapping-service/api/v1/mappingExecution/" + selectedMappingId;
  //       // const apiUrl = "http://localhost:8095/api/v1/mappingAdministration/" + selectedMappingId;
  //       const file = uploadedFile.file;
  
  //       let formData = new FormData();
  //       if (file != undefined) {
  //         console.log(file.size)
  //         formData.append("document", file);
  //       }
  
  //       return fetch(execUrl, {
  //         method: "POST",
  //         body: formData
  //       })
  //       .then(response => response.json())
  //       .then(responseJson => {
  //         console.log('responseJson :: ', responseJson)
  //         return responseJson;
  //       })
  //       .catch(error => {
  //         console.log(error)
  //         console.log("ERROR")
  //         return null;
  //       });
  //     };
  //   }
  //   return null;
  // }
  // figure out download option 
  
  // async executeMapping(): Promise<void> {
  //   let inputElement: HTMLInputElement = <HTMLInputElement>(
  //     this.shadowRoot.getElementById("mappingchooser")
  //   );
  //   console.log(inputElement);
  //   const selectedValue = inputElement && inputElement.value ? inputElement.value : null;
  //   const selectedMappingId = selectedValue ? selectedValue.split("-")[0].trim() : null;
  //   console.log(selectedMappingId);
  
  //   if (this.testingFileChooser != null) {
  //     const uploadedFile = this.testingFileChooser.getFile();
  //     if (uploadedFile != null) {
  
  //       // const execUrl = "http://localhost:8095/api/v1/mappingExecution/" + selectedMappingId;
  //       const execUrl = "https://metarepo.nffa.eu/mapping-service/api/v1/mappingExecution/" + selectedMappingId;
  //       // const apiUrl = "http://localhost:8095/api/v1/mappingAdministration/" + selectedMappingId;
  //       const file = uploadedFile.file;
  
  //       let formData = new FormData();
  //       if (file != undefined) {
  //         console.log(file.size)
  //         formData.append("document", file);
  //       }
  //       fetch(execUrl, {
  //         method: "POST",
  //         body: formData
  //       })
  //         .then(response => response.json())
  //         .then(responseJson => {
  //           console.log('responseJson :: ', responseJson);
  //             const element = document.createElement('a');
  //             element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(responseJson)));
  //             element.setAttribute('download', "result.json");
  //             element.style.display = 'none';
  //             document.body.appendChild(element);
  //             element.click();
  //             document.body.removeChild(element);
  //         })
  //         .catch(error => {
  //           console.log(error);
  //           console.log("ERROR");
  //         });
  //     }
  //   }
  // }
  async executeMapping(): Promise<any> {
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

        // const execUrl = "http://localhost:8095/api/v1/mappingExecution/" + selectedMappingId;
        // const execUrl = "https://metarepo.nffa.eu/mapping-service/api/v1/mappingExecution/" + selectedMappingId;
        const execUrl = this.baseUrl.toString() + "api/v1/mappingExecution/" + selectedMappingId;
        // const apiUrl = "http://localhost:8095/api/v1/mappingAdministration/" + selectedMappingId;
        const file = uploadedFile.file;

        let formData = new FormData();
        if (file != undefined) {
          console.log(file.size)
          formData.append("document", file);
        }
        return fetch(execUrl, {
          method: "POST",
          body: formData
        }).then(response =>response.json())
        .then(responseJson => {console.log('responseJson :: ', responseJson);
        return responseJson; })
        // .then(response => { console.log('responseJson :: ', response.json());
        // return response.json() });
      }
    }
  }

  triggerDownload(mappedItem: Promise<any>) {
  }
  
}
// Custom Elements:
// If you inherit e.g. from HTMLUListElement instead of HTMLElement,
// you need to write some additional boilerplate here (see commented code).
// Also, the HTML will work different, then. Example:
// <ul is="my-list"></ul>
window.customElements.define(
  "mapping-input",
  MappingInputProvider /* { extends: "ul" } */
);
