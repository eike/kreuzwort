import Crossword from "./Crossword.js";
import GridElement from "./GridElement.js";
import Lid from "./Lid.js";

export default class Clue extends HTMLElement {
    shadow: ShadowRoot;
    lightPreview: HTMLDivElement;
    focussedStyle: HTMLStyleElement;

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'closed', delegatesFocus: true });
        let style = document.createElement('style');
        style.textContent = `
            .light-preview > span {
                display: inline-block;
                width: 1.2em;
                height: 1.2em;
                text-align: center;
                border: 1px solid black;
            }
            .light-preview > span:not(:last-child) {
                border-right: none;
            }
            .current-clue .light-preview {
                background-color: var(--current-light);
            }
            .light-preview span.cursor-before {
                box-shadow: inset 2px 0 var(--cursor-color);
            }
            .light-preview span.cursor-after {
                box-shadow: inset -2px 0 var(--cursor-color);
            }
            :host(kw-clue) {
                cursor: pointer;
            }
            `;
        this.shadow.appendChild(style);

        this.focussedStyle = document.createElement('style');
        this.focussedStyle.textContent = `
        :host(kw-clue) {
            background: var(--current-clue-background) !important;
            color: var(--current-clue-color) !important;
        }
        `;
        this.shadow.appendChild(document.createElement('slot'));
        this.lightPreview = document.createElement('div');
        this.lightPreview.className = 'light-preview';
        this.lightPreview.setAttribute('part', "light-preview");
        this.shadow.appendChild(this.lightPreview);
    }

    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<Lid, any>;

        crossword.setClueForLight(this.lid, this);
        crossword.chainLight(this.lid);
        this.updateLightDiv();

        crossword.onLight(this.lid, 'contentChanged', this.updateLightDiv.bind(this));
        crossword.onLight(this.lid, 'focus', (e) => {
            for (let span of this.lightPreview.children) {
                span.classList.remove('cursor-before');
            }
            this.shadow.appendChild(this.focussedStyle);
            this.lightPreview.children.item(e.index)?.classList.add('cursor-before');
            if (e.index === e.lightLength) {
                this.lightPreview.lastElementChild?.classList.add('cursor-after');
            }
        });
        crossword.onLight(this.lid, 'blur', (e) => {
            for (let span of this.lightPreview.children) {
                span.classList.remove('cursor-before', 'cursor-after');
            }
            this.focussedStyle.remove();
        });

        this.addEventListener('click', (e) => {
            crossword.setCursor(this.lid);
        });
    }

    updateLightDiv() {
        let crossword = this.closest('kw-crossword') as Crossword<Lid, any>;
        this.lightPreview.textContent = "";
        for (let cellContent of crossword.getLightContents(this.lid)) {
            let span = document.createElement('span');
            // Using a zero-width joiner (u200d) here is better because a space
            // (or empty span) behaves differently from letters.
            span.textContent = cellContent.contents || "\u200d";
            this.lightPreview.appendChild(span);
        }
    }

    get lid() {
        var lid;
        if (lid = this.getAttribute('light')) {
            return new Lid(lid);
        }
        var type, start;
        if ((type = this.getAttribute('light-type')) && (start = this.getAttribute('light-start'))) {
            return new Lid(type, start);
        }
        var direction;
        if (direction = this.getAttribute('light-direction')) {
            let column = (this.parentElement as GridElement).column;
            let row = (this.parentElement as GridElement).row;

            switch (direction) {
                case 'bottom-down':
                    return new Lid('down', `(${row + 1},${column})`);
                case 'right-across':
                    return new Lid('across', `(${row},${column + 1})`);
                case 'left-down':
                    return new Lid('down', `(${row},${column - 1})`);
                case 'right-down':
                    return new Lid('down', `(${row},${column + 1})`);
                case 'top-across':
                    return new Lid('across', `(${row - 1},${column})`);
                case 'bottom-across':
                    return new Lid('across', `(${row + 1},${column})`);
            };
        }
        throw Error('Clue has no light attached.');
    }
}

