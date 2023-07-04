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
  // logo: string;
  title: string;
  description?: string;
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
    const mappingIdsEndpoint = this.baseUrl.toString() + "api/v1/mappingAdministration/";
    // const mappingIds =
    //   [
    //     {
    //       id:'a',
    //       //logo: 'logo',//based on mapping type: mappingType
    //       title: 'SEM',//based on mapping type: mappingType

    //     },
    //     {
    //       id: 'smthing1',//based on mapping type: mappingID
    //       //logo: 'logo1',//based on mapping type: mappingType
    //       title: 'TEM',//based on mapping type: mappingType

    //     }
    //   ]
    // fetch(mappingIdsEndpoint).then(response =>
    //   {
    //     if(!response.ok){throw new Error("Failed to Fetch Mappings")}
    //     return response.json();
    //   }).then(
    //     mappingIdsData =>
    //     {const mappingIds =mappingIdsData.map(mapping =>({
    //         id:mapping.id,
    //         title:mapping.title
    //     }));

    //     }).catch(error => {
    //       console.error("Error fetching mappingIds:", error);
    //     });

    // const optionsContainer = this.shadowRoot.getElementById("options-container");


    // mappingIds.forEach(mapping => {
    //   const button = document.createElement("button");
    //   button.classList.add("xyz"); // Add the necessary class to the button
    //   // Set the button attributes and content based on the mapping data
    //   button.setAttribute("data-test", "start-basics");
    //   button.innerHTML = `
    //     <img class="zOays" src="https://www.adamdorman.com/_images/sem_logo.jpg" alt="${mapping.title} Logo">
    //     <h2 class="_2cltK">${mapping.title} Metadata Extraction</h2>
    //     <div>Select ${mapping.title}</div>
    //   `;
    //   // Add an event listener to the button if needed
    //   button.addEventListener("click", () => {
    //     // Handle button click event
    //   });
    
    //   // Append the button to the options container
    //   optionsContainer.appendChild(button);
    // });
    let optionsContainer : HTMLElement = <HTMLInputElement>(
      this.shadowRoot.getElementById('options-container')
    );
    fetch(mappingIdsEndpoint).then(response => response.json())
      .then((mappingIdsData: MappingItem[]) => {
        const mappingIds=mappingIdsData.map((item:MappingItem)=>({
          id:item.id,
          title:item.title,
          description:item.description
        }));
        optionsContainer.innerHTML = ''; 
        mappingIds.forEach(mapping =>{
          const button = document.createElement("button");
          button.classList.add("xyz")
          button.setAttribute("data-test", "start-basics");
          button.innerHTML = `
          
          <span class="home-price section-Heading">${mapping.title}</span>
          </div>
          <span class="home-text10">
            <br>
            <span style="display:inline-block; overflow: auto; height: 124px;">
              ${mapping.description}
            </span>
            <br>
            <br>
            <span></span>
            </span>`;
          // <div>Select ${mapping.title}</div>`;
          optionsContainer.appendChild(button);
        })
    


                    // fetch(mappingIdsEndpoint).then(response => response.json())
                    //   .then((mappingIdsData: MappingItem[]) => {
                    //     const mappingIds=mappingIdsData.map((item:MappingItem)=>({
                    //       id:item.id,
                    //       title:item.title
                    //     }));
                    //     mappingIds.forEach(mapping=>
                    //       {
                    //         const optionElement =document.createElement('div');
                    //         optionElement.className = 'mapping-option';
                          
                    //         const idTitleContainer= document.createElement("div")
                    //         idTitleContainer.className="id-title-container";

                    //         const idElement = document.createElement("span");
                    //         idElement.className="mapping-id";
                    //         idElement.textContent=mapping.id;
                    //         idTitleContainer.appendChild(idElement);
                    //         idElement.addEventListener("click",() => 
                    //         {
                    //           const selectedMappingId = mapping.id;
                    //           console.log("Selected Mapping ID:", selectedMappingId);

                    //         })

                    //         const titleElement = document.createElement("span");
                    //         titleElement.className="mapping-title";
                    //         titleElement.textContent=mapping.title;

                    //         idTitleContainer.appendChild(titleElement);
                    //         optionElement.appendChild(idTitleContainer);
                    //         optionsContainer.appendChild(optionElement);
                    //       });

            // const idElement = document.createElement('span');
            // idElement.className = 'mapping-id';
            // idElement.textContent=mapping.id;
            // optionElement.appendChild(idElement);

            // const titleElement = document.createElement('span');
            // idElement.className = 'mapping-title';
            // idElement.textContent=mapping.title;
            // optionElement.appendChild(titleElement);
            // optionsContainer?.appendChild(optionElement);

            // optionElement.addEventListener('click()', () =>
            // {const selectedMappingId = idElement.textContent;

            //   console.log("Selected Mapping ID:", selectedMappingId);

            // })
         

      }).catch(error => 
        {
          console.error('Error while fetch Mapping Ids' +error)
        })



    // let inputElement: HTMLInputElement = <HTMLInputElement>(
    //   this.shadowRoot.getElementById("mappingchooser")
    // );
    // if (inputElement != null) {
    //   typeahead({
    //     input: inputElement,
    //     minLength: -1,
    //     highlight: true,
    //     source: {
    //       prefetch: {
    //         url: this.baseUrl.toString() + "api/v1/mappingAdministration/",
    //         done: false,
    //       },
    //       identifier: "name",
    //       transform: (data) => {
    //         for (let item of data) {
    //           if (typeof item == "object") {
    //             item.name = item.title ? `${item.mappingId} - ${item.title}` : item.mappingId;
    //           }
    //         }
    //         return data
    //       },
    //       dataTokens: ["description"],
    //       identity: (suggestion) => `${suggestion.mappingId}${suggestion.title}`
    //     },
    //     preventSubmit: true,
    //   });
    // } else {
    //   console.error("Could not find element for mapping selector (typeahead).");
    // }
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
