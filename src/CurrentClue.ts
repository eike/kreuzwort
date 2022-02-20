class CurrentClue extends HTMLElement {
    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<Cell>;

        crossword.on('cursorMoved', (e) => {
            this.innerHTML = e.cursor.light.clue?.innerHTML || "";
        });
    }
}