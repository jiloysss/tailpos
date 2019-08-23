import { Toast } from "native-base";
import { currentLanguage } from "../../translations/CurrentLanguage";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
import BackgroundJob from "react-native-background-job";

export function syncObjectValues(status, store, jobStatus) {
  strings.setLanguage(currentLanguage().companyLanguage);

  const { forceSync, selectedSync } = store.syncStore;

  let syncStoreMethod = "";

  if (status === "forceSync") {
    syncStoreMethod = forceSync();
  }

  if (status === "sync") {
    syncStoreMethod = selectedSync();
  }

  syncStoreMethod.then(async result => {
    const resLength = JSON.parse(result).length;
    const trashLength = JSON.parse(store.syncStore.trashRows).length;

    if (resLength > 0 || trashLength > 0) {
      const protocol = store.stateStore.isHttps ? "https://" : "http://";
      const syncInfo = {
        deviceId: store.stateStore.deviceId,
        url: protocol + store.printerStore.sync[0].url,
        user_name: store.printerStore.sync[0].user_name,
        password: store.printerStore.sync[0].password,
      };

      store.syncStore
        .syncNow(result, status, syncInfo, jobStatus, store)
        .then(async resultFromErpnext => {
          if (resultFromErpnext) {
            const data = resultFromErpnext.data;
            const deleted = resultFromErpnext.deleted_documents;

            for (let x = 0; x < data.length; x++) {
              const table = data[x].table;

              if (table === "Categories") {
                await categorySync(data[x].syncObject, store);
              } else if (table === "Customer") {
                await customerSync(data[x].syncObject, store);
              } else if (table === "Discounts") {
                await discountSync(data[x].syncObject, store);
              } else if (table === "Attendants") {
                await attendantSync(data[x].syncObject, store);
              } else if (table === "Company") {
                await companySync(data[x].syncObject, store);
              }
            }

            if (deleted.length > 0) {
              for (let x = 0; x < deleted.length; x++) {
                await deleteRecords(deleted[x], store);
              }
            }
          }

          for (let xx = 0; xx < resultFromErpnext.data.length; xx += 1) {
            if (resultFromErpnext.data[xx].tableNames === "Item") {
              await itemSync(resultFromErpnext.data[xx], store);
            }
          }
          await changeSyncStatusValue(result, store);

          if (!jobStatus) {
            Toast.show({
              text: strings.SyncSuccessful,
              duration: 3000,
            });
            store.stateStore.setIsNotSyncing();
          }

          BackgroundJob.cancel({ jobKey: "AutomaticSync" });
        });
    } else {
      if (!jobStatus) {
        Toast.show({
          text: strings.AlreadyUpToDate,
          type: "danger",
          duration: 3000,
        });
        store.stateStore.setIsNotSyncing();
      }

      BackgroundJob.cancel({ jobKey: "AutomaticSync" });
    }
  });
}
export async function itemSync(itemObject, store) {
  let itemObjectResult = await store.itemStore.find(itemObject.id);
  let categoryId = "";

  if (itemObject.category !== "") {
    let categoryIds = await store.categoryStore.searchLengthName(
      itemObject.category,
    );
    if (categoryIds) {
      categoryId = categoryIds._id;
      store.itemStore.updateLengthObjects(categoryIds._id);
    }
  } else {
    categoryId = "No Category";
  }

  if (itemObjectResult) {
    itemObjectResult.edit({
      _id: itemObject.id,
      name: itemObject.name !== null ? itemObject.name : "",
      soldBy: itemObject.stock_uom !== null ? itemObject.stock_uom : "",
      price: itemObject.price !== null ? itemObject.price : 0,
      sku: itemObject.sku !== null ? itemObject.sku : "",
      barcode:
        itemObject.barcode === null || itemObject.barcode === undefined
          ? ""
          : itemObject.barcode,
      colorAndShape: JSON.stringify([
        {
          color:
            itemObject.color !== null
              ? itemObject.color.toLowerCase().replace(" ", "")
              : "gray",
          shape:
            itemObject.shape !== null
              ? itemObject.shape.toLowerCase()
              : "square",
        },
      ]),
      colorOrImage:
        itemObject.color_or_image !== null ? itemObject.color_or_image : "",
      imagePath: itemObject.image !== null ? itemObject.image : "",
      favorite: itemObject.favorite !== null ? itemObject.favorite : "",
      category:
        categoryId === null || categoryId === undefined ? "" : categoryId,
      taxes: "[]",
      dateUpdated: Date.now(),
      syncStatus: true,
    });
  } else {
    var objecct_to_add = {
      name: itemObject.name !== null ? itemObject.name : "",
      description:
        itemObject.item_name !== null
          ? itemObject.item_name
          : itemObject.name !== null
            ? itemObject.name
            : "",
      soldBy:
        itemObject.stock_uom !== null
          ? itemObject.stock_uom === "Nos"
            ? "Each"
            : itemObject.stock_uom
          : "",
      price: itemObject.price !== null ? itemObject.price : 0,
      sku: itemObject.sku !== null ? itemObject.sku : "",
      barcode:
        itemObject.barcode !== null && itemObject.barcode !== undefined
          ? itemObject.barcode
          : "",
      colorAndShape: JSON.stringify([
        {
          color:
            itemObject.color !== null
              ? itemObject.color.toLowerCase().replace(" ", "")
              : "gray",
          shape:
            itemObject.shape !== null
              ? itemObject.shape.toLowerCase()
              : "square",
        },
      ]),
      colorOrImage:
        itemObject.color_or_image !== null ? itemObject.color_or_image : "",
      imagePath: itemObject.image !== null ? itemObject.image : "",
      favorite: itemObject.favorite !== null ? itemObject.favorite : "",
      category: categoryId,
      taxes: "[]",
      dateUpdated: Date.now(),
      syncStatus: itemObject.id !== null ? true : false,
    };
    itemObject.id !== null ? (objecct_to_add._id = itemObject.id) : null;
    store.itemStore.add(objecct_to_add);
    itemObject.category !== null
      ? store.itemStore.updateLengthObjects(itemObject.category)
      : null;
    itemObject.category !== null || itemObject.category === null
      ? store.itemStore.updateLength()
      : null;
  }
}

