import Crossword from './Crossword';

export default class BoxClue extends HTMLElement {
    constructor() {
        super();

        let shadow = this.attachShadow({ mode: 'closed', delegatesFocus: true });
        shadow.appendChild(document.createElement('slot'));
        let input = document.createElement('input');
        input.style['opacity'] = '0%';
        input.style['position'] = 'absolute';
        shadow.appendChild(input);
    }

    connectedCallback() {
        let column = Array.prototype.indexOf.call(this.parentElement?.parentElement?.children, this.parentElement);
        let row = Array.prototype.indexOf.call(this.parentElement?.parentElement?.parentElement?.children, this.parentElement?.parentElement);
        console.log(this.textContent, row, column, this.getAttribute('direction'));

        switch (this.getAttribute('direction')) {
            case 'bottom-down':
                this.setLight(row + 1, column, 'down');
                break;
            case 'right-across':
                this.setLight(row, column + 1, 'across');
                break;
            case 'left-down':
                this.setLight(row, column - 1, 'down');
                break;
            case 'right-down':
                this.setLight(row, column + 1, 'down');
                break;
            case 'top-across':
                this.setLight(row - 1, column, 'across');
                break;
            case 'bottom-across':
                this.setLight(row + 1, column, 'across');
                break;
        };
    }

    setLight(row : number, column : number, type : string) {
        console.log(this.textContent, row, column, type);
        let crossword = this.closest('kw-crossword') as Crossword<Element>;
        let lid = new Lid(type, `(${row},${column})`);
        crossword.getLight(lid).clue = this;
        this.addEventListener('focus', (e) => crossword.setCursor(lid));
    }
}