import { reactive, readonly, watch, ref } from "vue";
import { set, get } from "idb-keyval";

export class Store {
    constructor(storeName) {
        this.storeName = storeName;
        let data = this.data();
        this.state = reactive(data);
    }
    getState() {
        return readonly(this.state);
    }
    getStoreName() {
        return this.storeName;
    }
}
export class PersistentStore extends Store {
    constructor(storeName) {
        super(storeName);
        this.storeName = storeName;
        this.isInitialized = ref(false);
    }
    async init() {
        if (!this.isInitialized.value) {
            // console.log("Init: ", this.storeName);
            let stateFromIndexedDB = await get(this.storeName);
            // console.log('state: ', stateFromIndexedDB);
            if (stateFromIndexedDB) {
                Object.assign(this.state, JSON.parse(stateFromIndexedDB));
            }
            watch(
                () => this.state,
                (val) => {
                    console.log('VAL:', val);
                    set(this.storeName, JSON.stringify(val));
                },
                { deep: true }
            );
            this.isInitialized.value = true;
        }
        return this.storeName;
    }
    getIsInitialized() {
        return this.isInitialized;
    }
}