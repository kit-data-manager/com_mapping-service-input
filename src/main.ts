import templateContent from "./template.html?raw";
import * as FilePondLib from "filepond";
import { type FilePond, type FilePondOptions } from "filepond";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";

import filepondCSS from "filepond/dist/filepond.min.css?inline";
import customCSS from "./style.css?inline";

const ATTRIBUTES: string[] = ["base-url", "maxSize"];

interface MappingItem {
  mappingId: string;
  title: string;
  description?: string;
  mappingType: string;
  name: string;
}

class MappingInputProvider extends HTMLElement {
  shadowRoot: ShadowRoot;
  private fileChooser: FilePond | null = null;
  // --- Attribute accessible from the HTML tag:
  baseUrl: URL = new URL("http://localhost:8090/");
  maxSize: number = 5;
  // ---

  selectedMappingId: string | null = null;

  // --- Helper methods
  /**
   * Import additional styles.
   *
   * @param {string} css The css file url.
   */
  addCssContent(css: string): void {
    const styleElem: HTMLStyleElement = document.createElement("style");
    styleElem.textContent = css;
    this.shadowRoot.append(styleElem);
  }

  /**
   * Format a given number in bytes to a human-readable file size string.
   *
   * @param {number} bytes The number in bytes.
   * @param {number} decimals The number of decimals (default: 2)
   */
  humanFileSize = (bytes: number, decimals: number = 2) => {
    if (bytes == 0) return "0 Bytes";
    var k = 1024,
      dm = decimals || 2,
      sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
      i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // ---

  /**
   * Constructor for basic initialization. The constructor adds custom styles,
   * the component's template, and first event listeners to the shadowDom.
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
                this.fileChooser?.removeFiles();
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
   * Callback called as soon as the component is connected to the DOM. The function
   * initializes all additional elements, i.e., loads and renders available mappings
   * and initializes the file upload area.
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

    const maxSize = this.getAttribute(ATTRIBUTES[1]);
    if (maxSize != null) {
      this.maxSize = Number.parseInt(maxSize);
      if(isNaN(this.maxSize)){
        console.error("Invalid maxSize attribute. Setting value to default.")
        this.maxSize = 5;
      }
    }

    // initialize and connect file uploader
    const filepondElement = this.shadowRoot.querySelector("input[type=\"file\"]");
    if (filepondElement != null) {
      const options: FilePondOptions = FilePondLib.getOptions();
      FilePondLib.registerPlugin(FilePondPluginFileValidateSize);
      options.credits = false;
      options.maxFiles = 1;
      options.maxFileSize = `${this.maxSize}MB`;
      options.labelIdle = "Drag & Drop your files or <span class=\"filepond--label-action\"> Browse </span><br>" +
        `<span class=\"info-small\">(File size is limited to ${options.maxFileSize})</span>`;
      this.fileChooser = FilePondLib.create(filepondElement, options);
    }

    // Box of detailed contents like image, description of mapping
    const mappingIdsEndpoint = `${this.baseUrl.toString()}api/v1/mappingAdministration/`;
    const optionsContainer: HTMLElement = this.shadowRoot.getElementById(
      "options-container"
    ) as HTMLInputElement;

    // build mapping cards
    fetch(mappingIdsEndpoint)
      .then(async (response) => await response.json())
      .then((mappingIdsData: MappingItem[]) => {
        const mappingIds = mappingIdsData.map((item: MappingItem) => ({
          id: item.mappingId,
          title: item.title,
          description: item.description,
          type: item.mappingType
        }));
        optionsContainer.innerHTML = "";
        for (let i = 0; i < 1; i++) {
          mappingIds.forEach((mapping) => {
            const cardDiv = document.createElement("div");
            cardDiv.classList.add("cards");
            cardDiv.innerHTML = `
          <div class="header">
          <span class="title">${mapping.title}</span>
          </div>
          <span class="description">
            <br>
            <span style="display:inline-block; overflow: auto; height: 124px;">
            ${mapping.description}
          </span>
          </span>
          <button class="selection-button" id="mapping-button-${mapping.id}">Select</button>
            `;

            const button = cardDiv.querySelector(
              `#mapping-button-${mapping.id}`
            );

            if (button != null) {
              button.addEventListener("click", () => {
                const buttons =
                  this.shadowRoot.querySelectorAll(".selection-button");

                //deselect all buttons
                buttons.forEach((button) => {
                  button.classList.remove("selected-id");
                });

                if (mapping.id != this.selectedMappingId) {
                  // Add the "selected" class to the clicked button
                  button.classList.add("selected-id");
                  this.selectedMappingId = mapping.id;
                  this.showMessage("Please select a file and then click on <i><b>Execute Mapping</b></i> to start the mapping process.");
                } else {
                  // Reset the entire selection
                  this.selectedMappingId = null;
                  this.showMessage("Please select a mapping from the list above.");
                }
              });
            }
            optionsContainer.appendChild(cardDiv);
          });
        }
      })
      .catch((error) => {
        console.error("Error while fetch Mapping Ids" + error);
      });
  }

  /**
   * Show a message in the according message area. Depending on the message type
   * the background is either green (INFO) or red (ERROR).
   *
   * @param {string} message The message.
   * @param {"INFO" | "ERROR"} type The message type (default: INFO).
   */
  showMessage(message: string, type: "INFO" | "ERROR" = "INFO") {
    const messageElement = this.shadowRoot.querySelector("#message");
    if (messageElement) {
      if (type === "ERROR") {
        messageElement.innerHTML = "<span class=\"heroicons-outline--exclamation\"></span> " +
          message +
          " <span class=\"heroicons-outline--exclamation\"></span>";
        messageElement.classList.remove("hidden", "info", "error");
        messageElement.classList.add("error");
      } else {
        messageElement.innerHTML = message;
        messageElement.classList.remove("hidden", "info", "error");
        messageElement.classList.add("info");
      }
    }
  }

  /**
   * Execute the currently selected mapping using the selected file, wait for the execution to be finished/failed,
   * and download the result.
   */
  async executeMapping(): Promise<boolean> {
    const selectedMappingId = this.selectedMappingId;
    if (selectedMappingId === null) {
      this.showMessage("No mapping selected.", "ERROR");
      return false;
    } else {
      if (this.fileChooser != null) {
        const files = this.fileChooser.getFiles();
        if (files.length === 0) {
          this.showMessage("No file selected.", "ERROR");
          return false;
        } else {
          if (files[0].fileSize > 5 * 1024 * 1024) {
            this.showMessage(`Selected file is too large 
          (${this.humanFileSize(files[0].fileSize)} > 
          ${this.humanFileSize(this.maxSize * 1024 * 1024)})`, "ERROR");
            return false;
          }
        }

        const uploadedFile = this.fileChooser.getFile();
        if (uploadedFile != null) {
          const execUrl = `${this.baseUrl.toString()}api/v1/mappingExecution/${selectedMappingId}`;
          const file = uploadedFile.file;
          const formData = new FormData();
          if (file !== undefined) {
            formData.append("document", file);
          }

          return await fetch(execUrl, {
            method: "POST",
            body: formData
          })
            .then(async (response) => {
              if (response.status !== 200) {
                throw new Error(`Mapping failed. Service returned with status ${response.status}.`);
              }
              const contentDisposition = response?.headers.get(
                "content-disposition"
              );
              const contentType = response?.headers.get("content-type");

              return {
                data: await response.blob(),
                contentDisposition,
                contentType
              };
            })
            .then((wrapper) => {
              this.triggerDownload(
                wrapper.data,
                wrapper.contentDisposition ?? "",
                wrapper.contentType ?? ""
              );
              this.showMessage("The mapping process has finished and the result was downloaded.<br/>" +
                "<span class=\"heroicons-outline--exclamation\"></span> " +
                "Please check the downloaded result for potential errors. " +
                "<span class=\"heroicons-outline--exclamation\"></span>");
              return true;
            })
            .catch((error) => {
              console.error(`Mapping failed with an error: ${error}`);
              this.showMessage(error, "ERROR");
              return false;
            });
        }
      }
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
    contentType: string
  ): void {
    const element = document.createElement("a");
    const filename = contentDisposition.substring(
      contentDisposition.lastIndexOf("=") + 1
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
  disconnectedCallback(): void {
  }

  /**
   * Invoked each time the custom element is moved to a new document.
   */
  adoptedCallback(): void {
  }

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
    } else if (name === ATTRIBUTES[1]) {
      this.maxSize = newValue;
      this.connectedCallback();
    }
  }
}

window.customElements.define("mapping-input", MappingInputProvider);
