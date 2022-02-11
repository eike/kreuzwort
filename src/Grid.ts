class Grid extends HTMLElement {
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
                : { lid : string , cells : Element[] }[] {
            var lights = [];
            for (var i = 0; i < dirWidth; i++) {
                var light = null;
                for (var j = 0; j < dirLength; j++) {
                    let cell = indexer(i, j);
                    if (light !== null && cell.tagName === "KW-C" && !cell.hasAttribute(dirName)) {
                        light.cells.push(cell);
                    } else if (cell.tagName === "KW-C" && cell.hasAttribute(dirName)) {
                        if (light !== null) {
                            lights.push(light);
                        }
                        if (cell.getAttribute(dirName) !== "no-light") {
                            let cellNumber = cell.getAttribute("number");
                            if (cellNumber) {
                                light = { lid: `${cellNumber}-${dirName}`, cells: [cell] };
                            } else {
                                light = { lid: `${cellNamer(i, j)}-${dirName}`, cells: [cell] };
                            }
                        } else {
                            light = null;
                        }
                    } else if (cell.tagName === "KW-B" && light !== null) {
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

        let crossword = this.closest('kw-crossword') as Crossword<string, Element>;

        for (let light of lights) {
            crossword.setCellsForLight(light.lid, light.cells);
        }
    }
}

