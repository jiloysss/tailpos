// import React from "react";
// import { DeviceInfo } from "react-native-device-info";
export function fetch_data_via_activation_key(obj) {
    let data = {
        "activation": {
            "activation_key": "15298883277f",
            "password": "123123",
            "device_id": "a2cc2959-93b5-4ed7-b817-2b51aa49703a"
        }
    };

  return fetch("https://pos-demo.herokuapp.com/api/v1/activate", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)})
        .then(response => {
            return response.json();
        })
        .then((responseJson)=> {
            // fetch_all_data(responseJson)
        });

        // .catch(error => console.log(error));
}

// export function fetch_all_data(obj) {
//
//     return fetch("https://pos-demo.herokuapp.com/api/v1/sync_all", {
//         method: "POST",
//         headers: {
//             "Accept": "application/json",
//             "Content-Type": "application/json",
//         },
//         body: JSON.stringify(obj)})
//         .then(response => {
//             return response.json()
//         })
//         .then((responseJson)=> {
//             console.log("ALL DATAAA")
//             console.log(responseJson)
//             return responseJson
//
//         })
//
//         .catch(error => console.log(error))
// }
