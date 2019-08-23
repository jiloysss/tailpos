// import React from "react";
// import { DeviceInfo } from "react-native-device-info";
import { NetInfo } from "react-native";
import { Toast } from "native-base";

import { delete_object } from "../../store/SyncStore/SyncAutomatic";
const moment = require("moment");
const jwtDecode = require("jwt-decode");

import {
  itemSync,
  categorySync,
  attendantSync,
  discountSync,
  roleSync,
  companySync,
} from ".././PosStore/syncInBackground";
export async function fetch_data_via_activation_key(obj, props) {
  obj.url = "https://pos-demo.herokuapp.com";
  return await NetInfo.isConnected.fetch().then(async isConnected => {
    if (isConnected) {
      let data = {
        activation: {
          activation_key: obj.activationKey, //6d8f8139ed92
          password: obj.password, // obj.password
          device_id: "a2cc2959-93b5-4ed7-b817-2b51aa49703a", // DeviceInfo.getDevice something
        },
      };
      return await fetch(obj.url.toLowerCase() + "/api/v1/activate", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then(response => {
          return response.json();
        })
        .then(async responseJson => {
          if (responseJson.token) {
            obj.token = responseJson.token;
            obj.merchant_id = jwtDecode(responseJson.token).merchant_id;
            return await fetch_all_data(obj, props);
          } else {
            return responseJson;
          }
        })
        .catch(error => {
          return error;
        })
        .catch(error => {
          return error;
        });
    } else {
      Toast.show({
        text: "No internet connection. Please check your connection",
        duration: 5000,
        type: "danger",
      });
    }
  });
}

let deviceLastSynced = "";
export async function fetch_all_data(obj, props) {
  return await NetInfo.isConnected.fetch().then(async isConnected => {
    if (isConnected) {
      // obj.url = "https://pos-demo.herokuapp.com";
      let url = obj.url.toLowerCase();

      if ("deviceLastSynced" in obj) {
        deviceLastSynced = obj.deviceLastSynced;
      } else {
        deviceLastSynced = moment().format("YYYY/MM/D hh:mm:ss SSS");
      }
      if (!url.includes("https://") && !url.includes("http://")) {
        url = "http://" + url;
      }

      return await fetch(
        url +
          "/api/v1/merchants/" +
          obj.merchant_id +
          "/sync_all?lastsynced=" +
          deviceLastSynced,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + obj.token,
          },
        },
      )
        .then(response => {
          return response.json();
        })
        .then(async responseJson => {
          await data_from_api_save_to_local_database(responseJson, props);
          return await setDeviceLastSynced(obj, props);
        })
        .catch(error => {});
    } else {
      Toast.show({
        text: "No internet connection. Please check your connection",
        duration: 5000,
        type: "danger",
      });
    }
  });
}

export async function data_from_api_save_to_local_database(
  response_data_from_api,
  props,
) {
  for (let i = 0; i < response_data_from_api.data.length; i += 1) {
    if ("deleted_at" in response_data_from_api.data[i].attributes) {
      if (response_data_from_api.data[i].attributes.deleted_at === null) {
        if (response_data_from_api.data[i].type === "Item") {
          response_data_from_api.data[i].attributes.id =
            response_data_from_api.data[i].type +
            "/" +
            response_data_from_api.data[i].id;
          await itemSync(response_data_from_api.data[i].attributes, props);
        } else if (response_data_from_api.data[i].type === "Category") {
          response_data_from_api.data[i].attributes.id =
            response_data_from_api.data[i].type +
            "/" +
            response_data_from_api.data[i].id;
          await categorySync(response_data_from_api.data[i].attributes, props);
        } else if (response_data_from_api.data[i].type === "Discount") {
          response_data_from_api.data[i].attributes.id =
            response_data_from_api.data[i].type +
            "/" +
            response_data_from_api.data[i].id;
          response_data_from_api.data[i].attributes.discounttype =
            response_data_from_api.data[i].attributes.discountType;

          await discountSync(response_data_from_api.data[i].attributes, props);
        } else if (response_data_from_api.data[i].type === "Employee") {
          response_data_from_api.data[i].attributes.id =
            "Attendant/" + response_data_from_api.data[i].id;
          response_data_from_api.data[i].attributes.pin_code =
            response_data_from_api.data[i].attributes.pin;
          if (response_data_from_api.data[i].attributes.role !== null) {
            let get_role_object = await props.roleStore.find(
              "Role/" + response_data_from_api.data[i].attributes.role,
            );
            response_data_from_api.data[i].attributes.role =
              get_role_object[0].role;
          } else {
            response_data_from_api.data[i].attributes.role = "None";
          }
          await attendantSync(response_data_from_api.data[i].attributes, props);
        } else if (response_data_from_api.data[i].type === "Role") {
          response_data_from_api.data[i].attributes.id =
            "Role/" + response_data_from_api.data[i].id;
          await roleSync(response_data_from_api.data[i].attributes, props);
        } else if (response_data_from_api.data[i].type === "Merchant") {
          response_data_from_api.data[i].attributes.id =
            "Company/" + response_data_from_api.data[i].id;
          await companySync(response_data_from_api.data[i].attributes, props);
        }
      } else {
        if (response_data_from_api.data[i].type === "Employee") {
          response_data_from_api.data[i].id =
            "Attendant/" + response_data_from_api.data[i].id;
        } else {
          response_data_from_api.data[i].id =
            response_data_from_api.data[i].type +
            "/" +
            response_data_from_api.data[i].id;
        }

        await delete_object(
          response_data_from_api.data[i],
          response_data_from_api.data[i].type,
          props,
          false,
        );
      }
    }
  }
}

