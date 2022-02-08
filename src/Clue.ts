class Clue extends HTMLElement {
    lightDiv : HTMLDivElement;
    input : HTMLInputElement;
    focusFromCursorMove : boolean = false;

    constructor() {
        super();
        let shadow = this.attachShadow({ mode: 'closed', delegatesFocus: true });
        let style = document.createElement('style');
        style.textContent = `
            input { opacity: 0; position: absolute; left: -100px; }
            div.light { float: right; display: table-row; border-collapse: collapse; }
            div.light > span { display: table-cell; border: 1px solid black; width: 18px; height: 18px; font: 14px/16px Avenir, sans-serif; text-align: center; background-color: white; }
            div.clear { clear: right; height: 0; }
            `;
        shadow.appendChild(style);
        shadow.appendChild(document.createElement('slot'));
        this.input = document.createElement('input');
        shadow.appendChild(this.input);
        
        this.lightDiv = document.createElement('div');
        this.lightDiv.className = 'light';
        shadow.appendChild(this.lightDiv);

        let clearDiv = document.createElement('div');
        clearDiv.className = "clear";
        shadow.appendChild(clearDiv);
    }

    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<string, Element>;

        crossword.setClueForLight(this.lid, this);
        
        //this.addEventListener('click', (e) => {
        //    input.focus();
        //});

        this.updateLightDiv();

        crossword.lights.get(this.lid)?.on('contentChanged', this.updateLightDiv.bind(this));

        crossword.on('cursorMoved', cursor => {
            if (cursor.lid === this.lid) {
                this.focusFromCursorMove = true;
                this.focus();
            }
        });

        this.addEventListener('focus', (e) => {
            if (!this.focusFromCursorMove) {
                crossword.setCursor(this.lid);
            }
            this.focusFromCursorMove = false;
        });

    }

    updateLightDiv() {
        let crossword = this.closest('kw-crossword') as Crossword<string, Element>;
        this.lightDiv.innerHTML = ""; // TODO: Is there a better way?
        for (let cellInfo of crossword.lights.get(this.lid)?.cellInfos || []) {
            let span = document.createElement('span');
            span.textContent = cellInfo.contents;
            this.lightDiv.appendChild(span);
        }
    }

    get lid() {
        return `${this.getAttribute('light-start')}-${this.getAttribute('light-type')}`;
    }

    test() {
        this.input.focus({preventScroll: true});
    }
}

