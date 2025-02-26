import templateContent from "./template.html?raw";
import * as FilePondLib from "filepond";
import {type FilePond, type FilePondOptions} from "filepond";
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';

import filepondCSS from "filepond/dist/filepond.min.css?inline";
import customCSS from "./style.css?inline";

const ATTRIBUTES: string[] = ["base-url"];

interface MappingItem {
  mappingId: string;
  title: string;
  description?: string;
  mappingType: string;
  name: string;
}

class MappingInputProvider extends HTMLElement {
  shadowRoot: ShadowRoot;
  private testingFileChooser: FilePond | null = null;
  // --- Attribute accessible from the HTML tag:
  baseUrl: URL = new URL("http://localhost:8090/");
  // ---

  selectedMappingId: string | null = null;
  selectedMappingType: string | null = null;
  messageDisplayed: boolean | null = null;

  // --- Helper methods
  addCssContent(css: string): void {
    const styleElem: HTMLStyleElement = document.createElement("style");
    styleElem.textContent = css;
    this.shadowRoot.append(styleElem);
  }

  // ---

  /**
   * Construct element properties etc, without DOM access.
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
    this.addCssContent(customCSS);

    // Apply HTML Template to shadow DOM
    const template = document.createElement("template");
    template.innerHTML = templateContent;
    this.shadowRoot.append(template.content.cloneNode(true));

    // add the event handler for the submit button
    const submit = this.shadowRoot.getElementById("submit");
    if (submit != null) {
      submit.addEventListener(
        "click",
        () => {
          const submit = this.shadowRoot.getElementById("submit");
          if (submit != null) {
            submit.setAttribute("disabled", "true");
            submit.innerText = "Please wait...";
            void this.executeMapping()
              .then((result) => {
                if (result) {
                  console.log("Mapping successfully finished.");
                } else {
                  console.error("Mapping failed.");
                }
              })
              .finally(() => {
                submit.removeAttribute("disabled");
                submit.innerText = "Execute Mapping";
                this.testingFileChooser?.removeFiles();
              });
          }
        },
        false
      );
    }
  }

  /**
   * Which attributes to notice change for.
   *
   * For all returned attributes, attributeChangedCallback might be called
   * due to add/remove/change events.
   */
  static get observedAttributes(): string[] {
    return ATTRIBUTES;
  }

  /**
   * Initialize component.
   */
  connectedCallback(): void {
    if (!this.isConnected) {
      // Might be called after disconnected. Handle this here.
      return;
    }
    const baseUrl = this.getAttribute(ATTRIBUTES[0]);
    if (baseUrl != null) {
      this.baseUrl = new URL(baseUrl);
    }

    // initialize and connect file uploader
    const filepondElement = this.shadowRoot.querySelector('input[type="file"]');
    if (filepondElement != null) {
      const options: FilePondOptions = FilePondLib.getOptions();
      FilePondLib.registerPlugin(FilePondPluginFileValidateSize);
      options.credits = false;
      options.maxFiles = 1;
      options.maxFileSize = '1MB';
      options.labelIdle = 'Drag & Drop your files or <span class="filepond--label-action"> Browse </span><br>' +
          '<span class="info-small">(File size is limited to 50MB)</span>';
      this.testingFileChooser = FilePondLib.create(filepondElement, options);
    }

    // Box of detailed contents like image, description of mapping
    const mappingIdsEndpoint = `${this.baseUrl.toString()}api/v1/mappingAdministration/`;
    const optionsContainer: HTMLElement = this.shadowRoot.getElementById(
      "options-container options-center",
    ) as HTMLInputElement;

    // build mapping cards
    fetch(mappingIdsEndpoint)
      .then(async (response) => await response.json())
      .then((mappingIdsData: MappingItem[]) => {
        const mappingIds = mappingIdsData.map((item: MappingItem) => ({
          id: item.mappingId,
          title: item.title,
          description: item.description,
          type: item.mappingType,
        }));
        optionsContainer.innerHTML = "";
        mappingIds.forEach((mapping) => {
          const cardsDiv = document.createElement("div");
          cardsDiv.classList.add("cards");
          cardsDiv.innerHTML = `
          <h3>${mapping.title}</h3>
          <span class="home-text10 section-description">
            <br>
            <span style="display:inline-block; overflow: auto; height: 124px;">
            ${mapping.description}
          </span>
          </span>
          <button class="selection-button" id="mapping-button-${mapping.id}">Select</button>
            `;

          const button = cardsDiv.querySelector(
            `#mapping-button-${mapping.id}`,
          );

          if (button != null) {
            button.addEventListener("click", () => {
              const buttons =
                this.shadowRoot.querySelectorAll(".selection-button");
              buttons.forEach((button) => {
                button.classList.remove("selected-id");
              });
              // Add the "selected" class to the clicked button
              button.classList.add("selected-id");

              this.selectedMappingId = mapping.id;
              if (this.messageDisplayed === null) {
                const fileInput = this.shadowRoot.querySelector("#fileUpload");
                const messageElement = document.createElement("div");
                messageElement.innerText =
                  "Please upload file and then click on map document to extract metadata";
                messageElement.style.marginBottom = "10px"; // Add some bottom margin for spacing
                messageElement.classList.add("message");
                if (fileInput?.parentNode != null) {
                  fileInput.parentNode.insertBefore(messageElement, fileInput);
                }
                this.messageDisplayed = true;
              }
            });
          }
          optionsContainer.appendChild(cardsDiv);
          if (mappingIds.length < 4) {
            optionsContainer.classList.add("options-center"); // Add the class if less than 4 cards
          } else {
            optionsContainer.classList.remove("options-center"); // Remove the class if more than 4 cards
          }
        });
      })
      .catch((error) => {
        console.error("Error while fetch Mapping Ids" + error);
      });
  }

