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

class Lid {
    lightType : string;
    lightStart : string;

    constructor(lightTypeOrString : string, lightStart? : string) {
        if (lightStart) {
            this.lightType = lightTypeOrString;
            this.lightStart = lightStart;
        } else {
            let parts = lightTypeOrString.split("-");
            this.lightStart = parts[0];
            this.lightType = parts[1];
        }
    }

    toString() {
        return `${this.lightStart}-${this.lightType}`;
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

type Cursor = { lid : Lid, index : number }

type CrosswordEvents = {
    cursorMoved : Cursor
}

function mod(a : number, m : number) : number {
    return (a % m + m) % m;
}

function modIndex<T>(array : Array<T>, index : number) {
    return array[mod(index, array.length)];
}

// A crossword where lights have identifiers of type L and cells have identifiers of type C.
class Crossword<C> extends HTMLElement implements Emitter<CrosswordEvents> {
    lights : Map<string, Light>;
    cells : Map<C, CellInfo>;
    cursor : Cursor | null;

    constructor() {
        super();
        this.lights = new Map();
        this.cells = new Map();
        this.cursor = null;

        this.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!this.cursor) return;
                let light = this.getLight(this.cursor.lid);
                if (!light) return;
                let cellInfo = modIndex(light.cellInfos, this.cursor.index - 1);
                cellInfo.contents = "";
                this.cursor.index--;
                this.emit('cursorMoved', this.cursor);
                e.preventDefault();
            } else if (e.key.length === 1) {
                if (!this.cursor) return;
                let light = this.getLight(this.cursor.lid);
                if (!light) return;
                let cellInfo = modIndex(light.cellInfos, this.cursor.index);
                cellInfo.contents = e.key.toUpperCase();
                this.cursor.index++;
                this.emit('cursorMoved', this.cursor);
                e.preventDefault();
            }
        });

        this.on('cursorMoved', (cursor) => {
            let light = this.getLight(cursor.lid);
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

    public setCellsForLight(lid : Lid, cells : C[]) {
        let light = this.getOrAddLight(lid);
        let cellInfos = cells.map((cell) => this.getOrAddCell(cell));
        light.cellInfos = cellInfos;
    }

    public setClueForLight(lid : Lid, clue : Element) {
        let light = this.getOrAddLight(lid);
        light.clue = clue;        
    }

    public getLight(lid : Lid) : Light | undefined {
        return this.lights.get(lid.toString());
    }

    getOrAddLight(lid : Lid) : Light {
        var light = this.getLight(lid);
        if (light === undefined) {
            light = new Light();
            this.lights.set(lid.toString(), light);
        }
        return light;
    }

    public getOrAddCell(cell : C) : CellInfo {
        var cellInfo = this.cells.get(cell);
        if (cellInfo !== undefined) {
            return cellInfo;
        } else {
            let cellInfo = new CellInfo();
            this.cells.set(cell, cellInfo);
            return cellInfo;
        }
    }

    public setCursor(lid : Lid, index? : number) {
        if (this.cursor) {
            let oldLight = this.getLight(this.cursor.lid);
            if (oldLight) {
                oldLight.cellInfos.forEach((cellInfo) => {
                    cellInfo.highlight = CellHighlight.None;
                });
            }
        }

        let light = this.getLight(lid);
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

    listeners : { [K in keyof CrosswordEvents] : Array<(p : CrosswordEvents[K]) => void>; } = { 
        cursorMoved: []
    };
    on<K extends EventKey<CrosswordEvents>>(key : K, fn : EventReceiver<CrosswordEvents[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<CrosswordEvents>>(key : K, fn : EventReceiver<CrosswordEvents[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<CrosswordEvents>>(key : K, params : CrosswordEvents[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }
}