type CellEvents = {
    contentChanged: string;
}
export class CellInfo implements Emitter<CellEvents> {
    _contents: string = "";

    get contents() { return this._contents; }
    set contents(newContents) {
        this._contents = newContents;
        this.emit('contentChanged', newContents);
    }

    public isPennedIn(): boolean {
        return this.contents !== "";
    }

    listeners: { [K in keyof CellEvents]: Array<any>; } = {
        contentChanged: [],
    };
    on<K extends EventKey<CellEvents>>(key: K, fn: EventReceiver<CellEvents[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<CellEvents>>(key: K, fn: EventReceiver<CellEvents[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<CellEvents>>(key: K, params: CellEvents[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }
}


type LightEvents = {
    contentChanged: { newContent: Array<CellInfo> };
    focus: { index: number, lightLength: number, internalMove: boolean };
    blur: {};
}

export function mod(a: number, m: number): number {
    return (a % m + m) % m;
}

type Cursor<L extends ILid> = {
    lid: L,
    // Index should always be between 0 and light.length (inclusive)
    // While index === light.length is functionally similar to
    // index === 0, the cursor will be shown in a different position
    // and behave differently when navigating using arrow keys.
    index: number,
}

type CrosswordEvents<L extends ILid> = {
    cursorMoved: { cursor: Cursor<L> },
    directionalMove: { direction: 'Up' | 'Right' | 'Down' | 'Left' },
    switchDirection: {},
}

// This is an unfortunate hack. It is due to the following two conflicting
// goals:
// 1. We don’t want accidental srolling when moving through the crossword
//    (iOS seems to ignore the "preventScroll" option on focus calls).
//    To ensure this, we want to place the input elements with 
//    "position: fixed" in the center of the screen.
// 2. We want to use the next/previous buttons on the iOS keyboard to move 
//    through the clues. This requires setting up next and previous inputs
//    to move to. However, if there are several crosswords on the page,
//    this still doesn’t work because the inputs for several crosswords would
//    overlap and iOS uses the visual order for these buttons.
// By sharing the input elements between the crosswords, this can be avoided.
// TODO: This whole tabbing business messes with keyboard navigation (and other
// forms on the page. Maybe there is a better solution?)
var globalForm: {
    form: HTMLFormElement,
    prevInput: HTMLInputElement,
    input: HTMLInputElement,
    nextInput: HTMLInputElement,
    currentCrossword: Crossword<any, any> | null
} | null = null;

type InternalLid = string;

interface ILid {
    toInternalLid(): InternalLid;
    equals(lid: ILid): boolean;
}

// A crossword where lights have identifiers of type L and cells have identifiers of type C.
export default class Crossword<L extends ILid, C> extends HTMLElement implements Emitter<CrosswordEvents<L>> {
    #lights: Set<InternalLid>;
    #clues: Map<InternalLid | undefined, L>;
    #cellsForLight: Map<InternalLid | undefined, Array<C>>;
    cellInfos: Map<C, CellInfo>;
    #nextInClueOrder: Map<InternalLid | undefined, L>;
    #prevInClueOrder: Map<InternalLid | undefined, L>;
    #endLights: { first: L, last: L } | null;
    #cursor: Cursor<L> | null;
    #mostRecentLight: L | null;

    constructor() {
        super();
        this.#lights = new Set();
        this.cellInfos = new Map();
        this.#cursor = null;
        this.#endLights = null;
        this.#nextInClueOrder = new Map();
        this.#prevInClueOrder = new Map();
        this.#clues = new Map();
        this.#cellsForLight = new Map();
        this.#mostRecentLight = null;

        let shadow = this.attachShadow({ mode: 'closed' });

        let style = document.createElement('style');
        style.textContent = `
        form {
            position: fixed;
            top: 40%;
            left: -200px;
            width: 100px;
        }
        input {
            display: block;
        }
        input:focus {
            background-color: red;
        }
        `;
        shadow.appendChild(style);

        if (!globalForm) {
            let form = document.createElement('form');
            let prevInput = document.createElement('input');
            form.appendChild(prevInput);
            let input = document.createElement('input');
            form.appendChild(input);
            let nextInput = document.createElement('input');
            form.appendChild(nextInput);
            shadow.appendChild(form);
            globalForm = { form, prevInput, input, nextInput, currentCrossword: null };
        }

        shadow.appendChild(document.createElement('slot'));

        // See above for the justification of “globalForm“.
        globalForm.input.addEventListener('keydown', (e) => {
            if (globalForm?.currentCrossword !== this) return;
            if (e.key === 'Backspace') {
                if (!this.#cursor) return;
                let cell = this.#cellsForLight.get(this.#cursor.lid.toInternalLid())?.[this.#cursor.index - 1];
                if (!cell) return;
                let cellInfo = this.getOrAddCell(cell);
                cellInfo.contents = "";
                this.#cursor.index--;
                let lightLength = this.getLightLength(this.#cursor.lid);
                if (this.#cursor.index < 0) {
                    this.#cursor.index += lightLength;
                }
                this.emitLight(this.#cursor.lid, 'focus', {
                    index: this.#cursor.index,
                    lightLength,
                    internalMove: true,
                });
                e.preventDefault();
            } else if (e.key.startsWith('Arrow')) {
                this.emit('directionalMove', { direction: e.key.substring(5) as 'Up' | 'Left' | 'Down' | 'Right' });
            } else if (e.key === " ") {
                this.emit('switchDirection', {});
            } else if (e.key.length === 1) {
                if (!this.#cursor) return;
                let lightLength = this.getLightLength(this.#cursor.lid);

                let cell = this.#cellsForLight.get(this.#cursor.lid.toInternalLid())?.[this.#cursor.index % lightLength];
                if (!cell) return;
                let cellInfo = this.getOrAddCell(cell);
                cellInfo.contents = e.key.toUpperCase();
                this.#cursor.index++;
                if (this.#cursor.index > lightLength) {
                    this.#cursor.index -= lightLength;
                }
                this.emitLight(this.#cursor.lid, 'focus', {
                    index: this.#cursor.index,
                    lightLength,
                    internalMove: true,
                });
                e.preventDefault();
            }
        });

        globalForm.input.addEventListener('blur', (e) => {
            if (globalForm?.currentCrossword !== this) return;
            this.#mostRecentLight = this.#cursor?.lid ?? null;
            this.setCursor(null);
        });

        globalForm.nextInput.addEventListener('focus', (e) => {
            if (globalForm?.currentCrossword !== this) return;
            if (!this.#mostRecentLight) return;
            this.setCursor(this.#nextInClueOrder.get(this.#mostRecentLight?.toInternalLid()) ?? null);
        });
        globalForm.prevInput.addEventListener('focus', (e) => {
            if (globalForm?.currentCrossword !== this) return;
            if (!this.#mostRecentLight) return;
            this.setCursor(this.#prevInClueOrder.get(this.#mostRecentLight?.toInternalLid()) ?? null);
        });
    }

    public setCellsForLight(lid: L, cells: C[]) {
        this.registerLight(lid);
        this.#cellsForLight.set(lid.toInternalLid(), cells);
        let cellInfos = cells.map((cell) => this.getOrAddCell(cell));
        for (let cellInfo of cellInfos) {
            cellInfo.on('contentChanged', (e) => {
                this.emitLight(lid, 'contentChanged', {
                    newContent: this.getLightContents(lid)
                });
            });
        }
        this.emitLight(lid, 'contentChanged', { newContent: this.getLightContents(lid) });
    }

    public setClueForLight(lid: L, clue: any) {
        this.registerLight(lid);
        this.#clues.set(lid.toInternalLid(), clue);
    }

    getLightContents(lid: L): Array<CellInfo> {
        return (this.#cellsForLight.get(lid.toInternalLid()) || []).map((c) => this.getOrAddCell(c));
    }

    getClueForLight(lid: L): any {
        return this.#clues.get(lid.toInternalLid());
    }

    private registerLight(lid: L) {
        if (this.#lights.has(lid.toInternalLid())) return;

        this.#lights.add(lid.toInternalLid());
        this.onLight(lid, 'focus', (e) => {
            this.emit('cursorMoved', { cursor: { lid: lid, index: e.index } })
            globalForm?.input.focus();
            if (globalForm) globalForm.currentCrossword = this;
        });
    }

    public getOrAddCell(cell: C): CellInfo {
        var cellInfo = this.cellInfos.get(cell);
        if (cellInfo !== undefined) {
            return cellInfo;
        } else {
            let cellInfo = new CellInfo();
            this.cellInfos.set(cell, cellInfo);
            return cellInfo;
        }
    }

    public getLightLength(lid: L): number {
        return this.#cellsForLight.get(lid.toInternalLid())?.length ?? 0;
    }

    public chainLight(lid: L) {
        this.registerLight(lid);

        if (!this.#endLights) {
            this.#nextInClueOrder.set(lid.toInternalLid(), lid);
            this.#prevInClueOrder.set(lid.toInternalLid(), lid);
            this.#endLights = { first: lid, last: lid };
            return;
        }

        this.#prevInClueOrder.set(this.#endLights.first.toInternalLid(), lid);
        this.#nextInClueOrder.set(lid.toInternalLid(), this.#endLights.first);
        this.#nextInClueOrder.set(this.#endLights.last.toInternalLid(), lid);
        this.#prevInClueOrder.set(lid.toInternalLid(), this.#endLights.last);
        this.#endLights.last = lid;
    }

    public setCursor(lid: L | null, index?: number) {
        //debugger
        var internalMove = false;
        if (this.#cursor) {
            if (lid === null) {
                this.emitLight(this.#cursor.lid, 'blur', {});
                return;
            }
            if (this.#cursor.lid.equals(lid)) {
                internalMove = true;
            } else {
                this.emitLight(this.#cursor.lid, 'blur', {});
            }
        }

        if (lid === null) return;
        if (index === undefined) {
            index = this.getLightLength(lid);
            let contents = this.getLightContents(lid);
            contents.every((cellInfo, i) => {
                if (!cellInfo.isPennedIn()) {
                    index = i;
                    return false;
                }
                return true;
            });
        }

        this.#cursor = { lid, index };
        this.emitLight(this.#cursor.lid, 'focus', { index, internalMove, lightLength: this.getLightLength(lid) });
    }

    get cursor(): Cursor<L> | null {
        return this.#cursor;
    }

    get currentCell(): { cell: C, after: boolean } | null {
        if (!this.cursor) return null;

        let cells = this.#cellsForLight.get(this.cursor.lid.toInternalLid());
        if (!cells) return null;
        if (this.cursor.index === cells.length) {
            return { cell: cells[cells.length - 1], after: true };
        } else {
            return { cell: cells[this.cursor.index], after: false };
        }
    }

    listeners: { [K in keyof CrosswordEvents<L>]: Array<any>; } = {
        cursorMoved: [],
        directionalMove: [],
        switchDirection: [],
    };
    on<K extends EventKey<CrosswordEvents<L>>>(key: K, fn: EventReceiver<CrosswordEvents<L>[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<CrosswordEvents<L>>>(key: K, fn: EventReceiver<CrosswordEvents<L>[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<CrosswordEvents<L>>>(key: K, params: CrosswordEvents<L>[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }

    #lightListeners: { [K in keyof LightEvents]: Map<InternalLid, Array<any>>; } = {
        contentChanged: new Map(),
        focus: new Map(),
        blur: new Map(),
    };

    onLight<K extends EventKey<LightEvents>>(lid: L, key: K, fn: (params: LightEvents[K], lid: L) => void) {
        var listeners = this.#lightListeners[key].get(lid.toInternalLid());
        if (!listeners) {
            listeners = [];
            this.#lightListeners[key].set(lid.toInternalLid(), listeners);
        }
        listeners.push(fn);
    }

    emitLight<K extends EventKey<LightEvents>>(lid: L, key: K, params: LightEvents[K]) {
        this.#lightListeners[key].get(lid.toInternalLid())?.forEach((fn) => fn(params, lid));
    }
}