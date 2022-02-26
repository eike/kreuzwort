import Crossword, { mod } from "./Crossword.js";
import Lid from "./Lid.js";

export default class Clue extends HTMLElement {
    lightDiv: HTMLDivElement;
    clearDiv: HTMLDivElement;

    constructor() {
        super();
        let shadow = this.attachShadow({ mode: 'closed', delegatesFocus: true });
        let style = document.createElement('style');
        style.textContent = `
            div.light { display: var(--light-preview-display, table-row); float: right; border-collapse: collapse; margin: 2px; }
            div.light.current-light {
                background-color: var(--current-light);
            }
            span { display: table-cell; border: 1px solid black; width: 17px; height: 17px; font: 14px/16px Avenir, sans-serif;text-align: center; }
            span.cursor-before {
                box-shadow: inset 2px 0 var(--cursor-color);
            }
            .clear { cursor: pointer; }
            .clear::after { content: ''; display: block; clear: right; height: 0; }
            .current-clue { outline: 1px solid red; }
            `;
        shadow.appendChild(style);
        this.clearDiv = document.createElement('div');
        this.clearDiv.appendChild(document.createElement('slot'));
        this.lightDiv = document.createElement('div');
        this.lightDiv.className = 'light';
        this.clearDiv.appendChild(this.lightDiv);
        this.clearDiv.className = "clear";
        shadow.appendChild(this.clearDiv);
    }

    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<any>;

        crossword.getLight(this.lid).clue = this;
        crossword.chainLight(this.lid);
        this.updateLightDiv();

        crossword.getLight(this.lid).on('contentChanged', this.updateLightDiv.bind(this));
        crossword.getLight(this.lid).on('focus', (e) => {
            for (let span of this.lightDiv.children) {
                span.classList.remove('cursor-before');
            }
            this.lightDiv.classList.add('current-light');
            this.clearDiv.classList.add('current-clue');
            this.lightDiv.children.item(mod(e.index, e.light.length))?.classList.add('cursor-before');
        });
        crossword.getLight(this.lid).on('blur', (e) => {
            this.clearDiv.classList.remove('current-clue');
            this.lightDiv.classList.remove('current-light');
            for (let span of this.lightDiv.children) {
                span.classList.remove('cursor-before');
            }
        });

        this.addEventListener('click', (e) => {
            crossword.setCursor(this.lid);
        });
    }

    updateLightDiv() {
        let crossword = this.closest('kw-crossword') as Crossword<Element>;
        this.lightDiv.innerHTML = ""; // TODO: Is there a better way?
        for (let cellInfo of crossword.getLight(this.lid)?.cellInfos || []) {
            let span = document.createElement('span');
            span.textContent = cellInfo.contents;
            this.lightDiv.appendChild(span);
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
            let column = Array.prototype.indexOf.call(this.parentElement?.parentElement?.children, this.parentElement);
            let row = Array.prototype.indexOf.call(this.parentElement?.parentElement?.parentElement?.children, this.parentElement?.parentElement);

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

