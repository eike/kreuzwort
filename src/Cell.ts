class Cell extends HTMLElement {
    shadow : ShadowRoot;
    entry : HTMLSpanElement;
    background : HTMLDivElement;

    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'closed' });

        let style = document.createElement('style');
        style.textContent = `
        :root { background-color: green; }
        div { width: var(--cell-width); height: var(--cell-height); z-index: -2; position: absolute; top: 0; left: 0; box-sizing: border-box; }
        div.current-word {
            background-color: var(--current-light);
        }
        div.before {
            border-left: 3px solid var(--cursor-color);
        }
        div.after {
            border-right: 0px solid var(--cursor-color);
        }
        `;
        this.shadow.appendChild(style);
        this.entry = document.createElement('span');
        this.shadow.appendChild(this.entry);
        
        this.background = document.createElement('div');
        this.shadow.appendChild(this.background);
    }

    connectedCallback(): void {
        let crossword = this.closest('kw-crossword') as Crossword<string, Cell>;

        crossword?.cells.get(this)?.on('contentChanged', (newContent) => {
            this.entry.textContent = newContent;
        });

        crossword?.cells.get(this)?.on('highlightChanged', (highlight) => {
            switch (highlight) {
                case CellHighlight.None:
                    this.background.className = "";
                    break;
                case CellHighlight.CurrentWord:
                    this.background.className = "current-word";
                    break;
                case CellHighlight.CursorAfter:
                    this.background.className = "current-word after";
                    break;
                case CellHighlight.CursorBefore:
                    this.background.className = "current-word before";
                    break;
            }
        });
    }
}