import Crossword from './Crossword';

export default class CurrentClue extends HTMLElement {
    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<any>;

        crossword.on('cursorMoved', (e) => {
            this.innerHTML = e.cursor.light.clue?.innerHTML || "";
        });
    }
}