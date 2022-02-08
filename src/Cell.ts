class Cell extends HTMLElement {
    shadow: ShadowRoot;
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'closed' });
    }

    connectedCallback(): void {
        let crossword = this.closest('kw-crossword') as Crossword<string, Cell>;

        crossword?.cells.get(this)?.on('contentChanged', (newContent) => {
            this.shadow.textContent = newContent;
        });
    }
}