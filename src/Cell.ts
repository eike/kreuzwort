enum PositionInCell {
    Center,
    Top,
    Right,
    Bottom,
    Left,
}

class Cell extends HTMLElement {
    shadow : ShadowRoot;
    entry : HTMLSpanElement;
    background : HTMLDivElement;
    cursorDiv: HTMLDivElement;
    #lights : Map<string, [ lid: Lid, index: number ]>; // light-type to lid
    crossword: Crossword<Cell> | null;

    constructor() {
        super();
        this.#lights = new Map();
        this.crossword = null;

        this.shadow = this.attachShadow({ mode: 'closed' });

        let style = document.createElement('style');
        style.textContent = `
        div {
            z-index: -2; 
            position: absolute; 
            inset: var(--cell-inset, 0 0 0 0);
            box-sizing: border-box;
            cursor: cell;
        }
        div.cursor {
            z-index: 1;
        }
        div.cursor.across {
            cursor: text;
        }
        div.cursor.down {
            cursor: vertical-text;
        }
        div.current-word {
            background-color: var(--current-light);
        }
        div.before-across {
            border-left: var(--cursor-width) solid var(--cursor-color);
        }
        div.before-down {
            border-top: var(--cursor-width) solid var(--cursor-color);
        }
        div.after-across {
            box-shadow: inset calc(-1 * var(--cursor-width)) 0 var(--cursor-color);
        }
        div.after-down {
            box-shadow: inset 0 calc(-1 * var(--cursor-width)) var(--cursor-color);
        }
        `;
        this.shadow.appendChild(style);
        this.cursorDiv = document.createElement('div');
        this.cursorDiv.classList.add('cursor');
        this.shadow.appendChild(this.cursorDiv);

        this.background = document.createElement('div');
        this.shadow.appendChild(this.background);

        this.entry = document.createElement('span');
        this.shadow.appendChild(this.entry);
        
        this.addEventListener('mousemove', (e) => {
            this.cursorDiv.classList.remove('across');
            this.cursorDiv.classList.remove('down');
            switch (this.positionInCell(e.offsetX, e.offsetY)) {
                case PositionInCell.Center:
                    break;
                case PositionInCell.Left:
                case PositionInCell.Right:
                    if (this.#lights.has('across')) this.cursorDiv.classList.add('across');
                    break;
                case PositionInCell.Top:
                case PositionInCell.Bottom:
                    if (this.#lights.has('down')) this.cursorDiv.classList.add('down');
                    break;
            }
        });

        this.addEventListener('click', (e) => {
            let crossword = this.closest('kw-crossword') as Crossword<Cell>;
            let positionInCell = this.positionInCell(e.offsetX, e.offsetY);
            var light;
            if (positionInCell === PositionInCell.Left && (light = this.#lights.get('across'))) {
                crossword.setCursor(light[0], light[1]);
            } else if (positionInCell === PositionInCell.Right && (light = this.#lights.get('across'))) {
                crossword.setCursor(light[0], light[1] + 1);
            } else if (positionInCell === PositionInCell.Top && (light = this.#lights.get('down'))) {
                crossword.setCursor(light[0], light[1]);
            } else if (positionInCell === PositionInCell.Bottom && (light = this.#lights.get('down'))) {
                crossword.setCursor(light[0], light[1]+ 1);
            } else if (light = this.#lights.values().next().value) {
                // TODO: Implement some form of toggling.
                crossword.setCursor(light[0], light[1]);
            }
        });
    }

    connectedCallback(): void {
        this.crossword = this.closest('kw-crossword') as Crossword<Cell>;
        this.crossword.getOrAddCell(this);

        this.crossword?.cells.get(this)?.on('contentChanged', (newContent) => {
            this.entry.textContent = newContent;
        });
    }

    positionInCell(x : number, y : number) : PositionInCell {
        let closestEdge = [ 
                [ x, PositionInCell.Left ], 
                [ this.offsetWidth - x, PositionInCell.Right ],
                [ y, PositionInCell.Top ],
                [ this.offsetHeight - y, PositionInCell.Bottom ],
            ].sort((a, b) => a[0] - b[0])[0];
        if (closestEdge[0] <= 10) return closestEdge[1];
        else return PositionInCell.Center;
    }

    public addLight(lid : Lid, index : number) {
        this.#lights.set(lid.lightType, [ lid, index ]);

        this.crossword?.getLight(lid).on('focus', (e) => {
            this.background.classList.add('current-word');
            this.cursorDiv.classList.remove('before-across', 'before-down', 'after-across', 'after-down');
            if (mod(e.index, e.light.length) === index) {
                this.cursorDiv.classList.add(`before-${e.light.lid.lightType}`);
            }
            if (mod(e.index, e.light.length) === 0 && index === e.light.length - 1) {
                this.cursorDiv.classList.add(`after-${e.light.lid.lightType}`);
            }
        });

        this.crossword?.getLight(lid).on('blur', (e) => {
            this.background.classList.remove('current-word')
            this.cursorDiv.classList.remove('before-across', 'before-down', 'after-across', 'after-down');
        });
    }
}