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
  private mappingchooser: typeaheadResult<Dictionary> | null = null;
  // --- Attribute accessible from the HTML tag:
  baseUrl: URL = new URL("http://localhost:8090/");

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
  }

  /**
   * Optional boolean parameter download used in executeMapping method, user can choose to download the result.
   * It will help user chose between true, false or no parameter
   * No parameter will be considered as false
   * executeMapping method will return promise of type any
  */
  executeMapping(): Promise<any>;
  async executeMapping(download: boolean = false): Promise<any> {
    let inputElement: HTMLInputElement = <HTMLInputElement>(
      this.shadowRoot.getElementById("mappingchooser")
    );
    const selectedValue = inputElement?.value;
    const selectedMappingId = selectedValue?.split("-")[0].trim();
    if (this.testingFileChooser != null) {
      const uploadedFile = this.testingFileChooser.getFile();
      if (uploadedFile != null) {
        const execUrl = this.baseUrl.toString() + "api/v1/mappingExecution/" + selectedMappingId;
        const file = uploadedFile.file;

        let formData = new FormData();
        if (file != undefined) {
          formData.append("document", file);
        }
        return fetch(execUrl, {
          method: "POST",
          body: formData
        }).then(response => response.json())
          .then(responseJson => {
            if (download) {
              this.triggerDownload(responseJson);
            }
          })
      }
    }
  }

  /**
   * In case if download is required triggerDownload can be used
   */
  triggerDownload(response: Promise<any>) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(response)));
    element.setAttribute('download', "result.json");
    element.style.display = 'none';
    this.shadowRoot.appendChild(element);
    element.click();
    this.shadowRoot.removeChild(element);
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
