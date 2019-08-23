// import BackgroundJob from "react-native-background-job";
import { Toast } from "native-base";
import { NetInfo } from "react-native";
const moment = require("moment");
// export function makeid(length) {
//     let result= "";
//     let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//     let charactersLength = characters.length;
//     for ( let i = 0; i < length; i++ ) {
//         result += characters.charAt(Math.floor(Math.random() * charactersLength));
//     }
//     return result;
// }

export function automatic_sync_background_job(objects, props, sync_type) {
  //   let jobKeyName = makeid(10)
  //   // let jobKeyName = "1"
  // const backgroundJob = {
  //   jobKey: jobKeyName,
  //     job: () => sync_now(objects,props,sync_type,jobKeyName),
  sync_now(objects, props, sync_type);
  // };
  // BackgroundJob.register(backgroundJob);
  // let backgroundSchedule = {
  //   jobKey: jobKeyName,
  //   period: 1,
  //   allowExecutionInForeground: true,
  //   networkType: BackgroundJob.NETWORK_TYPE_UNMETERED,
  // };
  // BackgroundJob.schedule(backgroundSchedule);
}

export async function find_record(obj, props) {
  return await props.syncStore.getObjects(obj, obj.table).then(result => {
    return result[0];
  });
}
export async function sync_now(obj, props, sync_type) {
  let get_object = await find_record(obj, props, sync_type);
  if (get_object) {
    if (sync_type === "Delete") {
      get_object.deleted_at = moment(Date.now()).format("YYYY/MM/D hh:mm:ss");
    } else {
      get_object.deleted_at = null;
    }
    get_object.id = get_object._id;
    if (obj.table === "Employee" && get_object.role) {
      let get_role_object = await props.roleStore.findRole(get_object.role);
      if (get_role_object.length > 0) {
        get_object.role = get_role_object[0]._id;
      }
    }

    let result_object = {
      data: {
        records: [
          {
            syncObject: get_object,
            table: obj.table,
          },
        ],
      },
    };
    sync_to_server(obj, props, result_object, get_object, sync_type);
  } else {
    // BackgroundJob.cancel({ jobKey: jobKeyName });
  }
}
export function sync_to_server(
  obj,
  props,
  result_from_find,
  get_object,
  sync_type,
) {
  NetInfo.isConnected.fetch().then(async isConnected => {
    if (isConnected) {
      return await fetch(
        "https://pos-demo.herokuapp.com/api/v1/merchants/" +
          props.printerStore.companySettings[0].merchant_id +
          "/sync",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + props.printerStore.sync[0].token,
          },
          body: JSON.stringify(result_from_find),
        },
      )
        .then(response => {
          return response.json();
        })
        .then(async responseJson => {
          let response = "";

          if ("data" in responseJson) {
            response = responseJson.data;
          }
          if ("records" in responseJson) {
            response = responseJson.records;
          }

          if (response.length > 0 && sync_type === "Delete") {
            await delete_object(get_object, obj.table, props, true);
          } else if (response.length > 0 && sync_type !== "Delete") {
            await change_status(get_object, obj.table, props);
          }

          // BackgroundJob.cancel({ jobKey: jobKeyName });
        })

        .catch(() => {
          // BackgroundJob.cancel({ jobKey: jobKeyName });

          Toast.show({
            text: "Unable to sync",
            duration: 5000,
            type: "danger",
          });
        });
    } else {
      // BackgroundJob.cancel({ jobKey: jobKeyName });

      Toast.show({
        text: "No internet connection. Please check your connection",
        duration: 5000,
        type: "danger",
      });
    }
  });
}

export async function delete_object(obj, table, props, status) {
  let object_to_be_deleted = "";
  if (table === "Item") {
    object_to_be_deleted = await props.itemStore.find(obj.id);
    toast("Successfully Deleted Item", status);
  } else if (table === "Category") {
    object_to_be_deleted = await props.categoryStore.find(obj.id)._55;
    toast("Successfully Deleted Category", status);
  } else if (table === "Discount") {
    object_to_be_deleted = await props.discountStore.find(obj.id);
    toast("Successfully Deleted Discount", status);
  } else if (table === "Employee") {
    object_to_be_deleted = await props.attendantStore.find(obj.id);
    toast("Successfully Deleted Employee", status);
  } else if (table === "Customer") {
    object_to_be_deleted = await props.customerStore.find(obj.id);
    toast("Successfully Deleted Employee", status);
  }
  if (object_to_be_deleted) {
    object_to_be_deleted.delete();
  }
}

export async function change_status(obj, table, props) {
  let original_object = "";
  if (table === "Item") {
    original_object = await props.itemStore.find(obj._id);
  } else if (table === "Category") {
    original_object = await props.categoryStore.find(obj._id)._55;
  } else if (table === "Discount") {
    original_object = await props.discountStore.find(obj._id);
  } else if (table === "Employee") {
    original_object = await props.attendantStore.find(obj._id);
  } else if (table === "Customer") {
    original_object = await props.customerStore.find(obj._id);
  } else if (table === "Merchant") {
    original_object = await props.printerStore.findCompany(obj._id);
  }

  if (original_object) {
    original_object.edit({
      syncStatus: true,
    });
  }
}

export function toast(message, status) {
  if (status) {
    Toast.show({
      text: message,
      duration: 5000,
    });
  }
}

//background job syncing unsynced records
export async function get_unsynced_records(props) {
  if (!props.printerStore.sync[0].isErpnext) {
    await NetInfo.isConnected.fetch().then(async isConnected => {
      if (isConnected) {
        await props.syncStore.selectedSync().then(async unsyncedrecords => {
          let unsyncedObject = JSON.parse(unsyncedrecords);
          if (unsyncedObject.length > 0) {
            for (let i = 0; i < unsyncedObject.length; i += 1) {
              let obj = {
                table:
                  unsyncedObject[i].dbName === "Company"
                    ? "Merchant"
                    : unsyncedObject[i].dbName === "Attendants"
                      ? "Employee"
                      : unsyncedObject[i].dbName,
              };
              unsyncedObject[i].syncObject.id =
                unsyncedObject[i].syncObject._id;
              let result_object = {
                data: {
                  records: [
                    {
                      syncObject: unsyncedObject[i].syncObject,
                      table: obj.table,
                    },
                  ],
                },
              };

              await sync_to_server(
                obj,
                props,
                result_object,
                unsyncedObject[i].syncObject,
                "Create",
              );
            }
          }
        });
      }
    });
  }
}
