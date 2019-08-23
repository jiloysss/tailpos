import { types } from "mobx-state-tree";
import { openAndSyncDB, sync, saveSnapshotToDB } from "./DbFunctions";
import { assignUUID } from "./Utils";
// let Item = openAndSyncDB("items");
// let Category = openAndSyncDB("categories");
// let Discount = openAndSyncDB("discounts");
// let shiftDb = openAndSyncDB("categories");
// let attendantDb = openAndSyncDB("categories");
// let shiftReportDb = openAndSyncDB("categories");
// let receiptDb = openAndSyncDB("categories");
// let paymentDb = openAndSyncDB("categories");
let trash = openAndSyncDB("trash", true);
export const Trash = types
  .model("Trash", {
    _id: types.identifier(),
    trashId: types.optional(types.string, ""),
    table_name: types.optional(types.string, ""),
  })
  .preProcessSnapshot(snapshot => assignUUID(snapshot, "Item"))
  .actions(self => ({
    postProcessSnapshot(snapshot) {
      saveSnapshotToDB(trash, snapshot);
    },
  }));
const SyncStore = types
  .model("SyncStore", {
    rows: types.optional(types.string, "[]"),
    trashRows: types.optional(types.string, "[]"),
  })
  .actions(self => ({
    add(data) {
      let rowsData = JSON.parse(self.rows);
      rowsData.push(data);
      self.rows = JSON.stringify(rowsData);
    },
    addToTrash(data) {
      let dataObject = JSON.parse(self.trashRows);
      dataObject.push(data);
      self.trashRows = JSON.stringify(dataObject);
    },
    async forceSync() {
      self.rows = "[]";
      let databaseNames = [
        "categories",
        "items",
        "discounts",
        "attendants",
        "receipts",
        "payments",
        "shifts",
        "customers",
        "company",
      ];
      let databaseNamesUpperCase = [
        "Categories",
        "Item",
        "Discounts",
        "Attendants",
        "Receipts",
        "Payments",
        "Shifts",
        "Customer",
        "Company",
      ];
      await trash.allDocs({ include_docs: true }).then(entries => {
        if (entries && entries.rows.length > 0) {
          for (let i = 0; i < entries.rows.length; i += 1) {
            if (entries.rows[i].doc.trashId) {
              JSON.parse(self.trashRows).push(
                JSON.parse(JSON.stringify(entries.rows[i].doc)),
              );
            }
          }
        }
      });
      return new Promise(function(resolve, reject) {
        for (let x = 0; x < databaseNames.length; x += 1) {
          openAndSyncDB(databaseNames[x])
            .allDocs({ include_docs: true })
            .then(entries => {
              if (entries && entries.rows.length > 0) {
                for (let i = 0; i < entries.rows.length; i += 1) {
                  if (
                    entries.rows[i].doc.name ||
                    entries.rows[i].doc.user_name ||
                    entries.rows[i].doc.status === "completed" ||
                    entries.rows[i].doc.status === "cancelled" ||
                    entries.rows[i].doc.receipt ||
                    entries.rows[i].doc.status === "Closed"
                  ) {
                    self.add({
                      dbName: databaseNamesUpperCase[x],
                      syncObject: entries.rows[i].doc,
                    });
                  }
                }
              }
            })
            .then(result => {
              if (databaseNames.length - 1 === x) {
                resolve(self.rows);
              }
            });
        }
      });
    },
    async selectedSync() {
      self.rows = "[]";
      let databaseNames = [
        "categories",
        "items",
        "discounts",
        "attendants",
        "receipts",
        "payments",
        "shifts",
        "customers",
        "company",
        "roles",
      ];
      let databaseNamesUpperCase = [
        "Categories",
        "Item",
        "Discounts",
        "Attendants",
        "Receipts",
        "Payments",
        "Shifts",
        "Customer",
        "Company",
        "Role",
      ];

      await trash.allDocs({ include_docs: true }).then(entries => {
        if (entries && entries.rows.length > 0) {
          for (let i = 0; i < entries.rows.length; i += 1) {
            if (entries.rows[i].doc.trashId) {
              JSON.parse(self.trashRows).push(
                JSON.parse(JSON.stringify(entries.rows[i].doc)),
              );
            }
          }
        }
      });
      return new Promise(function(resolve, reject) {
        for (let x = 0; x < databaseNames.length; x += 1) {
          openAndSyncDB(databaseNames[x])
            .allDocs({ include_docs: true })
            .then(entries => {
              if (entries && entries.rows.length > 0) {
                for (let i = 0; i < entries.rows.length; i += 1) {
                  if (
                    (entries.rows[i].doc.name ||
                      entries.rows[i].doc.companyLanguage ||
                      entries.rows[i].doc.user_name ||
                      entries.rows[i].doc.status === "completed" ||
                      entries.rows[i].doc.status === "cancelled" ||
                      entries.rows[i].doc.receipt ||
                      entries.rows[i].doc.status === "Closed") &&
                    entries.rows[i].doc.syncStatus === false
                  ) {
                    self.add({
                      dbName: databaseNamesUpperCase[x],
                      syncObject: entries.rows[i].doc,
                    });
                  }
                }
              }
            })
            .then(result => {
              if (databaseNames.length - 1 === x) {
                resolve(self.rows);
              }
            });
        }
      });
    },
    async syncNow(objects, type, credentials, jobStatus, store) {
      let returnResult = [];

      let trashRowsValues = self.trashRows;
      self.trashRows = "[]";
      await sync(
        objects,
        type,
        trashRowsValues,
        credentials,
        jobStatus,
        store,
      ).then(result => {
        if (result) {
          returnResult = result;
        }
      });
      return returnResult;
    },
    getObjects(obj, table = "") {
      if (obj.table === "Item") {
        table = "items";
      } else if (obj.table === "Category") {
        table = "categories";
      } else if (obj.table === "Discount") {
        table = "discounts";
      } else if (obj.table === "Receipt") {
        table = "receipts";
      } else if (obj.table === "Payment") {
        table = "payments";
      } else if (obj.table === "Shift") {
        table = "shifts";
      } else if (obj.table === "Employee") {
        table = "attendants";
      } else if (obj.table === "Merchant") {
        table = "company";
      } else if (obj.table === "Role") {
        table = "roles";
      }
      let selector = self.selectorObject(obj);
      return new Promise(function(resolve, reject) {
        openAndSyncDB(table, true)
          .find({
            selector: selector,
          })
          .then(result => {
            const categoryItemsReplacement = result.docs.map(item =>
              JSON.parse(JSON.stringify(item)),
            );
            if (categoryItemsReplacement) {
              resolve(categoryItemsReplacement);
            }
          });
      });
    },
    selectorObject(obj) {
      if ("_id" in obj) {
        return {
          _id: { $regex: `.*${obj._id}.*` },
        };
      } else if ("id" in obj) {
        return {
          _id: { $regex: `.*${obj.id}.*` },
        };
      } else if (obj.table === "Item") {
        return {
          name: { $regex: obj.name },
          price: { $regex: parseInt(obj.price, 10) },
        };
      } else if (obj.table === "Payment") {
        return {
          receipt: { $regex: obj.receipt },
        };
      } else if (obj.table === "Employee") {
        return {
          user_name: { $regex: obj.user_name },
        };
      } else if (obj.table === "Role") {
        return {
          role: { $regex: obj.role },
        };
      } else {
        return {
          name: { $regex: obj.name },
        };
      }
    },
  }));

const Sync = SyncStore.create({});

export default Sync;
