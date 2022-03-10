import Crossword from './Crossword.js';

export default class CurrentClue extends HTMLElement {
    connectedCallback() {
        let crossword = this.closest('kw-crossword') as Crossword<any, any>;

        crossword.on('cursorMoved', (e) => {
            this.innerHTML = crossword.getClueForLight(e.cursor.lid)?.innerHTML || "";
        });
    }
}