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
            div.clear { cursor: pointer; }
            div.clear::after { content: ''; clear: right; display: block; height: 0; }
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

        crossword.setClueForLight(this.lid, this);
        
        //this.addEventListener('click', (e) => {
        //    input.focus();
        //});

        this.updateLightDiv();

        crossword.getLight(this.lid)?.on('contentChanged', this.updateLightDiv.bind(this));

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

