import Crossword from './Crossword.js';
import GridElement from './GridElement.js';
import Lid from './Lid.js';

enum PositionInCell {
    Center,
    Top,
    Right,
    Bottom,
    Left,
}

export default class Cell extends GridElement {
    shadow : ShadowRoot;
    entry : HTMLSpanElement;
    background : HTMLDivElement;
    cursorDiv: HTMLDivElement;
    lights : Map<string, { lid: Lid, index: number, isFinal: boolean }>; // light-type to lid
    crossword: Crossword<Lid, Cell> | null;

    constructor() {
        super();
        this.lights = new Map();
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
                    if (this.lights.has('across')) this.cursorDiv.classList.add('across');
                    break;
                case PositionInCell.Top:
                case PositionInCell.Bottom:
                    if (this.lights.has('down')) this.cursorDiv.classList.add('down');
                    break;
            }
        });

        this.addEventListener('click', (e) => {
            let positionInCell = this.positionInCell(e.offsetX, e.offsetY);
            if (this.setCursor(positionInCell)) return;
            let crossword = this.closest('kw-crossword') as Crossword<Lid, Cell>;
            // TODO: Implement some form of toggling.
            let light = this.lights.values().next().value;
            if (light) {
                crossword.setCursor(light.lid, light.index);
            }
        });
    }

    /**
     * Sets the cursor at the indicated position in the cell if that is a valid position
     * for a cursor (i.e. there is a light passing through in the corresponding)
     * direction. Returns true if the position is valid, false otherwise.
     */
    setCursor(position: PositionInCell): boolean {
        let crossword = this.closest('kw-crossword') as Crossword<Lid, Cell>;
        var light;
        if (position === PositionInCell.Left && (light = this.lights.get('across'))) {
            crossword.setCursor(light.lid, light.index);
            return true;
        } else if (position === PositionInCell.Right && (light = this.lights.get('across'))) {
            crossword.setCursor(light.lid, light.index + 1);
            return true;
        } else if (position === PositionInCell.Top && (light = this.lights.get('down'))) {
            crossword.setCursor(light.lid, light.index);
            return true;
        } else if (position === PositionInCell.Bottom && (light = this.lights.get('down'))) {
            crossword.setCursor(light.lid, light.index + 1);
            return true;
        }
        return false;
    }

    connectedCallback(): void {
        this.crossword = this.closest('kw-crossword') as Crossword<Lid, Cell>;
        this.crossword.getOrAddCell(this);

        this.crossword?.cellInfos.get(this)?.on('contentChanged', (newContent) => {
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
        this.lights.set(lid.lightType, { lid, index, isFinal: false });

        this.crossword?.onLight(lid, 'focus', (e) => {
            this.background.classList.add('current-word');
            this.cursorDiv.classList.remove('before-across', 'before-down', 'after-across', 'after-down');
            if (e.index === index) {
                this.cursorDiv.classList.add(`before-${lid.lightType}`);
            }
            if (e.index === e.lightLength && index === e.lightLength - 1) {
                this.cursorDiv.classList.add(`after-${lid.lightType}`);
            }
        });

        this.crossword?.onLight(lid, 'blur', (e) => {
            this.background.classList.remove('current-word')
            this.cursorDiv.classList.remove('before-across', 'before-down', 'after-across', 'after-down');
        });
    }
}