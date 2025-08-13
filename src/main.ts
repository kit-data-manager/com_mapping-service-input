import templateContent from './template.html?raw';
import * as FilePondLib from 'filepond';
import { type FilePond, type FilePondOptions } from 'filepond';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';

import filepondCSS from 'filepond/dist/filepond.min.css?inline';
import customCSS from './style.css?inline';

const ATTRIBUTES: string[] = ['base-url', 'maxSize'];

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
  baseUrl: URL = new URL('http://localhost:8090/');
  maxSize: number = 5;
  // ---

  selectedMappingId: string | null = null;

  /** Convenience list of observed attributes (see static getter below) */

  // --- Helper methods
  /**
   * Import additional styles.
   *
   * @param {string} css The css file url.
   */
  addCssContent(css: string): void {
    const styleElem: HTMLStyleElement = document.createElement('style');
    styleElem.textContent = css;
    this.shadowRoot.append(styleElem);
  }

  /**
   * Format a given number in bytes to a human-readable file size string.
   *
   * @param {number} bytes The number in bytes.
   * @param {number} decimals The number of decimals (default: 2)
   */
  humanFileSize(bytes: number, decimals = 2): string {
    if (!bytes) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(decimals)} ${units[i]}`;
  }

  // ---

  /**
   * Constructor for basic initialization. The constructor adds custom styles,
   * the component's template, and first event listeners to the shadowDom.
   */
  constructor() {
    super();
    // Create Shadow DOM
    this.shadowRoot = this.attachShadow({ mode: 'open' });
    this.addCssContent(filepondCSS);
    this.addCssContent(customCSS);

    // Apply HTML Template to shadow DOM
    const template = document.createElement('template');
    template.innerHTML = templateContent;
    this.shadowRoot.append(template.content.cloneNode(true));

    // add the event handler for the submit button
    const submit = this.getSubmitButton();
    if (submit) {
      submit.setAttribute('disabled', 'true');
      submit.addEventListener('click', () => void this.handleSubmitClick(), false);
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
    this.parseAttributes();
    this.ensureFilePond();
    void this.loadAndRenderMappings();
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
  attributeChangedCallback(name: string, _oldValue: unknown, newValue: string): void {
    if (name === ATTRIBUTES[0]) {
      try {
        this.baseUrl = new URL(newValue);
        void this.loadAndRenderMappings();
      } catch (e) {
        console.error('Invalid base-url attribute', e);
      }
    } else if (name === ATTRIBUTES[1]) {
      const parsed = Number.parseInt(newValue);
      if (!isNaN(parsed) && parsed > 0) {
        this.maxSize = parsed;
        this.updateFilePondMaxSize();
      } else {
        console.warn('Ignored invalid maxSize attribute change:', newValue);
      }
    }
  }
  /**
   * Execute the currently selected mapping using the selected file, wait for the execution to be finished/failed,
   * and download the result.
   */
  async executeMapping(): Promise<boolean> {
    const mappingId = this.selectedMappingId;
    if (!mappingId) return this.fail('No mapping selected.');
    if (!this.fileChooser) return this.fail('File chooser not ready.');

    const files = this.fileChooser.getFiles();
    if (!files.length) return this.fail('No file selected.');
    const first = files[0];
    const maxBytes = this.maxSize * 1024 * 1024;
    if (first.fileSize > maxBytes)
      return this.fail(
        `Selected file is too large (${this.humanFileSize(first.fileSize)} > ${this.humanFileSize(maxBytes)})`,
      );

    const uploadedFile = this.fileChooser.getFile();
    if (!uploadedFile?.file) return this.fail('Unable to access selected file.');

    const file = uploadedFile.file;
    const formData = new FormData();
    formData.append('document', file);
    const execUrl = `${this.baseUrl.toString()}api/v1/mappingExecution/${mappingId}`;

    console.debug('Executing mapping:', {
      mappingId,
      url: execUrl,
      fileName: file.name,
      fileSize: this.humanFileSize(file.size),
      maxSize: this.humanFileSize(maxBytes),
    });

    try {
      const response = await fetch(execUrl, { method: 'POST', body: formData });
      if (response.status !== 200)
        throw new Error(`Mapping failed. Service returned with status ${response.status}.`);
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') ?? '';
      const contentType = response.headers.get('content-type') ?? '';
      this.triggerDownload(blob, contentDisposition, contentType);
      this.showMessage(
        '<span class="heroicons-outline--exclamation"></span> The mapping process has finished and the result was downloaded.<br>Please check the downloaded result for potential errors. <span class="heroicons-outline--exclamation"></span>',
      );
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Mapping failed with an error: ${msg}`);
      this.showMessage(msg, 'ERROR');
      return false;
    }
  }

  /**
   * Trigger the download of the mapping result. The function will add a link element including the response as
   * object URL and triggers a click event before removing both, the link and the allocated object URL, again.
   *
   * @param {Blob} response The binary response data.
   * @param {string} contentDisposition The contentDisposition header value containing the filename to assign.
   * @param {string} contentType The content type header value containing the content type of the result.
   */
  triggerDownload(response: Blob, contentDisposition: string, contentType: string): void {
    const element = document.createElement('a');
    const filename = contentDisposition.substring(contentDisposition.lastIndexOf('=') + 1);
    element.type = contentType;
    element.href = URL.createObjectURL(response);
    element.download = this.sanitizeFilename(filename ?? 'result');
    element.style.display = 'none';
    this.shadowRoot.appendChild(element);
    element.click();
    this.shadowRoot.removeChild(element);
    URL.revokeObjectURL(element.href);
  }

  // ----- Refactored helper methods -----

  private parseAttributes(): void {
    /**
     * Parse (or re-parse) supported HTML attributes on the host element and push them
     * into the internal state (baseUrl & maxSize). Invalid values are ignored and
     * previously valid values are retained. This is invoked on connect and can be
     * re-used if attributes change prior to FilePond initialization.
     */
    const baseUrl = this.getAttribute(ATTRIBUTES[0]);
    if (baseUrl) {
      try {
        this.baseUrl = new URL(baseUrl);
      } catch (e) {
        console.error('Invalid base-url attribute, keeping previous value.', e);
      }
    }
    const maxSizeAttr = this.getAttribute(ATTRIBUTES[1]);
    if (maxSizeAttr) {
      const parsed = Number.parseInt(maxSizeAttr);
      if (!isNaN(parsed) && parsed > 0) {
        this.maxSize = parsed;
      } else {
        console.error('Invalid maxSize attribute. Using default (5MB).');
        this.maxSize = 5;
      }
    }
  }

  private ensureFilePond(): void {
    /**
     * Lazily create the FilePond instance (only once). If it already exists we just
     * update its max file size option. This encapsulates all FilePond related
     * setup so other code does not need to know about library specifics.
     */
    if (this.fileChooser) {
      this.updateFilePondMaxSize();
      return;
    }
    const filepondElement = this.shadowRoot.querySelector("input[type='file']");
    if (!filepondElement) return;
    const options: FilePondOptions = FilePondLib.getOptions();
    FilePondLib.registerPlugin(FilePondPluginFileValidateSize);
    options.credits = false;
    options.maxFiles = 1;
    options.maxFileSize = `${this.maxSize}MB`;
    options.labelIdle = `Drag & Drop your files or Browse (File size limit: ${options.maxFileSize})`;
    this.fileChooser = FilePondLib.create(filepondElement, options);
    queueMicrotask(() => this.decorateFilePondLabel(options.maxFileSize as string));
  }

  private decorateFilePondLabel(limit: string): void {
    /**
     * Replace FilePond's default idle label with an accessible, keyboard friendly
     * variant that contains the current size limit. Adds custom keyboard handling
     * so ENTER / SPACE on the fake "Browse" span opens the file dialog.
     *
     * @param limit A string like "5MB" shown to the user.
     */
    const dropLabel = this.shadowRoot.querySelector('.filepond--drop-label');
    if (!dropLabel) return;
    dropLabel.innerHTML =
      // Build programmatically to guarantee non-collapsing spaces before & after the Browse action.
      // Using text nodes avoids surprises from HTML whitespace collapsing rules or CSS resets.
      '';
    dropLabel.replaceChildren();
    // Use non‑breaking spaces (\u00A0) so spacing is preserved regardless of CSS white-space rules.
    dropLabel.append('Drag & Drop your files or\u00A0');
    const browseEl = document.createElement('span');
    browseEl.className = 'filepond--label-action';
    browseEl.setAttribute('role', 'button');
    browseEl.setAttribute('tabindex', '0');
    browseEl.textContent = 'Browse';
    dropLabel.append(browseEl);
    dropLabel.append('\u00A0');
    dropLabel.append(document.createElement('br'));
    const info = document.createElement('span');
    info.className = 'info-small';
    info.textContent = `(File size is limited to ${limit})`;
    dropLabel.append(info);
    const trigger = () => this.fileChooser?.browse();
    browseEl.addEventListener('click', trigger);
    browseEl.addEventListener('keydown', (e: Event) => {
      const kev = e as KeyboardEvent;
      if (kev.key === 'Enter' || kev.key === ' ') {
        kev.preventDefault();
        trigger();
      }
    });
  }

  private updateFilePondMaxSize(): void {
    /**
     * Update the runtime max file size of the existing FilePond instance and refresh
     * the inline label text so the UI matches the new constraint.
     */
    if (!this.fileChooser) return;
    const newLimit = `${this.maxSize}MB`;
    // FilePond instance typing does not expose options mutation; cast to minimal shape.
    interface MutableMaxSize {
      options: { maxFileSize?: string };
    }
    (this.fileChooser as unknown as MutableMaxSize).options.maxFileSize = newLimit;
    this.decorateFilePondLabel(newLimit);
  }

  private async loadAndRenderMappings(): Promise<void> {
    /**
     * Fetch the list of available mappings from the backend and (re)render them as
     * selectable cards. On network / parse failures, an error message is shown and
     * previously rendered content (if any) is left untouched.
     */
    const endpoint = `${this.baseUrl.toString()}api/v1/mappingAdministration/`;
    let data: MappingItem[] = [];
    try {
      const resp = await fetch(endpoint);
      data = await resp.json();
    } catch (e) {
      console.error('Error fetching mappings', e);
      this.showMessage('Failed to load mappings.', 'ERROR');
      return;
    }
    const mappings = data.map((item) => ({
      id: item.mappingId,
      title: item.title,
      description: item.description,
      type: item.mappingType,
    }));
    const container = this.shadowRoot.getElementById('options-container');
    if (!container) return;
    container.innerHTML = '';
    mappings.forEach((m, idx) => container.appendChild(this.createMappingCard(m, idx)));
  }

  private createMappingCard(
    mapping: { id: string; title: string; description?: string; type: string },
    index: number,
  ): HTMLElement {
    /**
     * Create a single mapping selection card containing title, scrollable description
     * and a button that supports mouse and keyboard interaction (incl. roving tabindex).
     *
     * @param mapping Mapping meta-data.
     * @param index Position in list (first item is tabbable by default for accessibility).
     * @returns A fully wired DOM element ready to be appended to the container.
     */
    const encodedId = this.encode(mapping.id);
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('cards');
    const headerDiv = document.createElement('div');
    headerDiv.classList.add('header');
    const titleSpan = document.createElement('span');
    titleSpan.classList.add('title');
    titleSpan.textContent = mapping.title ?? '';
    headerDiv.appendChild(titleSpan);
    const descWrapper = document.createElement('span');
    descWrapper.classList.add('description');
    descWrapper.appendChild(document.createElement('br'));
    const scrollSpan = document.createElement('span');
    scrollSpan.setAttribute('style', 'display:inline-block; overflow: auto; height: 124px;');
    scrollSpan.textContent = mapping.description ?? '';
    descWrapper.appendChild(scrollSpan);
    const buttonEl = document.createElement('button');
    buttonEl.classList.add('selection-button');
    buttonEl.id = `mapping-button-${encodedId}`;
    buttonEl.setAttribute('data-original-id', mapping.id);
    buttonEl.setAttribute('role', 'option');
    buttonEl.setAttribute('aria-selected', 'false');
    buttonEl.setAttribute(
      'aria-label',
      `${mapping.title ?? 'Mapping'}: ${mapping.description ?? 'No description provided.'}`,
    );
    buttonEl.textContent = 'Select';
    buttonEl.tabIndex = index === 0 ? 0 : -1;
    cardDiv.appendChild(headerDiv);
    cardDiv.appendChild(descWrapper);
    cardDiv.appendChild(buttonEl);
    const activate = () => this.toggleSelection(buttonEl);
    buttonEl.addEventListener('click', activate);
    buttonEl.addEventListener('keydown', (ev) => {
      const buttons = Array.from(
        this.shadowRoot.querySelectorAll<HTMLButtonElement>('.selection-button'),
      );
      const currentIndex = buttons.indexOf(buttonEl);
      const focusMove = (idx: number) => {
        buttons.forEach((b) => (b.tabIndex = -1));
        const target = buttons[idx];
        if (target) {
          target.tabIndex = 0;
          target.focus();
        }
      };
      const key = ev.key;
      if (key === ' ' || key === 'Enter') {
        ev.preventDefault();
        activate();
      } else if (['ArrowRight', 'ArrowDown'].includes(key)) {
        ev.preventDefault();
        focusMove((currentIndex + 1) % buttons.length);
      } else if (['ArrowLeft', 'ArrowUp'].includes(key)) {
        ev.preventDefault();
        focusMove((currentIndex - 1 + buttons.length) % buttons.length);
      } else if (key === 'Home') {
        ev.preventDefault();
        focusMove(0);
      } else if (key === 'End') {
        ev.preventDefault();
        focusMove(buttons.length - 1);
      }
    });
    return cardDiv;
  }

  private toggleSelection(buttonEl: HTMLButtonElement): void {
    /**
     * Toggle selection state when a mapping button is activated. Only one mapping
     * can be selected at a time. This updates ARIA attributes, visual state, internal
     * selectedMappingId and the availability of the submit button.
     */
    const id = buttonEl.getAttribute('data-original-id');
    const buttons = this.shadowRoot.querySelectorAll<HTMLButtonElement>('.selection-button');
    buttons.forEach((b) => {
      b.classList.remove('selected-id');
      b.setAttribute('aria-selected', 'false');
    });
    if (id && id !== this.selectedMappingId) {
      buttonEl.classList.add('selected-id');
      buttonEl.setAttribute('aria-selected', 'true');
      this.selectedMappingId = id;
      this.showMessage(
        'Mapping selected. Please choose a file and then activate <b><i>Execute Mapping</i></b> to start the process.',
      );
      this.setSubmitEnabled(true);
    } else {
      this.selectedMappingId = null;
      this.showMessage('Please select a mapping from the list above.');
      this.setSubmitEnabled(false);
    }
  }

  private setSubmitEnabled(enabled: boolean): void {
    /**
     * Enable or disable the execute (submit) button and keep the aria-disabled state
     * in sync for assistive technologies.
     */
    const submitBtn = this.shadowRoot.getElementById('submit');
    if (!submitBtn) return;
    if (enabled) {
      submitBtn.removeAttribute('disabled');
      submitBtn.setAttribute('aria-disabled', 'false');
    } else {
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.setAttribute('aria-disabled', 'true');
    }
  }

  /** Get the submit button from shadow root. */
  private getSubmitButton(): HTMLButtonElement | null {
    /**
     * Lookup helper for the submit button inside the shadow root. Centralizing this
     * makes later refactors or ID changes simpler.
     *
     * @returns The submit button element or null if not present.
     */
    return this.shadowRoot.getElementById('submit') as HTMLButtonElement | null;
  }

  /** Handle click on submit button (UI state handling wrapper around executeMapping). */
  private async handleSubmitClick(): Promise<void> {
    /**
     * Orchestrate an execution cycle: validate a mapping is selected, provide user
     * feedback while the mapping runs (disable button & spinner text), invoke the
     * core executeMapping logic, then restore UI and clear uploaded file(s).
     */
    if (!this.selectedMappingId) {
      this.showMessage('Please select a mapping from the list above.', 'ERROR');
      return;
    }
    const submit = this.getSubmitButton();
    if (!submit) return;
    submit.setAttribute('disabled', 'true');
    submit.innerText = 'Please wait...';
    const ok = await this.executeMapping();
    if (ok) console.log('Mapping successfully finished.');
    else console.error('Mapping failed.');
    if (this.selectedMappingId) submit.removeAttribute('disabled');
    else submit.setAttribute('disabled', 'true');
    submit.innerText = 'Execute Mapping';
    this.fileChooser?.removeFiles();
  }

  /** Helper used for early-return validation failures in executeMapping. */
  private fail(message: string): false {
    /**
     * Utility for concise guard clauses in executeMapping. Displays an error message
     * and returns false so the caller can directly return this expression.
     *
     * @param message Human readable validation / failure message.
     * @returns Always false.
     */
    this.showMessage(message, 'ERROR');
    return false;
  }

  /**
   * Render a status or error message in the message area.
   * Accepts a limited HTML subset (currently: <span class="heroicons-outline--exclamation"></span> and <br> tags).
   * Everything else is converted to plain text to keep XSS surface minimal.
   * type: INFO (yellow background) or ERROR (red background, announced assertively).
   */
  private showMessage(messageHtml: string, type: 'INFO' | 'ERROR' = 'INFO') {
    const el = this.shadowRoot.querySelector('#message');
    if (!el) return;
    const text = messageHtml;
    el.replaceChildren();
    const isError = type === 'ERROR';
    el.setAttribute('role', isError ? 'alert' : 'status');
    el.setAttribute('aria-live', isError ? 'assertive' : 'polite');
    // Sanitize supplied HTML and append
    const fragment = this.sanitizeMessageHtml(text);
    el.appendChild(fragment);
    // For error messages, if no icon span provided, add them automatically around content
    if (isError && !el.querySelector('.heroicons-outline--exclamation')) {
      const first = document.createElement('span');
      first.className = 'heroicons-outline--exclamation';
      const last = document.createElement('span');
      last.className = 'heroicons-outline--exclamation';
      el.prepend(document.createTextNode(' '));
      el.prepend(first);
      el.append(last);
    }
    el.classList.remove('hidden', 'info', 'error');
    el.classList.add(isError ? 'error' : 'info');
  }

  /**
   * Very small HTML sanitizer for messages. Only allows:
   *  - <br>
   *  - <span class="heroicons-outline--exclamation">
   * Any other element is converted to its text content; disallowed attributes removed.
   */
  private sanitizeMessageHtml(html: string): DocumentFragment {
    /**
     * Minimal, purpose-built sanitizer for status / error message snippets. Only a
     * tiny allowedlist is supported; all other markup is flattened to text nodes
     * which still preserves readable output while mitigating XSS risk.
     *
     * @param html Raw HTML provided by internal calls (never untrusted user input).
     * @returns A safe DocumentFragment ready to be inserted.
     */
    const template = document.createElement('template');
    template.innerHTML = html;
    const allowedSpanClass = 'heroicons-outline--exclamation';
    const walker = (node: Node): Node | null => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'BR') return el; // keep line breaks
        else if (el.tagName === 'EM' || el.tagName === 'STRONG' || el.tagName === 'B' || el.tagName === 'I') return el; // keep emphasis
        else if (
          el.tagName === 'SPAN' &&
          el.classList.length === 1 &&
          el.classList.contains(allowedSpanClass)
        ) {
          // strip any other attributes for safety
          Array.from(el.attributes).forEach((attr) => {
            if (attr.name !== 'class') el.removeAttribute(attr.name);
          });
          return el;
        }
        // Replace disallowed element with a text node of its textContent
        return document.createTextNode(el.textContent ?? '');
      }
      if (node.nodeType === Node.TEXT_NODE) return node;
      return null; // drop comments or others
    };
    const outFrag = document.createDocumentFragment();
    Array.from(template.content.childNodes).forEach((child) => {
      const safe = walker(child);
      if (safe) outFrag.appendChild(safe);
    });
    return outFrag;
  }

  /**
   * Sanitize a filename by removing control characters and path separators.
   */
  private sanitizeFilename(name: string): string {
    /**
     * Remove control characters and characters that are invalid / dangerous for
     * file names on major operating systems (Windows reserved characters, path
     * separators). Falls back to 'result' if nothing is left.
     *
     * @param name Suggested file name (possibly unsanitized).
     * @returns Sanitized file name safe for client download.
     */
    // Remove disallowed characters (control chars and path/file separators) without using control char regex ranges
    let cleaned = '';
    for (const ch of name) {
      const code = ch.charCodeAt(0);
      if (code < 32 || code === 127) continue; // skip control characters
      if ('\\/:*?"<>|'.includes(ch)) continue; // skip reserved
      cleaned += ch;
    }
    cleaned = cleaned.trim();
    return cleaned || 'result';
  }
  /**
   * Encode string to Base64 URL-safe (no padding). Reversible and CSS selector safe.
   */
  private encode(str: string): string {
    /**
     * Base64 URL-safe encode a string (removing padding) so it can be safely used
     * inside element IDs / CSS selectors without needing additional escaping.
     *
     * @param str Input string.
     * @returns URL-safe Base64 variant.
     */
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

window.customElements.define('mapping-input', MappingInputProvider);
