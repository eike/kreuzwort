This library implements HTML custom elements to include interactive crosswords on webpages. Its features include:

- The crosswords are styled using CSS, allowing for flexible layouts.
- A line-cursor based interface as opposed to the block cursors found in most (all?) other crossword scripts.
- A base HTML that can be styled to look like a crossword even with JavaScript disabled.

## Usage

Layout your crossword using the following tags:

`<kw-crossword>`
:    This should contain your entire crossword.

`<kw-grid>`
:    This is your crossword grid. Within this tag, create your crossword’s rows with `<kw-row>` and within each row the cells of your crossword with `<kw-c>` (for writable cells) and `<kw-b>` (for blocks). If a cell is numbered, give its number via the `number` attribute. If a cell is the starting cell of an across light (*lights* are the spaces for words within the grid) give it the attribute `across` and similar for down clues and the attribute `down`. In a barred grid, if a light ends without the following cell being the starting cell of a new light or a block, give the following cell the attribute `across="no-light"` or `down="no-light"`.

`<kw-clue>`
:   This contains a clue. Reference the corresponding light by specifying the attributes `light-start` (for the number of the cell where the light begins) and `light-type` (either `"across"` or `"down"`). (Splitting the reference to the light into these two attributes enables us to extract just the number using CSS.)

`<kw-current-clue>`
:   This will contain a copy of the current clue whenever one is selected. If no clue is selected, the actual contents of this tag will be shown instead, so it’s a good place for a message like “Click into the grid to start the puzzle.”

### Upcoming features

`<kw-reference>`
:   Use within a `<kw-clue>` tag. If it is the current clue, all referenced clues will be highlighted in the grid as well.

