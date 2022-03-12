import Crossword from './Crossword.js';
import Cell from './Cell.js';
import GridElement from './GridElement.js';
import Lid from './Lid.js';

export default class Grid extends HTMLElement {
    grid: GridElement[][];

    constructor() {
        super();
        this.grid = [];
    }

    connectedCallback() {
        for (let row of this.children) {
            var cells = [];
            for (let cell of row.children) {
                cells.push(cell as GridElement);
            }
            this.grid.push(cells);
        }

        // Helper function to get all the lights running in one direction.
        function getLights(
                dirWidth : number, 
                dirLength : number, 
                dirName : string, 
                getCell : (i : number, j : number) => Element,
                cellNamer : (i : number, j : number) => string)
                : { lid : Lid , cells : Cell[] }[] {
            var lights = [];
            for (var i = 0; i < dirWidth; i++) {
                var light = null;
                for (var j = 0; j < dirLength; j++) {
                    let cell = getCell(i, j);
                    if (light !== null && cell instanceof Cell && !cell.hasAttribute(dirName)) {
                        cell.addLight(light.lid, light.cells.length);
                        light.cells.push(cell);
                    } else if (cell instanceof Cell && cell.hasAttribute(dirName)) {
                        if (light !== null) {
                            lights.push(light);
                        }
                        if (cell.getAttribute(dirName) !== "no-light") {
                            let cellNumber = cell.getAttribute("number");
                            if (cellNumber) {
                                light = { lid: new Lid(dirName, cellNumber), cells: [cell] };
                            } else {
                                light = { lid: new Lid(dirName, cellNamer(i, j)), cells: [cell] };
                            }
                            cell.addLight(light.lid, 0);
                        } else {
                            light = null;
                        }
                    } else if (light !== null) {
                        lights.push(light);
                        light = null;
                    }
                }
                if (light !== null) {
                    lights.push(light);
                }
            }

            return lights;
        }

        let width = this.grid[0].length;
        let height = this.grid.length;
        let lights = getLights(height, width, "across", (i, j) => this.grid[i][j], (i, j) => `(${i},${j})`)
            .concat(getLights(width, height, "down", (i, j) => this.grid[j][i], (i, j) => `(${j},${i})`));

        let crossword = this.closest('kw-crossword') as Crossword<Lid, Cell>;

        for (let light of lights) {
            crossword.setCellsForLight(light.lid, light.cells);
        }

        crossword.on('directionalMove', ({ direction }) => {
            let currentCell = crossword.currentCell;
            if (!currentCell) return;
            var { cell, after } = currentCell;
            let lightType = crossword.cursor?.lid.lightType;
            let movementInLightDirection = ((direction === 'Up' || direction === 'Down') && lightType === 'down') || ((direction === 'Left' || direction === 'Right') && lightType === 'across');
            var row = cell.row + (after && lightType === 'down' ? 1 : 0);
            var column = cell.column + (after && lightType === 'across' ? 1 : 0);

            function advance() {
                switch (direction) {
                    case 'Up':
                        row--;
                        break;
                    case 'Down':
                        row++;
                        break;
                    case 'Left':
                        column--;
                        break;
                    case 'Right':
                        column++;
                        break;
                }
            }

            var cursors = this.cursorsAtPosition(lightType as 'across' | 'down', row, column);
            if (cursors.length === 2 && movementInLightDirection) {
                if ((direction === 'Up' || direction === 'Left') && !after) {
                    crossword.setCursor(cursors[0].lid, cursors[0].index);
                    return;
                }
                if ((direction === 'Down' || direction === 'Right') && after) {
                    crossword.setCursor(cursors[1].lid, cursors[1].index);
                    return;
                }
            }
            while (row >= 0 && row <= height && column >= 0 && column <= width) {
                advance();
                let cursors = this.cursorsAtPosition(lightType as 'across' | 'down', row, column);
                if (cursors.length >= 1) {
                    if (direction === 'Up' || direction === 'Left' || !movementInLightDirection) {
                        crossword.setCursor(cursors[cursors.length - 1].lid, cursors[cursors.length - 1].index);
                    } else {
                        crossword.setCursor(cursors[0].lid, cursors[0].index);
                    }
                    return;
                }
            }
        });

        crossword.on('switchDirection', ({}) => {
            let currentCell = crossword.currentCell;
            if (crossword.cursor?.lid.lightType === 'across') {
                var newCursor;
                if (newCursor = currentCell?.cell.lights.get('down')) {
                    crossword.setCursor(newCursor.lid, newCursor.index);
                    return;
                }
            }
            if (crossword.cursor?.lid.lightType === 'down') {
                var newCursor;
                if (newCursor = currentCell?.cell.lights.get('across')) {
                    crossword.setCursor(newCursor.lid, newCursor.index);
                    return;
                }
            }
        });
    }

    cursorsAtPosition(lightType: 'across' | 'down', row: number, column: number): { lid: Lid, index: number}[] {
        let elBefore = this.grid[row - (lightType === 'down' ? 1 : 0)]?.[column - (lightType === 'across' ? 1 : 0)];
        let elAfter = this.grid[row]?.[column];
        let cursors = [];
        var cursor;
        if (elBefore instanceof Cell && (cursor = elBefore.lights.get(lightType))) {
            cursors.push({ lid: cursor.lid, index: cursor.index + 1});
        }
        if (elAfter instanceof Cell && (cursor = elAfter.lights.get(lightType))) {
            cursors.push({ lid: cursor.lid, index: cursor.index });
        }
        if (cursors.length === 2 && cursors[0].lid.equals(cursors[1].lid)) {
            cursors.pop();
        }
        return cursors;
    }
}

