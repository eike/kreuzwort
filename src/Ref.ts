import Crossword, { Light } from "./Crossword.js";
import Lid from "./Lid.js";

/**
 * A Ref element is used for referencing other lights within a clue. It will
 * show the contents of the referenced light.
 * 
 * The referenced contents can be styled with ::part(ref-contents).
 */
export default class Ref extends HTMLElement {
    refContent: HTMLSpanElement;

    constructor() {
        super();

        let shadow = this.attachShadow({mode: "closed"});

        let style = document.createElement('style');
        style.textContent = `
        span > span {
            display: inline-block;
            width: 1.2em;
            height: 1.2em;
            text-align: center;
            border: 1px solid black;
        }
        span > span:not(:last-child) {
            border-right: none;
        }
        `;
        shadow.appendChild(style);

        shadow.appendChild(document.createElement('slot'));
        this.refContent = document.createElement('span');
        this.refContent.setAttribute('part', "ref-contents");
        shadow.appendChild(this.refContent);
    }

    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<any>;

        let light = crossword.lights.get(this.getAttribute('light') || '');
        if (light) {
            this.updateInner(light);
            light.on('contentChanged', this.updateInner.bind(this));
        }

        this.refContent.addEventListener('click', (e) => {
            crossword.setCursor(this.lid);
        });
    }

    updateInner(light : Light) {
        this.refContent.textContent = '';
        light.cellInfos.forEach(cellInfo => {
            let cell = document.createElement('span');
            cell.textContent = cellInfo.contents || "\u200d";
            this.refContent.appendChild(cell);
        });
    }

    get lid() : Lid {
        return new Lid(this.getAttribute('light') || '');
    }
}