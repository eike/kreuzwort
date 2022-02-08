class Ref extends HTMLElement {
    refInner: HTMLSpanElement;
    constructor() {
        super();

        let shadow = this.attachShadow({mode: "closed"});
        shadow.appendChild(document.createElement('slot'));
        let refOuter = document.createElement('span');
        refOuter.appendChild(document.createTextNode(" ("));
        this.refInner = document.createElement('span');
        refOuter.appendChild(this.refInner);
        refOuter.appendChild(document.createTextNode(")"));
        shadow.appendChild(refOuter);
    }

    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<string, Element>;

        let light = crossword.lights.get(this.getAttribute('light') || '');
        if (light) {
            this.updateInner(light);
            light.on('contentChanged', this.updateInner.bind(this));
        }

        this.addEventListener('click', e => {
            let lid = this.getAttribute('light');
            if (lid) crossword.setCursor(lid);
        });
    }

    updateInner(light : Light) {
        this.refInner.textContent = light.cellInfos.map(cellInfo => {
            if (cellInfo.contents === "") {
                return "_";
            } else {
                return cellInfo.contents;
            }
        }).join("");
    }
}