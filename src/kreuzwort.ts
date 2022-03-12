import Crossword from './Crossword.js';
import Cell from './Cell.js';
import Block from './Block.js';
import Grid from './Grid.js';
import Clue from './Clue.js';
import CurrentClue from './CurrentClue.js';
import Ref from './Ref.js';

customElements.define('kw-crossword', Crossword);
customElements.define('kw-c', Cell);
customElements.define('kw-b', Block);
customElements.define('kw-grid', Grid);
customElements.define('kw-clue', Clue);
customElements.define('kw-current-clue', CurrentClue);
customElements.define('kw-ref', Ref);
