import Crossword from './Crossword';
import Cell from './Cell';
import Grid from './Grid';
import Clue from './Clue';
import BoxClue from './BoxClue';
import CurrentClue from './CurrentClue';
import Ref from './Ref';

customElements.define('kw-crossword', Crossword);
customElements.define('kw-c', Cell);
customElements.define('kw-grid', Grid);
customElements.define('kw-clue', Clue);
customElements.define('kw-box-clue', BoxClue);
customElements.define('kw-current-clue', CurrentClue);
customElements.define('kw-ref', Ref);
