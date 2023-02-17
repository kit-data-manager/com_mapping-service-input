import templateContent from './template.html?raw'

import Dropzone from "dropzone";
import dropzoneCSS from "dropzone/dist/dropzone.css?inline"

// Filepond https://pqina.nl/filepond/ as an alternative to dropzone?
import * as FilePondLib from 'filepond';
import { FilePond, FilePondOptions } from 'filepond';
import filepondCSS from "filepond/dist/filepond.min.css?inline"

import typeahead from 'typeahead-standalone';
import { Dictionary, typeaheadResult } from 'typeahead-standalone/dist/types';
import typeaheadCSS from 'typeahead-standalone/dist/basic.css?inline';

const ATTRIBUTES: string[] = [
    "base-url"
];

export class MappingInputProvider extends HTMLElement {

    shadowRoot: ShadowRoot;
    private testingFileChooser: FilePond | null = null;
    private filechooser: Dropzone | null = null;
    private mappingchooser: typeaheadResult<Dictionary> | null = null;

    // --- Attributes accessible from the HTML tag:
    baseUrl: URL = new URL("http://localhost:8090")
    // ---

    // --- Helper methods
    addCssContent(css: string): void {
        let styleElem: HTMLStyleElement = document.createElement("style")
        styleElem.textContent = css
        this.shadowRoot.append(styleElem)
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
        this.shadowRoot = this.attachShadow({ mode: 'open' })

        this.addCssContent(dropzoneCSS)
        this.addCssContent(filepondCSS)
        this.addCssContent(typeaheadCSS)

        {
            // Apply HTML Template to shadow DOM
            const template = document.createElement('template')
            template.innerHTML = templateContent
            this.shadowRoot.append(template.content.cloneNode(true))
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
        let baseUrl = this.getAttribute(ATTRIBUTES[0])
        if (baseUrl != null) {
            this.baseUrl = new URL(baseUrl)
        }


        let filepondElement = this.shadowRoot.querySelector('input[type="file"]');
        if (filepondElement != null) {
            let options: FilePondOptions = FilePondLib.getOptions();
            options.credits = false; // does not work for some reason
            options.maxFiles = 1;
            this.testingFileChooser = FilePondLib.create(filepondElement, options);
        }


        let element = this.shadowRoot.getElementById("filechooser");
        if (element != null) {
            this.filechooser = new Dropzone(
                element,
                {
                    dictDefaultMessage: "Drag and drop your input file here or click this field to choose a file.",
                    maxFiles: 1,
                    autoProcessQueue: false,
                    paramName: "document"
                }
            ).on("addedfile", (file) => {
                // Add an info line about the added file for each file.
                let output = this.shadowRoot.querySelector("#output")
                if (output) {
                    output.innerHTML += `File added: ${file.name}`;
                }
            });
        } else {
            console.error("Could not find element for file chooser (Dropzone).")
        }

        let inputElement: HTMLInputElement = <HTMLInputElement>this.shadowRoot.getElementById("mappingchooser");
        if (inputElement != null) {
            this.mappingchooser = typeahead(
                {
                    input: inputElement,
                    minLength: -1,
                    source: {
                        //local: ["Blue", "Green"], // for local testing
                        prefetch: {
                            url: 'http://localhost:8095/api/v1/mappingAdministration/',
                            done: false
                        },
                        identifier: "mappingId",
                        // templates: {
                        //   suggestion: (item, resultSet) => (
                        //     `<span class="preview" style="background-color: ${item.hash}"></span>
                        //     <div class="text">${item.label}</div>`)
                        // }
                    }
                }
            );
        } else {
            console.error("Could not find element for mapping selector (typeahead).")
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
}

// Custom Elements:
// If you inherit e.g. from HTMLUListElement instead of HTMLElement,
// you need to write some additional boilerplate here (see commented code).
// Also, the HTML will work different, then. Example:
// <ul is="my-list"></ul>
window.customElements.define('mapping-input', MappingInputProvider, /* { extends: "ul" } */);
