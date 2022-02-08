type CellEvents = {
    contentChanged : string
}
class CellInfo implements Emitter<CellEvents> {
    _contents : string = "";

    get contents() { return this._contents; }
    set contents(newContents) {
        this._contents = newContents;
        this.emit('contentChanged', newContents);
    }

    public isPennedIn() : boolean {
        return this.contents !== "";
    }

    listeners : { [K in keyof CellEvents] : Array<(p : CellEvents[K]) => void>; } = { 
        contentChanged: []
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

function modIndex<T>(array : Array<T>, index : number) {
    return array[(index % array.length + array.length) % array.length];
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
                e.preventDefault();
            } else if (e.key.length === 1) {
                if (!this.cursor) return;
                let light = this.lights.get(this.cursor.lid);
                if (!light) return;
                let cellInfo = modIndex(light.cellInfos, this.cursor.index);
                cellInfo.contents = e.key.toUpperCase();
                this.cursor.index++;
                e.preventDefault();
            }
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
        // Unset old cursor

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
        console.log("Cursor moved: ", this.cursor);
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