import axios from 'axios'
import { userStore } from './usage';
import router from './router';

function parseerror(data) {
    let errorMsg = "";
    data.detail.forEach((det) => {
        let tmp = "";
        tmp += det.loc[0] + " - ";
        tmp += det.loc[1] + ". ";
        tmp += det.type + ". ";
        tmp += det.msg + " \n";
        errorMsg += tmp;
    })
    return errorMsg
}

function parseCodeError(error) {
    let msg = '';
    // console.log('ERROR', error)
    if (error.status === 401) {
        // clean the store; go to logout page
        userStore.clearAll();
        router.push('/login');
        return;
    }
    if (Array.isArray(error.data.detail)) {
        msg = parseerror(error.data);
    } else {
        msg = error.data.detail;
    }
    return msg;
}

export function postreg({ email, text_password, role }) {
    return new Promise((resolve, reject) => {
        const myrequest = {
            "email": email,
            "text_password": text_password,
            "role": role
        }
        axios
            .post(`${process.env.VUE_APP_BASE_URL}/api/auth/register`, myrequest)
            .then((response) => {
                console.log(response);
                const code = response.status;
                if (code > 199 && code < 300) {
                    resolve(response.data);
                } else {
                    reject(parseCodeError(response));
                }
            }

            )
            .catch((error) => {
                reject(parseCodeError(error.response));
            })
    }

    )
}

export function postlog({ username, password }) {
    return new Promise((resolve, reject) => {
        const myrequest = {
            "username": username,
            "password": password,
        }
        axios
            .post(`${process.env.VUE_APP_BASE_URL}/api/auth/token`, myrequest, {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                }
            })
            .then((response) => {
                console.log(response);
                const code = response.status;
                if (code > 199 && code < 300) {
                    resolve(response.data);
                } else {
                    reject(parseCodeError(response));
                }
            })
            .catch((error) => {
                reject(parseCodeError(error.response));
            })
    })
}


// export function postworkers({ name, surname, patronymic, date_of_birth, phone_number }) {
//     return new Promise((resolve, reject) => {
//         const myrequest = {
//             "name": name,
//             "surname": surname,
//             "patronymic": patronymic,
//             "date_of_birth": date_of_birth,
//             "phone_number": phone_number,
//         }

//         axios
//             .post(`${process.env.VUE_APP_BASE_URL}/api/profiles/workers`, myrequest)
//             .then((response) => {
//                 console.log(response);
//                 const code = response.status;

//             })
//     })
// }




export function postToServer({ url, data, request, getParams }) {
    console.log("POST TO SERVER: ", data); // что передаем

    return new Promise((resolve, reject) => { //ассинхронное
        const { access_token } = userStore.getState();
        let axiosFunc;

        if (!access_token) { //хранить в локальном хранилище
            console.log("No tokens found");
            reject('no token');
            return;
        }

        const config = {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            ...getParams
        };

        if (request === 'get') {
            axiosFunc = axios.get(url, config);
        } else if (request === 'post') {
            axiosFunc = axios.post(url, data, config);
        } else if (request === 'put') {
            axiosFunc = axios.put(url, data, config)
        } else if (request === 'delete') {
            axiosFunc = axios.delete(url, config)
        } else {
            console.log('unknown Request Type');
        }

        axiosFunc
            .then((response) => {
                const code = response.status;
                console.log("OBJECT: ", data);
                console.log("RESPONSE: ", response);
                if (code > 199 && code < 300) {
                    console.log('RESULT: ', response.data);
                    resolve(response.data);
                } else {
                    reject(parseCodeError(response));
                }
            })
            .catch((error) => {
                // console.log("ERR", error);
                const errormsg = parseCodeError(error.response);
                console.log(errormsg);
                reject(errormsg);
            });
    });
}


// export function getFromServer(object){

// }
