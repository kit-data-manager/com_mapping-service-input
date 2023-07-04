import templateContent from "./template.html?raw";
import * as FilePondLib from "filepond";
import { FilePond, FilePondOptions } from "filepond";
import filepondCSS from "filepond/dist/filepond.min.css?inline";
// import typeahead from "typeahead-standalone";
import typeaheadCSS from "typeahead-standalone/dist/basic.css?inline";
import customCSS from './style.css?inline';

const ATTRIBUTES: string[] = ["base-url"];
interface MappingItem {
  id: string;
  title: string;
  description?: string;
  mappingType:string;
  name:string;
}
class MappingInputProvider extends HTMLElement {
  shadowRoot: ShadowRoot;
  private testingFileChooser: FilePond | null = null;
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
    //plugin endpoint test 
    let pluginContainer : HTMLElement = <HTMLInputElement>(
      this.shadowRoot.getElementById('plugin-container')
    );
    const pluginEndpoints = this.baseUrl.toString() + "api/v1/mappingAdministration/types"
    fetch(pluginEndpoints).then(response =>response.json()
    )
    .then((pluginData: MappingItem[]) =>{
      console.log(pluginData);
      const pluginType = pluginData.map((item:MappingItem)=>({
        id:item.id,
        name:item.name
      }));
      pluginContainer.innerHTML='';
      console.log(pluginData);
      pluginType.forEach(plugin=>
        {
          const division = document.createElement("div")
          division.classList.add("xyz");

          division.innerHTML=`
          <span >Type : ${plugin.id}</span>
          <span class="home-price section-Heading">Title: ${plugin.name}</span>
          `
          pluginContainer.appendChild(division);
        })

    }).catch(error => {
      console.log(`Error fetching data from server`, error);
    })
    //Box of detailed contents like title , description
    const mappingIdsEndpoint = this.baseUrl.toString() + "api/v1/mappingAdministration/";
    let optionsContainer : HTMLElement = <HTMLInputElement>(
      this.shadowRoot.getElementById('options-container')
    );
    fetch(mappingIdsEndpoint).then(response => response.json())
      .then((mappingIdsData: MappingItem[]) => {
        const mappingIds = mappingIdsData.map((item:MappingItem)=>({
          id:item.id,
          title:item.title,
          description:item.description,
          type: item.mappingType
        }));
        optionsContainer.innerHTML = ''; 
        mappingIds.forEach(mapping =>{
          const division = document.createElement("div")
          const button = document.createElement("button");
          button.classList.add("xyz");
          division.classList.add("xyz");
          button.setAttribute("data-test", "start-basics");
          division.innerHTML = `
          <span >Type : ${mapping.type}</span>
          <span class="home-price section-Heading">Title: ${mapping.title}</span>
          </div>
          <span class="home-text10">
            <br>
            <span style="display:inline-block; overflow: auto; height: 124px;">
              Description: ${mapping.description}
            </span>
            <br>
            <br>
            <span></span>
            </span>
            <button>select</button>
            `;
          optionsContainer.appendChild(division);
        })
      }).catch(error => 
        {
          console.error('Error while fetch Mapping Ids' +error)
        })

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
    document.body.style.cursor = 'wait';
    let inputElement: HTMLInputElement = <HTMLInputElement>(
      this.shadowRoot.getElementById("options-container")
    );
    const selectedValue = inputElement?.value;
    console.log('Selected Value ' +selectedValue)
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
