import templateContent from "./template.html?raw";
import * as FilePondLib from "filepond";
import { FilePond, FilePondOptions } from "filepond";
import filepondCSS from "filepond/dist/filepond.min.css?inline";
import customCSS from './style.css?inline';

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
    this.addCssContent(customCSS);

    // Apply HTML Template to shadow DOM
    const template = document.createElement("template");
    template.innerHTML = templateContent;
    this.shadowRoot.append(template.content.cloneNode(true));
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

    //Box of detailed contents like image, description of mapping
    const mappingIdsEndpoint = this.baseUrl.toString() + "api/v1/mappingAdministration/";
    let optionsContainer: HTMLElement = <HTMLInputElement>(
      this.shadowRoot.getElementById('options-container options-center')
    );
    // Remove any existing event listeners before adding a new one
    optionsContainer.removeEventListener("click", this.handleButtonClick.bind(this));

    // Add the event listener
    optionsContainer.addEventListener("click", this.handleButtonClick.bind(this));

    fetch(mappingIdsEndpoint).then(response => response.json())
      .then((mappingIdsData: MappingItem[]) => {
        const mappingIds = mappingIdsData.map((item: MappingItem) => ({
          id: item.mappingId,
          title: item.title,
          description: item.description,
          type: item.mappingType
        }));
        optionsContainer.innerHTML = '';
        mappingIds.forEach(mapping => {
          const division = document.createElement("div")
          division.classList.add("cards");
          division.innerHTML = `
          <!-- Commenting out the image section -->
          <!-- 
          <img class="mapping-image" src="${this.getImageByType(mapping.type)}" alt="Mapping Image" />
          -->
          <h3>${mapping.title}</h3>
          <span class="home-text10 section-description">
            <br>
            <span style="display:inline-block; overflow: auto; height: 124px;">
               ${mapping.description}
            </span>
            </span>
            <button class ="selection-button " id="mapping-button-${mapping.id}" >Select</button>
            `;
          const button = division.querySelector(`#mapping-button-${mapping.id}`);
          if (button) {
            button.addEventListener("click", () => {
              this.selectedMappingId = mapping.id;
              if (!this.messageDisplayed) {
                const fileInput = this.shadowRoot.querySelector("#fileUpload");
                const messageElement = document.createElement("div");
                messageElement.innerText = "Please upload file and then click on map document to extract metadata";
                messageElement.style.marginBottom = "10px"; // Add some bottom margin for spacing
                messageElement.classList.add("message");
                if (fileInput != null && fileInput.parentNode != null) {
                  fileInput.parentNode.insertBefore(messageElement, fileInput);
                }
                this.messageDisplayed = true;
              }
            });
          }
          optionsContainer.appendChild(division);
          if (mappingIds.length < 5) {
            optionsContainer.classList.add('options-center'); // Add the class if less than 5 cards
          } else {
            optionsContainer.classList.remove('options-center'); // Remove the class if more than 5 cards
          }
        })
      }).catch(error => {
        console.error('Error while fetch Mapping Ids' + error)
      })

  }

  /**
   * Invoked each time the custom element is disconnected from the document's DOM.
   */
  disconnectedCallback(): void {
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
    document.body.style.cursor = 'wait';
    const selectedMappingId = this.selectedMappingId;
    if (selectedMappingId && this.testingFileChooser != null) {
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
          body: formData,
        }).then(response => {
          if (response.status !== 200) {
            throw new Error("Request failed with status " + response.status);
          }
          const contentDisposition = response.headers.get("content-disposition") || "";
          const contentType = response.headers.get("content-type") || "";
          return Promise.all([response.blob(), contentDisposition, contentType]);
        })
          .then(([responseBlob, contentDisposition, contentType]) => {
            if (download) {
              this.triggerDownload(responseBlob, contentDisposition, contentType);
            }
          }).catch(error => {
            console.error("Error occured due to response other than 200:", error);
            alert("A remote mapping error occured. Please check server logs for details.");
          }).finally(() => {
            document.body.style.cursor = 'auto';
          })
      }
    }
  }

  /**
   * In case if download is required triggerDownload can be used
   */
  triggerDownload(response: Blob, contentDisposition: string, contentType: string) {
    const element = document.createElement('a');
    const filename = contentDisposition.substr(contentDisposition.lastIndexOf("=") + 1) || 'result';
    element.type = contentType;
    element.href = URL.createObjectURL(response);
    element.download = filename;
    element.style.display = 'none';
    this.shadowRoot.appendChild(element);
    element.click();
    this.shadowRoot.removeChild(element);
    URL.revokeObjectURL(element.href);
  }

  /**
   * In case if you want to show images according the the mappingType eg: SEM,TEM etc yu can use this method
   */
  getImageByType(mappingType: string): string {
    if (mappingType.includes("GEMMA")) {
      // Assuming gemma.png is in the assets/images folder
      return "/images/gemma.png";
    } else if (mappingType.includes("SEM")) {
      // Assuming sem.png is in the assets/images folder
      return "/images/tem.png";
    } else if (mappingType.includes("TEM")) {
      // Assuming tem.png is in the assets/images folder
      return "/images/tem.png";
    } else {
      // Default image path when no mapping type matches
      return "/images/other.png";
    }
  }

  /**
  * We have used this method to capture mapping id which is later used to execute mapping
  */
  private handleButtonClick(event: Event) {
    const selectedButton = event.target as HTMLElement;
    console.log(selectedButton);
    // Remove the "selected" class from all buttons
    const buttons = this.shadowRoot.querySelectorAll(".selection-button");
    buttons.forEach((button) => {
      button.classList.remove("selected-id");
    });
    // Add the "selected" class to the clicked button
    selectedButton.classList.add("selected-id");

    // Get the selected mapping ID from the button's ID
    const selectedMappingId = selectedButton.id.replace("mapping-button-", "");
    this.selectedMappingId = selectedMappingId;
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