  /**
   * Execute the currently selected mapping using the selected file, wait for the execution to be finished/failed,
   * and download the result.
   */
  async executeMapping(): Promise<boolean> {
    const selectedMappingId = this.selectedMappingId;
    if (selectedMappingId != null && this.testingFileChooser != null) {
      const files = this.testingFileChooser.getFiles();
      console.log("FILES ", files);
      return await this.testingFileChooser.processFiles(files).then((result) => {
        console.log("RES ", result);
        return false;
      });

     /* const uploadedFile = this.testingFileChooser.getFile();
      if (uploadedFile != null) {
        console.log(uploadedFile.status);

        const execUrl = `${this.baseUrl.toString()}api/v1/mappingExecution/${selectedMappingId}`;
        const file = uploadedFile.file;
        const formData = new FormData();
        if (file !== undefined) {
          formData.append("document", file);
        }

        return await fetch(execUrl, {
          method: "POST",
          body: formData,
        })
          .then(async (response) => {
            if (response.status !== 200) {
              throw new Error("Request failed with status " + response.status);
            }
            const contentDisposition = response?.headers.get(
              "content-disposition",
            );
            const contentType = response?.headers.get("content-type");

            return {
              data: await response.blob(),
              contentDisposition,
              contentType,
            };
          })
          .then((wrapper) => {
            this.triggerDownload(
              wrapper.data,
              wrapper.contentDisposition ?? "",
              wrapper.contentType ?? "",
            );
            return true;
          })
          .catch((error) => {
            console.error(
              "Error occurred due to response other than 200:",
              error,
            );
            alert(
              "A remote mapping error occurred. Please check server logs for details.",
            );
            return false;
          });
      } */
    }
    // fallback in case something fails to log an error
    return false;
  }

  /**
   * Trigger the download of the mapping result. The function will add a link element including the response as
   * object URL and triggers a click event before removing both, the link and the allocated object URL, again.
   *
   * @param {Blob} response The binary response data.
   * @param {string} contentDisposition The contentDisposition header value containing the filename to assign.
   * @param {string} contentType The content type header value containing the content type of the result.
   */
  triggerDownload(
    response: Blob,
    contentDisposition: string,
    contentType: string,
  ): void {
    const element = document.createElement("a");
    const filename = contentDisposition.substring(
      contentDisposition.lastIndexOf("=") + 1,
    );
    element.type = contentType;
    element.href = URL.createObjectURL(response);
    element.download = filename ?? "result";
    element.style.display = "none";
    this.shadowRoot.appendChild(element);
    element.click();
    this.shadowRoot.removeChild(element);
    URL.revokeObjectURL(element.href);
  }

  /**
   * Invoked each time the custom element is disconnected from the document's DOM.
   */
  disconnectedCallback(): void {}

  /**
   * Invoked each time the custom element is moved to a new document.
   */
  adoptedCallback(): void {}

  /**
   * Invoked each time one of the custom element's attributes is added, removed, or changed.
   * Which attributes to notice change for is specified in a static get observedAttributes method.
   *
   * @param name attributes name
   * @param _oldValue attributes value before the change
   * @param newValue attributes value after the change
   */
  attributeChangedCallback(name: string, _oldValue: any, newValue: any): void {
    if (name === ATTRIBUTES[0]) {
      this.baseUrl = newValue;
      this.connectedCallback();
    }
  }
}

window.customElements.define("mapping-input", MappingInputProvider);
