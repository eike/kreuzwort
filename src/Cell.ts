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

    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: 'closed' });

        let style = document.createElement('style');
        style.textContent = `
        div {
            width: var(--cell-width); 
            height: var(--cell-height); 
            z-index: -2; 
            position: absolute; 
            top: 0; left: 0; 
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
        div.before {
            border-left: 3px solid var(--cursor-color);
        }
        div.after {
            box-shadow: 3px 0 0 0 var(--cursor-color);
        }
        `;
        this.shadow.appendChild(style);
        this.entry = document.createElement('span');
        this.shadow.appendChild(this.entry);
        
        this.cursorDiv = document.createElement('div');
        this.cursorDiv.classList.add('cursor');
        this.shadow.appendChild(this.cursorDiv);

        this.background = document.createElement('div');
        this.shadow.appendChild(this.background);

        this.addEventListener('mousemove', (e) => {
            this.cursorDiv.classList.remove('across');
            this.cursorDiv.classList.remove('down');
            switch (this.positionInCell(e.offsetX, e.offsetY)) {
                case PositionInCell.Center:
                    break;
                case PositionInCell.Left:
                case PositionInCell.Right:
                    this.cursorDiv.classList.add('across');
                    break;
                case PositionInCell.Top:
                case PositionInCell.Bottom:
                    this.cursorDiv.classList.add('down');
                    break;
            }
        });
    }

    connectedCallback(): void {
        let crossword = this.closest('kw-crossword') as Crossword<string, Cell>;

        crossword?.cells.get(this)?.on('contentChanged', (newContent) => {
            this.entry.textContent = newContent;
        });

        crossword?.cells.get(this)?.on('highlightChanged', (highlight) => {
            this.cursorDiv.classList.remove('before');
            this.cursorDiv.classList.remove('after');
            this.background.classList.remove('current-word');
            switch (highlight) {
                case CellHighlight.None:
                    break;
                case CellHighlight.CurrentWord:
                    this.background.classList.add('current-word');
                    break;
                case CellHighlight.CursorAfter:
                    this.background.classList.add('current-word');
                    this.cursorDiv.classList.add('after');
                    break;
                case CellHighlight.CursorBefore:
                    this.background.classList.add('current-word');
                    this.cursorDiv.classList.add('before');
                    break;
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