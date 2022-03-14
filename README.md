This library implements HTML custom elements to include interactive crosswords on webpages. Its features include:

- The crosswords are styled using CSS, allowing for flexible layouts.
- A line-cursor based interface as opposed to the block cursors found in most (all?) other crossword scripts.
- A base HTML that can be styled to look like a crossword even with JavaScript disabled.

## Usage

You can see example crosswords in the barred, blocked and Swedish style (in German) in the example folder. This script is set-up using ECMAScript modules which unfortunately doesn’t work with the `file:///` protocol, so you will need to set up an HTTP server. Also remember to compile the typescript first. You can also see live examples on <http://kifu.eu>.

Import the main script `kreuzwort.js` as a module
```
<script src="kreuzwort.js" type="module"></script>
```
in the `head` of your site.

Then layout your crossword using the following tags:

`<kw-crossword>`
:    This should contain your entire crossword.

`<kw-grid>`
:    This is your crossword grid. Within this tag, create your crossword’s rows with `<kw-row>` and within each row the cells of your crossword with `<kw-c>` (for writable cells) and `<kw-b>` (for blocks). If a cell is numbered, give its number via the `number` attribute. If a cell is the starting cell of an across light (*lights* are the spaces for words within the grid) give it the attribute `across` and similar for down clues and the attribute `down`. In a barred grid, if a light ends without the following cell being the starting cell of a new light or a block, give the following cell the attribute `across="no-light"` or `down="no-light"`.

`<kw-clue>`
:   This contains a clue. Reference the corresponding light by specifying the attributes `light-start` (for the number of the cell where the light begins) and `light-type` (either `"across"` or `"down"`). (Splitting the reference to the light into these two attributes enables us to extract just the number using CSS.)

`<kw-current-clue>`
:   This will contain a copy of the current clue whenever one is selected. If no clue is selected, the actual contents of this tag will be shown instead, so it’s a good place for a message like “Click into the grid to start the puzzle.”

`<kw-ref>`
:   Use within a `<kw-clue>` tag and reference a light by setting the `light` attribute (using the form `"10-across"` or `"3-down"`). This tag will display the referenced light’s contents, making crosswords where clues reference the solutions to other clues more pleasant for the solver.

Finally, you can style the crossword using CSS. For a starting point, use `kw-style` from the style directory. Some pointers:

- There are a lot of CSS custom properties (“variables”) that you can use to change the appearance. For example, the size of the cells can be changed by setting
    ```
    kw-crossword {
        --cell-size: 48px;
    }
    ```

- Some of the elements use parts which can be selected using the `::part(part-name)` selector, namely `::part(light-contents)` for the preview of a light’s contents next to its clue and in `kw-ref` elements. By setting `display: none` you can make these previews disappear (which makes sense for a print stylesheet, for example).

- The grid is setup using `display: table`, `display: table-row` and `display: table-cell` (but this is not necessary). I recommend using the `box-shadow` property the give borders to the cells instead of `border-collapse: collapse`. In my experience, this works better when combining borders of different widths.

