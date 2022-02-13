class CurrentClue extends HTMLElement {
    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<Cell>;

        crossword.on('cursorMoved', cursor => {
            this.innerHTML = crossword.getLight(cursor.lid)?.clue?.innerHTML || "";
        });
    }
}