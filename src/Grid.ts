import Crossword from './Crossword.js';
import Cell from './Cell.js';
import Lid from './Lid.js';

export default class Grid extends HTMLElement {
    constructor() {
        super()
    }

    connectedCallback() {
        var grid : Element[][] = [];

        for (let row of this.children) {
            var cells = [];
            for (let cell of row.children) {
                cells.push(cell);
            }
            grid.push(cells);
        }

        // Helper function to get all the lights running in one direction.
        function getLights(
                dirWidth : number, 
                dirLength : number, 
                dirName : string, 
                indexer : (i : number, j : number) => Element,
                cellNamer : (i : number, j : number) => string)
                : { lid : Lid , cells : Cell[] }[] {
            var lights = [];
            for (var i = 0; i < dirWidth; i++) {
                var light = null;
                for (var j = 0; j < dirLength; j++) {
                    let cell = indexer(i, j);
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

        let lights = getLights(grid.length, grid[0].length, "across", (i, j) => grid[i][j], (i, j) => `(${i},${j})`)
            .concat(getLights(grid[0].length, grid.length, "down", (i, j) => grid[j][i], (i, j) => `(${j},${i})`));

        let crossword = this.closest('kw-crossword') as Crossword<Cell>;

        for (let light of lights) {
            crossword.setCellsForLight(light.lid, light.cells);
        }
    }
}

