type EventMap = Record<string, any>;

type EventKey<M extends EventMap> = string & keyof M;
type EventReceiver<T> = (params : T) => void;

interface Emitter<M extends EventMap> {
    on<K extends EventKey<M>> (eventName : K, fn : EventReceiver<M[K]>) : void;
    off<K extends EventKey<M>> (eventName : K, fn : EventReceiver<M[K]>) : void;
    emit<K extends EventKey<M>> (eventName : K, params: M[K]) : void;
}
