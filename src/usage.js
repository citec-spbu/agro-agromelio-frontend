import { PersistentStore } from "./storage";

class UserStore extends PersistentStore {
    data() {
        return {
            id: null,
            user_id: null,
            email: null,
            role: null,
            created_by: null,
            access_token: null,
            token_type: null,
            error: null,
            organizationInfo: {
                name: null,
                description: null,
                city: null,
                inn: null,
                phone_number: null,
                website: null,
            },
            workerInfo: {
                name: null,
                surname: null,
                patronimyc: null,
                date_of_birth: null,
                phone_number: null,
            }
        };
    }

    updateAll(object) {
        console.log('object: ', object);
        for (const key in object) {
            this.state[key] = object[key];
        }
    }
    updateState(key, value) {
        this.state[key] = value;
    }
    clearAll() {
        for (const key in this.state) {
            this.clearKey(key);
        }
    }
    isAuthorized() {
        if (this.state.access_token && this.state.token_type) {
            return true;
        } else return false;
    }
    setError(value) {
        this.state.error = value;
    }
    getError() {
        return this.state.error;
    }
    clearKey(key) {
        if (this.state[key] && typeof this.state[key] !== 'string' && Object.keys(this.state[key]).length > 0) {
            for (const key1 in this.state[key]) {
                this.state[key][key1] = null;
            }
        } else {
            this.state[key] = null;
        }
    }
}
export const userStore = new UserStore("USER_STORE");
