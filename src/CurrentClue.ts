class CurrentClue extends HTMLElement {
    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<string, Clue>;

        crossword.on('cursorMoved', cursor => {
            this.innerHTML = crossword.lights.get(cursor.lid)?.clue?.innerHTML || "";
        });
    }
}