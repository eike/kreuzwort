class Clue extends HTMLElement {
    lightDiv : HTMLDivElement;
    input : HTMLInputElement;
    focusFromLightFocus : boolean = false;

    constructor() {
        super();
        let shadow = this.attachShadow({ mode: 'closed', delegatesFocus: true });
        let style = document.createElement('style');
        style.textContent = `
            input { opacity: 0; position: absolute; left: -1000px; }
            div.light { float: right; display: table-row; border-collapse: collapse; margin: 2px; }
            div.light.current-light {
                background-color: var(--current-light);
            }
            span { display: table-cell; border: 1px solid black; width: 17px; height: 17px; font: 14px/16px Avenir, sans-serif;text-align: center; }
            span.cursor-before {
                box-shadow: inset 2px 0 var(--cursor-color);
            }
            .clear { cursor: pointer; }
            .clear::after { content: ''; display: block; clear: right; height: 0; }
            `;
        shadow.appendChild(style);
        let clearDiv = document.createElement('div');
        clearDiv.appendChild(document.createElement('slot'));
        this.input = document.createElement('input');
        clearDiv.appendChild(this.input);
        this.lightDiv = document.createElement('div');
        this.lightDiv.className = 'light';
        clearDiv.appendChild(this.lightDiv);
        clearDiv.className = "clear";
        shadow.appendChild(clearDiv);
    }

    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<Element>;

        crossword.getLight(this.lid).clue = this;
        this.updateLightDiv();

        crossword.getLight(this.lid).on('contentChanged', this.updateLightDiv.bind(this));
        crossword.getLight(this.lid).on('focus', (e) => {
            for (let span of this.lightDiv.children) {
                span.classList.remove('cursor-before');
            }
            this.focusFromLightFocus = true;
            this.focus({preventScroll: true});
            this.lightDiv.classList.add('current-light');
            this.lightDiv.children.item(mod(e.index, e.light.length))?.classList.add('cursor-before');
        });
        crossword.getLight(this.lid).on('blur', (e) => {
            this.lightDiv.classList.remove('current-light');
            for (let span of this.lightDiv.children) {
                span.classList.remove('cursor-before');
            }
            this.blur();
        });
 
        this.addEventListener('focus', (e) => {
            if (!this.focusFromLightFocus) {
                crossword.setCursor(this.lid);
            }
            this.focusFromLightFocus = false;
        });

        this.addEventListener('blur', (e) => {
            crossword.setCursor(null);
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
        return new Lid(this.getAttribute('light-type') || "", this.getAttribute('light-start') || "");
    }

    test() {
        this.input.focus({preventScroll: true});
    }
}