export async function setDeviceLastSynced(obj, props) {
  let role = await props.roleStore.findRole("Owner");

  if (role.length === 0) {
    await props.roleStore.add({
      role: "Owner",
      dateUpdated: Date.now(),
      syncStatus: false,
    });
  }
  let checkEmployee = await props.attendantStore.findCanLogin();
  if (!checkEmployee) {
    await props.attendantStore.add({
      user_name: "First User Owner",
      pin_code: "0000",
      role: "Owner",
      canLogin: true,
      dateUpdated: Date.now(),
      syncStatus: false,
    });
  }

  if (props.printerStore.sync.length > 0) {
    let sync = await props.printerStore.findSync(
      props.printerStore.sync[0]._id,
    );
    sync.edit({
      url: obj.url.toLowerCase().includes("https")
        ? obj.url
            .toLowerCase()
            .replace("https://", "")
            .trim()
        : obj.url.toLowerCase().includes("http")
          ? obj.url
              .toLowerCase()
              .replace("http://", "")
              .trim()
          : obj.url.toLowerCase().trim(),
      isHttps: obj.url.toLowerCase().includes("https"),
      isAutomatic: true,
      isErpnext: false,
      user_name: "Tailpos",
      password: obj.password,
      deviceLastSynced:
        "deviceLastSynced" in obj
          ? moment().format("YYYY/MM/D hh:mm:ss SSS")
          : deviceLastSynced,
      token: obj.token,
    });
    props.stateStore.setDeviceLastSynced(
      "deviceLastSynced" in obj
        ? moment().format("YYYY/MM/D hh:mm:ss SSS")
        : deviceLastSynced,
    );
  } else {
    await props.printerStore.addSync({
      url: obj.url.toLowerCase().includes("https")
        ? obj.url
            .toLowerCase()
            .replace("https://", "")
            .trim()
        : obj.url.toLowerCase().includes("http")
          ? obj.url
              .toLowerCase()
              .replace("http://", "")
              .trim()
          : obj.url.toLowerCase().trim(),
      isHttps: obj.url.toLowerCase().includes("https"),
      isAutomatic: true,
      isErpnext: false,
      user_name: obj.user_name,
      password: obj.password,
      deviceLastSynced:
        "deviceLastSynced" in obj
          ? moment().format("YYYY/MM/D hh:mm:ss SSS")
          : deviceLastSynced,
      token: obj.token,
    });
    props.stateStore.setDeviceLastSynced(
      "deviceLastSynced" in obj
        ? moment().format("YYYY/MM/D hh:mm:ss SSS")
        : deviceLastSynced,
    );
  }

  let company = await props.printerStore.findCompany(
    props.printerStore.companySettings[0]._id,
  );
  await company.edit({
    activationKey: obj.activationKey,
    merchant_id: obj.merchant_id,
  });
  props.stateStore.setIsNotSyncing();
  return "Success";
}
