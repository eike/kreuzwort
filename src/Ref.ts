class Ref extends HTMLElement {
    refInner: HTMLSpanElement;
    constructor() {
        super();

        let shadow = this.attachShadow({mode: "closed"});
        shadow.appendChild(document.createElement('slot'));
        let refOuter = document.createElement('span');
        refOuter.appendChild(document.createTextNode(" (\u261e "));
        this.refInner = document.createElement('span');
        refOuter.appendChild(this.refInner);
        refOuter.appendChild(document.createTextNode(")"));
        shadow.appendChild(refOuter);
    }

    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<Element>;

        let light = crossword.lights.get(this.getAttribute('light') || '');
        if (light) {
            this.updateInner(light);
            light.on('contentChanged', this.updateInner.bind(this));
        }

        this.refInner.addEventListener('click', (e) => {
            crossword.setCursor(this.lid);
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

    get lid() : Lid {
        return new Lid(this.getAttribute('light') || '');
    }
}