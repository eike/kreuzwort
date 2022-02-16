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
    lights : Map<string, [ lid: Lid, index: number ]>; // light-type to lid

    constructor() {
        super();
        this.lights = new Map();

        this.shadow = this.attachShadow({ mode: 'closed' });

        let style = document.createElement('style');
        style.textContent = `
        div {
            z-index: -2; 
            position: absolute; 
            width: var(--cell-width);
            height: var(--cell-height);
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
            left: 0;
        }
        div.after-down {
            box-shadow: inset 0 calc(-1 * var(--cursor-width)) var(--cursor-color);
            bottom: 0;
        }
        span {
            position: absolute;
            display: block;
            text-align: center;
            left: var(--cell-content-offset-left, 1px);
            right: 0;
            top: var(--cell-content-offset-top, 10px);
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
                    if (this.lights.has('across')) this.cursorDiv.classList.add('across');
                    break;
                case PositionInCell.Top:
                case PositionInCell.Bottom:
                    if (this.lights.has('down')) this.cursorDiv.classList.add('down');
                    break;
            }
        });

        this.addEventListener('click', (e) => {
            let crossword = this.closest('kw-crossword') as Crossword<Cell>;
            let positionInCell = this.positionInCell(e.offsetX, e.offsetY);
            var light;
            if (positionInCell === PositionInCell.Left && (light = this.lights.get('across'))) {
                crossword.setCursor(light[0], light[1]);
            } else if (positionInCell === PositionInCell.Right && (light = this.lights.get('across'))) {
                crossword.setCursor(light[0], light[1] + 1);
            } else if (positionInCell === PositionInCell.Top && (light = this.lights.get('down'))) {
                crossword.setCursor(light[0], light[1]);
            } else if (positionInCell === PositionInCell.Bottom && (light = this.lights.get('down'))) {
                crossword.setCursor(light[0], light[1]+ 1);
            } else if (light = this.lights.values().next().value) {
                // TODO: Implement some form of toggling.
                crossword.setCursor(light[0], light[1]);
            }
        });
    }

    connectedCallback(): void {
        let crossword = this.closest('kw-crossword') as Crossword<Cell>;
        crossword.getOrAddCell(this);

        crossword?.cells.get(this)?.on('contentChanged', (newContent) => {
            this.entry.textContent = newContent;
        });

        crossword?.on('cursorMoved', (e) => {
            this.background.classList.remove('current-word');
            this.cursorDiv.classList.remove('before-across');
            this.cursorDiv.classList.remove('before-down');
            this.cursorDiv.classList.remove('after-across');
            this.cursorDiv.classList.remove('after-down');
            let crossingLight = this.lights.get(e.cursor.lid.lightType);
            if (crossingLight && crossingLight[0].equals(e.cursor.lid)) {
                this.background.classList.add('current-word');
                if (mod(e.cursor.index, e.light.length) === crossingLight[1]) {
                    if (crossingLight[0].lightType === "across") {
                        this.cursorDiv.classList.add('before-across');
                    } else if (crossingLight[0].lightType === "down") {
                        this.cursorDiv.classList.add('before-down');
                    }
                }
                if (mod(e.cursor.index, e.light.length) === 0 && crossingLight[1] === e.light.length - 1) {
                    this.cursorDiv.classList.add(`after-${crossingLight[0].lightType}`);
                }
            }
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
}