export async function categorySync(categoryObject, store) {
  const { id, name, color, shape } = categoryObject;
  await store.categoryStore.find(id).then(categoryObjectResult => {
    if (categoryObjectResult !== null) {
      categoryObjectResult.edit({
        _id: id,
        name: name || name !== null ? name : "",
        colorAndShape: JSON.stringify([
          {
            color: color !== null ? color.toLowerCase() : "gray",
            shape: shape !== null ? shape.toLowerCase() : "square",
          },
          1,
        ]),
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    } else {
      store.categoryStore.add({
        _id: id !== null ? id : "",
        name: name !== null ? name : "",
        colorAndShape: JSON.stringify([
          {
            color: color !== null ? color.toLowerCase() : "gray",
            shape: shape !== null ? shape.toLowerCase() : "square",
          },
        ]),
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    }
  });
}

export async function discountSync(discountObject, store) {
  let discountObjectResult = await store.discountStore.find(discountObject.id);
  if (discountObjectResult) {
    discountObjectResult.edit({
      _id: discountObject.id !== null ? discountObject.id : "",
      name: discountObject.name !== null ? discountObject.name : "",
      value: discountObject.value !== null ? discountObject.value : 0,
      percentageType:
        discountObject.discounttype !== null
          ? discountObject.discounttype
          : discountObject.discountType !== null
            ? discountObject.discountType
            : "percentage",
      dateUpdated: Date.now(),
      syncStatus: true,
    });
  } else {
    store.discountStore.add({
      _id: discountObject.id !== null ? discountObject.id : "",
      name: discountObject.name !== null ? discountObject.name : "",
      value: discountObject.value !== null ? discountObject.value : 0,
      percentageType:
        discountObject.discounttype !== null
          ? discountObject.discounttype
          : "percentage",
      dateUpdated: Date.now(),
      syncStatus: true,
    });
  }
}

export async function attendantSync(attendantObject, store) {
  let attendantObjectResult = await store.attendantStore.find(
    attendantObject.id,
  );
  if (attendantObjectResult && attendantObject.role !== "None") {

    let attendantObjectFinal = {
      _id: attendantObject.id,
      user_name:
        attendantObject.user_name !== null ? attendantObject.user_name : "",
      pin_code: attendantObject.pin_code ? attendantObject.pin_code : "0000",
      role: attendantObject.role !== null ? attendantObject.role : "None",
      canLogin:
        attendantObject.canLogin !== null ? attendantObject.canLogin : false,
      dateUpdated: Date.now(),
      syncStatus: true,
    };
    attendantObjectResult.edit(attendantObjectFinal);
  } else {
    let attendantObjectResult1 = await store.attendantStore.findName(
      attendantObject.user_name,
    );
    if (!attendantObjectResult1) {

      let attendantObjectFinal = {
        _id: attendantObject.id !== null ? attendantObject.id : "",
        user_name:
          attendantObject.user_name !== null ? attendantObject.user_name : "",
        pin_code: attendantObject.pin_code ? attendantObject.pin_code : "0000",
        role: attendantObject.role !== null ? attendantObject.role : "Cashier",
        canLogin:
          attendantObject.canLogin !== null ? attendantObject.canLogin : false,
        dateUpdated: Date.now(),
        syncStatus: true,
      };
      store.attendantStore.add(attendantObjectFinal);
    }
  }
}

export async function customerSync(customerObject, store) {
  if (customerObject.syncObject.id !== null) {
    const customerObjectResult = await store.customerStore.find(
      customerObject.syncObject.id,
    );

    if (customerObjectResult) {
      customerObjectResult.edit({
        _id: customerObject.syncObject.id,
        name:
          customerObject.syncObject.customer_name !== null
            ? customerObject.syncObject.customer_name
            : "",
        email:
          customerObject.syncObject.email !== null
            ? customerObject.syncObject.email
            : "",
        phoneNumber:
          customerObject.syncObject.phonenumber !== null
            ? customerObject.syncObject.phonenumber
            : "Cashier",
        note:
          customerObject.syncObject.note !== null
            ? customerObject.syncObject.note
            : "Cashier",
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    } else {
      store.customerStore.add({
        _id: customerObject.syncObject.id,
        name:
          customerObject.syncObject.customer_name !== null
            ? customerObject.syncObject.customer_name
            : "",
        email:
          customerObject.syncObject.email !== null
            ? customerObject.syncObject.email
            : "",
        phoneNumber:
          customerObject.syncObject.phonenumber !== null
            ? customerObject.syncObject.phonenumber
            : "Cashier",
        note:
          customerObject.syncObject.note !== null
            ? customerObject.syncObject.note
            : "Cashier",
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    }
  }
}
export async function roleSync(roleObject, store) {
  if (roleObject.id !== null) {
    const roleObjectResult = await store.roleStore.find(roleObject.id);

    if (roleObjectResult) {
      roleObjectResult.edit({
        _id: roleObject.id,
        role: roleObject.role,
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    } else {
      store.roleStore.add({
        _id: roleObject.id,
        role: roleObject.role,
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    }
  }
}
export async function companySync(companyObject, store) {
  if (store.printerStore.companySettings.length > 0) {
    const companyObjectResult = await store.printerStore.findCompany(
      store.printerStore.companySettings[0]._id,
    );
    if (companyObjectResult) {
      companyObjectResult.edit({
        _id: store.printerStore.companySettings[0]._id,
        name:
          "company_name" in companyObject
            ? companyObject.company_name !== null
              ? companyObject.company_name
              : ""
            : "",
        countryCode:
          "default_currency" in companyObject
            ? companyObject.default_currency !== null
              ? companyObject.default_currency
              : store.printerStore.companySettings[0].countryCode
            : store.printerStore.companySettings[0].countryCode,
        companyLanguage:
          "company_language" in companyObject
            ? companyObject.company_language !== null
              ? companyObject.company_language
              : store.printerStore.companySettings[0].companyLanguage
            : store.printerStore.companySettings[0].companyLanguage,
        header:
          "company_header" in companyObject
            ? companyObject.company_header !== null
              ? companyObject.company_header
              : store.printerStore.companySettings[0].header
            : store.printerStore.companySettings[0].header,
        footer:
          "company_footer" in companyObject
            ? companyObject.company_footer !== null
              ? companyObject.company_footer
              : store.printerStore.companySettings[0].footer
            : store.printerStore.companySettings[0].footer,
        tax:
          "tax" in companyObject
            ? companyObject.tax !== null
              ? companyObject.tax
              : store.printerStore.companySettings[0].tax
            : store.printerStore.companySettings[0].tax,
      });
    }
  }

}
export async function changeSyncStatusValue(data, store) {
  let dataValue = JSON.parse(data);
  if (dataValue.length > 0) {
    for (let x = 0; x < dataValue.length; x += 1) {
      if (dataValue[x].dbName === "Item") {
        await changeValue(dataValue[x], store.itemStore, "Item");
      } else if (dataValue[x].dbName === "Categories") {
        await changeValue(dataValue[x], store.categoryStore, "Categories");
      } else if (dataValue[x].dbName === "Discounts") {
        await changeValue(dataValue[x], store.discountStore, "Discounts");
      } else if (dataValue[x].dbName === "Attendants") {
        await changeValue(dataValue[x], store.attendantStore, "Attendants");
      } else if (dataValue[x].dbName === "Receipts") {
        await changeValue(dataValue[x], store.receiptStore, "Receipts");
      } else if (dataValue[x].dbName === "Shifts") {
        await changeValue(dataValue[x], store.shiftStore, "Shifts");
      } else if (dataValue[x].dbName === "Payments") {
        await changeValue(dataValue[x], store.paymentStore, "Payments");
      } else if (dataValue[x].dbName === "Customer") {
        await changeValue(dataValue[x], store.customerStore, "Customer");
      } else if (dataValue[x].dbName === "Company") {
        await changeValue(dataValue[x], store.printerStore, "Company");
      }
    }
  }
}

export async function changeValue(changeObject, store, dbType) {
  if (changeObject) {
    let objectToBeEdit = "";

    if (dbType === "Company") {
      objectToBeEdit = await store.findCompany(changeObject.syncObject._id);
    } else if (dbType === "Receipts") {
      objectToBeEdit = await store.findReceipt(changeObject.syncObject._id);
    } else if (dbType === "Shifts") {
      objectToBeEdit = await store.findShift(changeObject.syncObject._id);
    } else if (dbType === "Payments") {
      objectToBeEdit = await store.findPayment(changeObject.syncObject._id);
    } else {
      objectToBeEdit = await store.find(changeObject.syncObject._id);
    }

    if (objectToBeEdit && dbType !== "Receipts") {
      objectToBeEdit.edit({
        syncStatus: true,
      });
    } else if (objectToBeEdit && dbType === "Receipts") {
      objectToBeEdit.changeStatus();
    }
  }
}

export async function deleteRecords(deletedObject, store) {
  if (deletedObject) {
    if (deletedObject._id !== null) {
      let objectToBeDeleted = "";
      if (deletedObject.tableNames === "Items") {
        objectToBeDeleted = await store.itemStore.find(deletedObject._id);
      } else if (deletedObject.tableNames === "Categories") {
        objectToBeDeleted = await store.categoryStore.find(deletedObject._id);
      } else if (deletedObject.tableNames === "Discounts") {
        objectToBeDeleted = await store.discountStore.find(deletedObject._id);
      } else if (deletedObject.tableNames === "Attendants") {
        objectToBeDeleted = await store.attendantStore.find(deletedObject._id);
      } else if (deletedObject.tableNames === "Customer") {
        objectToBeDeleted = await store.customerStore.find(deletedObject._id);
      }

      if (deletedObject.tableNames === "Items" && objectToBeDeleted) {
        store.itemStore.updateLengthDelete();
        store.itemStore.updateLengthObjectsDelete(objectToBeDeleted.category);
      }
      if (objectToBeDeleted) {
        objectToBeDeleted.delete();
      }
    }
  }
}
