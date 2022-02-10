enum CellHighlight {
    None,
    CurrentWord,
    CursorBefore,
    CursorAfter,
}

type CellEvents = {
    contentChanged : string;
    highlightChanged : CellHighlight;
}
class CellInfo implements Emitter<CellEvents> {
    _contents : string = "";
    #highlight : CellHighlight = CellHighlight.None;

    get contents() { return this._contents; }
    set contents(newContents) {
        this._contents = newContents;
        this.emit('contentChanged', newContents);
    }

    set highlight(highlight : CellHighlight) {
        this.#highlight = highlight;
        this.emit('highlightChanged', highlight);
    }

    public isPennedIn() : boolean {
        return this.contents !== "";
    }

    listeners : { [K in keyof CellEvents] : Array<any>; } = { 
        contentChanged: [],
        highlightChanged: [],
    };
    on<K extends EventKey<CellEvents>>(key : K, fn : EventReceiver<CellEvents[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<CellEvents>>(key : K, fn : EventReceiver<CellEvents[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<CellEvents>>(key : K, params : CellEvents[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }
}

type LightEvents = {
    contentChanged : Light;
}

class Light implements Emitter<LightEvents> {
    _cellInfos : CellInfo[] = [];
    clue : Element | null = null;

    public set cellInfos(cellInfos : CellInfo[]) {
        this._cellInfos = cellInfos;

        for (let cellInfo of cellInfos) {
            cellInfo.on('contentChanged', this.cellChanged.bind(this));
        }
    }

    public get cellInfos() { return this._cellInfos; }

    public cellChanged(newContent : string) {
        this.emit('contentChanged', this);
    }
    
    listeners : { [K in keyof LightEvents] : Array<(p : LightEvents[K]) => void>; } = { 
        contentChanged: []
    };
    on<K extends EventKey<LightEvents>>(key : K, fn : EventReceiver<LightEvents[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<LightEvents>>(key : K, fn : EventReceiver<LightEvents[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<LightEvents>>(key : K, params : LightEvents[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }
}

type Cursor<L> = { lid : L, index : number }

type CrosswordEvents<L> = {
    cursorMoved : Cursor<L>
}

function mod(a : number, m : number) : number {
    return (a % m + m) % m;
}

function modIndex<T>(array : Array<T>, index : number) {
    return array[mod(index, array.length)];
}

// A crossword where lights have identifiers of type L and cells have identifiers of type C.
class Crossword<L, C> extends HTMLElement implements Emitter<CrosswordEvents<L>> {
    lights : Map<L, Light>;
    cells : Map<C, CellInfo>;
    cursor : Cursor<L> | null;

    constructor() {
        super();
        this.lights = new Map();
        this.cells = new Map();
        this.cursor = null;

        this.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!this.cursor) return;
                let light = this.lights.get(this.cursor.lid);
                if (!light) return;
                let cellInfo = modIndex(light.cellInfos, this.cursor.index - 1);
                cellInfo.contents = "";
                this.cursor.index--;
                this.emit('cursorMoved', this.cursor);
                e.preventDefault();
            } else if (e.key.length === 1) {
                if (!this.cursor) return;
                let light = this.lights.get(this.cursor.lid);
                if (!light) return;
                let cellInfo = modIndex(light.cellInfos, this.cursor.index);
                cellInfo.contents = e.key.toUpperCase();
                this.cursor.index++;
                this.emit('cursorMoved', this.cursor);
                e.preventDefault();
            }
        });

        this.on('cursorMoved', (cursor) => {
            let light = this.lights.get(cursor.lid);
            if (!light) return;

            let lightLength = light.cellInfos.length;
            light.cellInfos.forEach((cellInfo, i) => {
                if (i === mod(cursor.index, lightLength)) {
                    cellInfo.highlight = CellHighlight.CursorBefore;
                } else if (i === mod(cursor.index - 1, lightLength)) {
                    cellInfo.highlight = CellHighlight.CursorAfter;
                } else {
                    cellInfo.highlight = CellHighlight.CurrentWord;
                }
            });
        });
    }

    public setCellsForLight(lid : L, cells : C[]) {
        let light = this.getOrAddLight(lid);

        let cellInfos = cells.map((cell) => {
            var cellInfo = this.cells.get(cell);
            if (cellInfo !== undefined) {
                return cellInfo;
            } else {
                let cellInfo = new CellInfo();
                this.cells.set(cell, cellInfo);
                return cellInfo;
            }
        });

        light.cellInfos = cellInfos;
    }

    public setClueForLight(lid : L, clue : Element) {
        let light = this.getOrAddLight(lid);
        light.clue = clue;        
    }

    getOrAddLight(lid : L) : Light {
        var light = this.lights.get(lid);
        if (light === undefined) {
            light = new Light();
            this.lights.set(lid, light);
        }
        return light;
    }

    public setCursor(lid : L, index? : number) {
        if (this.cursor) {
            let oldLight = this.lights.get(this.cursor.lid);
            if (oldLight) {
                oldLight.cellInfos.forEach((cellInfo) => {
                    cellInfo.highlight = CellHighlight.None;
                });
            }
        }

        let light = this.lights.get(lid);
        if (light === undefined) {
            throw new Error(`No light with ID ${lid}.`);
        }
        if (index === undefined) {
            index = 0;
            for (var i = 0; i < light.cellInfos.length; i++) {
                if (!light.cellInfos[i].isPennedIn()) {
                    index = i;
                    break;
                }
            }
        }

        this.cursor = { lid, index };
        this.emit("cursorMoved", this.cursor);
    }

    listeners : { [K in keyof CrosswordEvents<L>] : Array<(p : CrosswordEvents<L>[K]) => void>; } = { 
        cursorMoved: []
    };
    on<K extends EventKey<CrosswordEvents<L>>>(key : K, fn : EventReceiver<CrosswordEvents<L>[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<CrosswordEvents<L>>>(key : K, fn : EventReceiver<CrosswordEvents<L>[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<CrosswordEvents<L>>>(key : K, params : CrosswordEvents<L>[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }
}