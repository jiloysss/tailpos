import * as React from "react";
import { Alert } from "react-native";
import { Toast } from "native-base";
import BluetoothSerial from "react-native-bluetooth-serial";
import { BluetoothStatus } from "react-native-bluetooth-status";
import TinyPOS from "tiny-esc-pos";
import { formatNumber } from "accounting-js";
import * as EmailValidator from "email-validator";
import { inject, observer } from "mobx-react/native";
import { currentLanguage } from "../../translations/CurrentLanguage";
import { automatic_sync_background_job } from "../../store/SyncStore/SyncAutomatic";
import PaymentScreen from "@screens/Payment";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
const moment = require("moment");
@inject(
  "itemStore",
  "customerStore",
  "receiptStore",
  "discountStore",
  "categoryStore",
  "paymentStore",
  "printerStore",
  "shiftStore",
  "attendantStore",
  "stateStore",
  "syncStore",
)
@observer
export default class PaymentContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      arrayObjects: [],
    };
  }

  componentWillMount() {
    this.props.stateStore.setPaymentValue("0");

    if (this.props.customerStore.rows.length > 0) {
      this.setState({ arrayObjects: this.props.customerStore.rows.slice() });
    }

    const { params } = this.props.navigation.state;

    this.getBluetoothState(params.receipt);
    if (!this.props.printerStore.defaultPrinter) {
      // this.setState({ connectionStatus: "No Default Printer" });
      this.props.stateStore.changeValue(
        "connectionStatus",
        "No Default Printer",
        "Payment",
      );
    }
    for (let i = 0; i < this.props.printerStore.rows.length; i += 1) {
      if (this.props.printerStore.rows[i].defaultPrinter) {
        // this.setState({ connectionStatus: "Connecting..." });
        this.props.stateStore.changeValue(
          "connectionStatus",
          "Connecting...",
          "Payment",
        );

        BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
          .then(() => {
            // this.setState({ connection: true });
            this.props.stateStore.changeValue("connection", true, "Payment");

            this.props.printerStore.setDefaultPrinter({
              _id: this.props.printerStore.rows[i]._id,
              name: this.props.printerStore.rows[i].name,
              macAddress: this.props.printerStore.rows[i].macAddress,
              defaultPrinter: this.props.printerStore.rows[i].defaultPrinter,
            });
          })
          .catch(() => {
            // this.setState({ connectionStatus: "Connecting..." });
            this.props.stateStore.changeValue(
              "connectionStatus",
              "Connecting...",
              "Payment",
            );

            BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
              .then(() => {
                // this.setState({ connection: true });
                this.props.stateStore.changeValue(
                  "connection",
                  true,
                  "Payment",
                );

                this.props.printerStore.setDefaultPrinter({
                  _id: this.props.printerStore.rows[i]._id,
                  name: this.props.printerStore.rows[i].name,
                  macAddress: this.props.printerStore.rows[i].macAddress,
                  defaultPrinter: this.props.printerStore.rows[i]
                    .defaultPrinter,
                });
              })
              .catch(() => {
                // this.setState({ connectionStatus: "Offline" });
                this.props.stateStore.changeValue(
                  "connectionStatus",
                  "Offline",
                  "Payment",
                );
              });
          });
      }
    }
  }

  async getBluetoothState(value) {
    if (value) {
      BluetoothStatus.enable(true);
    } else {
      BluetoothStatus.disable(true);
    }
  }

  onValueChange(text) {
    if (text === "Del") {
      const finalValue = this.props.stateStore.payment_value.slice(0, -1);
      this.props.stateStore.setPaymentValue(finalValue);
    } else {
      if (text.length > 1) {
        this.props.stateStore.setPaymentValue(text);
      } else {
        if (this.props.stateStore.payment_value === "0") {
          this.props.stateStore.setPaymentValue(text);
        } else {
          this.props.stateStore.setPaymentValue(
            this.props.stateStore.payment_value + text,
          );
        }
      }
    }
  }

  setOrderCompleted() {
    const {
      queueOrigin,
      currentTable,
      setCurrentTable,
    } = this.props.stateStore;

    const url = `${queueOrigin}/api/v1/complete_order`;
    const fetchData = {
      method: "POST",
      body: JSON.stringify({
        id: currentTable,
      }),
    };

    fetch(url, fetchData)
      .then(res => res.json())
      .then(res => setCurrentTable(-1));
  }

  onPay = async () => {
    const paymentValue = parseFloat(this.props.stateStore.payment_value);
    const amountDue = parseFloat(this.props.stateStore.amount_due);

    if (paymentValue < amountDue) {
      Alert.alert(
        strings.Alert,
        strings.AmountPaidMustBeGreaterThanOrEqualToAmountDue,
      );
    } else if (paymentValue >= amountDue) {
      let receiptNumber = await this.props.receiptStore.numberOfReceipts();
      let receiptNumberLength = receiptNumber.toString().length;
      let finalReceiptNumber = "";
      for (
        let lengthNumber = 0;
        lengthNumber < 15 - receiptNumberLength;
        lengthNumber += 1
      ) {
        finalReceiptNumber = finalReceiptNumber + "0";
      }
      finalReceiptNumber = finalReceiptNumber + receiptNumber.toString();

      const receiptCurrent = this.props.receiptStore.defaultReceipt;
      const { deviceId } = this.props.stateStore;

      if (deviceId) {
        receiptCurrent.setDeviceId(deviceId);
      }

      BluetoothSerial.isConnected().then(res => {
        let totalPurchase = 0.0;
        Alert.alert(
          strings.ReceiptConfirmation, // title
          strings.DoYouWantToPrintReceipt,
          [
            {
              text: strings.No,
              style: "cancel",
              onPress: () => {
                this.setOrderCompleted();
                this.props.shiftStore.defaultShift.addTotalDiscount(
                  receiptCurrent.discounts,
                );
                this.props.shiftStore.defaultShift.addTotalTaxes(
                  parseFloat(this.props.receiptStore.defaultReceipt.subtotal) *
                    (parseFloat(receiptCurrent.taxesValue) / 100),
                );
                this.props.shiftStore.defaultShift.addNumberOfTransaction();

                let totalAmountDue = 0.0;
                this.props.receiptStore.defaultReceipt.lines.map(val => {
                  totalAmountDue =
                    parseInt(totalAmountDue, 10) +
                    parseInt(val.price.toFixed(2), 10) *
                      parseInt(val.qty.toFixed(2), 10);
                });
                this.props.shiftStore.defaultShift.addTotalSales(
                  totalAmountDue,
                );
                this.props.receiptStore.defaultReceipt.lines.map(val => {
                  totalPurchase =
                    parseFloat(totalPurchase, 10) +
                    parseFloat(val.price, 10) * parseFloat(val.qty, 10);
                });

                receiptCurrent.completed(
                  this.props.attendantStore.defaultAttendant.user_name,
                );
                const { defaultShift } = this.props.shiftStore;

                // If shift started and shift hasn't ended
                if (defaultShift.shiftStarted && !defaultShift.shiftEnded) {
                  // Set the default receipt
                  const { defaultReceipt } = this.props.receiptStore;

                  // set shift
                  defaultReceipt.setShift(defaultShift._id);

                  const { ending_cash } = defaultShift;

                  // Set the end cash
                  defaultShift.setEndCash(
                    ending_cash + defaultReceipt.netTotal,
                  );
                }

                this.props.receiptStore.defaultReceipt.changeTaxesAmount(
                  this.props.receiptStore.defaultReceipt.get_tax_total,
                );

                // this.props.receiptStore.defaultReceipt.clear();
                let paymentObject = {
                  receipt: this.props.receiptStore.defaultReceipt._id.toString(),
                  date: Date.now(),
                  paid: parseInt(this.props.stateStore.payment_value, 10),
                  type: this.props.stateStore.payment_state[0].selected,
                  dateUpdated: Date.now(),
                  syncStatus: false,
                };
                this.props.paymentStore.add(paymentObject);
                this.props.receiptStore.add(
                  this.props.receiptStore.defaultReceipt,
                );
                this.props.receiptStore.setPreviousReceipt(
                  this.props.receiptStore.defaultReceipt,
                );
                let discountValueForDisplay = this.props.receiptStore
                  .defaultReceipt.discounts;
                let taxesValueForDisplay = this.props.receiptStore
                  .defaultReceipt.get_tax_total;
                this.props.receiptStore.newReceipt(
                  this.props.printerStore.companySettings[0].tax,
                );
                this.props.receiptStore.setLastScannedBarcode("");
                this.props.receiptStore.defaultReceipt.table = "Receipt";
                paymentObject.table = "Payment";
                automatic_sync_background_job(
                  this.props.receiptStore.defaultReceipt,
                  this.props,
                  1,
                );
                automatic_sync_background_job(paymentObject, this.props, 2);

                this.props.receiptStore.unselectReceiptLine();
                this.props.navigation.navigate("Sales", {
                  cash: this.props.stateStore.payment_value,
                  change: parseFloat(
                    parseFloat(this.props.stateStore.payment_value, 10) -
                      (parseFloat(totalPurchase, 10) -
                        parseFloat(discountValueForDisplay, 10) +
                        parseFloat(taxesValueForDisplay, 10)),
                    10,
                  ),
                });
              },
            },
            {
              text: strings.Yes,
              onPress: () => {
                this.setOrderCompleted();
                this.props.shiftStore.defaultShift.addTotalDiscount(
                  receiptCurrent.discounts,
                );
                this.props.shiftStore.defaultShift.addTotalTaxes(
                  parseFloat(this.props.receiptStore.defaultReceipt.subtotal) *
                    (parseFloat(receiptCurrent.taxesValue) / 100),
                );
                this.props.shiftStore.defaultShift.addNumberOfTransaction();

                // Let me print first
                let totalAmountDue = 0.0;
                let commission_toto = 0.0;
                this.props.receiptStore.defaultReceipt.lines.map(val => {
                  // const { defaultShift } = this.props.shiftStore;
                  let ComHolder = JSON.parse(val.commission_details);
                  ComHolder.map(val2 => {
                    commission_toto =
                      commission_toto + parseInt(val2.commission_amount, 10);
                  });
                  // defaultShift.addCommission(
                  //   parseInt(val.commission_amount, 10),
                  // );

                  totalAmountDue =
                    parseInt(totalAmountDue, 10) +
                    parseInt(val.price.toFixed(2), 10) *
                      parseInt(val.qty.toFixed(2), 10);
                });
                this.props.shiftStore.defaultShift.addTotalSales(
                  totalAmountDue,
                );
                if (res) {
                  const writePromises = [];

                  writePromises.push(BluetoothSerial.write(TinyPOS.init()));

                  // Header
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${
                          this.props.printerStore.companySettings.length > 0
                            ? this.props.printerStore.companySettings[0].name.toString()
                            : "Bai Web and Mobile Lab"
                        }`,
                        { align: "center", size: "doubleheight" },
                        true,
                      ),
                    ),
                  );

                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${
                          this.props.printerStore.companySettings.length > 0
                            ? this.props.printerStore.companySettings[0].header.toString()
                            : ""
                        }`,
                        { align: "center", size: "normal" },
                        true,
                      ),
                    ),
                  );

                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        "================================",
                        { size: "normal" },
                        true,
                      ),
                    ),
                  );

                  // Date
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${moment().format("YYYY/MM/D hh:mm:ss SSS")}`,
                        { size: "normal" },
                        true,
                      ),
                    ),
                  );

                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        "================================",
                        { size: "normal" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        strings.Cashier +
                          `${
                            this.props.attendantStore.defaultAttendant.user_name
                          }`,
                        { align: "left", size: "normal" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        strings.TransactionNo + `${finalReceiptNumber}`,
                        { align: "left", size: "normal" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        "================================",
                        { size: "normal" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        strings.Purchases,
                        { align: "center", size: "normal" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        strings.Items +
                          "                    " +
                          strings.Amount +
                          " ",
                        { align: "left", size: "normal", weight: "bold" },
                        true,
                      ),
                    ),
                  );

                  this.props.receiptStore.defaultReceipt.lines.map(val => {
                    let finalLines = "";

                    const name = val.item_name;

                    if (name.length > 14) {
                      let quotientValue = name.length / 14;
                      for (
                        let quotient = 0;
                        quotient < parseInt(quotientValue, 10);
                        quotient += 1
                      ) {
                        let currentCounter = quotient * 14;
                        let nameCounter = "";
                        for (
                          let n = currentCounter;
                          n < (quotient + 1) * 14;
                          n += 1
                        ) {
                          nameCounter = nameCounter + name[n];
                        }
                        writePromises.push(
                          BluetoothSerial.write(
                            TinyPOS.bufferedText(
                              `${nameCounter}`,
                              { align: "left", size: "normal" },
                              true,
                            ),
                          ),
                        );
                      }
                      if (name.length - parseInt(quotientValue, 10) * 14 > 0) {
                        let nameCounterOverflow = "";
                        for (
                          let m = parseInt(quotientValue, 10) * 14;
                          m < name.length;
                          m += 1
                        ) {
                          nameCounterOverflow = nameCounterOverflow + name[m];
                        }
                        writePromises.push(
                          BluetoothSerial.write(
                            TinyPOS.bufferedText(
                              `${nameCounterOverflow}`,
                              { align: "left", size: "normal" },
                              true,
                            ),
                          ),
                        );
                      }
                    } else {
                      writePromises.push(
                        BluetoothSerial.write(
                          TinyPOS.bufferedText(
                            `${name}`,
                            { align: "left", size: "normal" },
                            true,
                          ),
                        ),
                      );
                    }

                    let priceString = formatNumber(
                      parseFloat(val.price, 10),
                    ).toString();
                    let qtyString = val.qty.toString();
                    let amountString = formatNumber(
                      parseFloat(val.price, 10) * parseFloat(val.qty, 10),
                    ).toString();

                    for (let ps = 0; ps < 12 - priceString.length; ps += 1) {
                      finalLines = finalLines + " ";
                    }

                    finalLines = finalLines + priceString;

                    for (let qt = 0; qt < 6 - qtyString.length; qt += 1) {
                      finalLines = finalLines + " ";
                    }
                    finalLines = finalLines + qtyString;

                    for (let as = 0; as < 14 - amountString.length; as += 1) {
                      finalLines = finalLines + " ";
                    }

                    finalLines = finalLines + amountString;
                    writePromises.push(
                      BluetoothSerial.write(
                        TinyPOS.bufferedText(
                          `${finalLines}`,
                          { align: "left", size: "normal" },
                          true,
                        ),
                      ),
                    );
                    totalPurchase =
                      parseFloat(totalPurchase, 10) +
                      parseFloat(val.price, 10) * parseFloat(val.qty, 10);
                  });
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        "================================",
                        { align: "left", size: "normal", weight: "bold" },
                        true,
                      ),
                    ),
                  );

                  let subTotal = strings.Subtotal;
                  let sub = formatNumber(
                    parseFloat(
                      this.props.receiptStore.defaultReceipt.subtotal,
                      10,
                    ),
                  ).toString();
                  for (let t = 0; t < 23 - sub.length; t += 1) {
                    subTotal = subTotal + " ";
                  }
                  subTotal = subTotal + sub;
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${subTotal}`,
                        { align: "left", size: "normal" },
                        true,
                      ),
                    ),
                  );
                  let taxValue = strings.Tax;
                  let tax = formatNumber(
                    parseFloat(
                      this.props.receiptStore.defaultReceipt.get_tax_total,
                      10,
                    ),
                  ).toString();
                  for (let t = 0; t < 29 - tax.length; t += 1) {
                    taxValue = taxValue + " ";
                  }
                  taxValue = taxValue + tax;
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${taxValue}`,
                        { align: "left", size: "normal" },
                        true,
                      ),
                    ),
                  );
                  let discountValue = strings.Discount;
                  let discount = formatNumber(
                    parseFloat(
                      this.props.receiptStore.defaultReceipt.discounts,
                      10,
                    ),
                  ).toString();
                  for (let d = 0; d < 24 - discount.length; d += 1) {
                    discountValue = discountValue + " ";
                  }
                  discountValue = discountValue + discount;
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${discountValue}`,
                        { align: "left", size: "normal" },
                        true,
                      ),
                    ),
                  );

                  let commissionValue = strings.Commission;

                  let commission_total = formatNumber(
                    parseFloat(commission_toto, 10),
                  ).toString();
                  for (let d = 0; d < 22 - commission_total.length; d += 1) {
                    commissionValue = commissionValue + " ";
                  }
                  commissionValue = commissionValue + commission_total;
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${commissionValue}`,
                        { align: "left", size: "normal" },
                        true,
                      ),
                    ),
                  );

                  let total = "";
                  total = total + strings.TotalAmount;

                  for (
                    let totalLength = 0;
                    totalLength <
                    20 -
                      formatNumber(parseFloat(totalPurchase, 10)).toString()
                        .length;
                    totalLength += 1
                  ) {
                    total = total + " ";
                  }
                  total =
                    total +
                    formatNumber(
                      parseFloat(totalPurchase, 10) -
                        parseFloat(
                          this.props.receiptStore.defaultReceipt.discounts,
                          10,
                        ) +
                        parseFloat(
                          this.props.receiptStore.defaultReceipt.get_tax_total,
                          10,
                        ),
                    ).toString();

                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${total}`,
                        { align: "left", size: "normal", weight: "bold" },
                        true,
                      ),
                    ),
                  );
                  let cash = strings.Cash;
                  for (
                    let cashLength = 0;
                    cashLength <
                    28 -
                      formatNumber(
                        parseFloat(this.props.stateStore.payment_value, 10),
                      ).toString().length;
                    cashLength += 1
                  ) {
                    cash = cash + " ";
                  }
                  cash =
                    cash +
                    formatNumber(
                      parseFloat(this.props.stateStore.payment_value, 10),
                    ).toString();
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${cash}`,
                        { align: "left", size: "normal", weight: "bold" },
                        true,
                      ),
                    ),
                  );
                  let change = strings.Change;
                  let changeValue = formatNumber(
                    parseFloat(
                      parseFloat(this.props.stateStore.payment_value, 10) -
                        (parseFloat(totalPurchase, 10) -
                          parseFloat(
                            this.props.receiptStore.defaultReceipt.discounts,
                            10,
                          ) +
                          parseFloat(
                            this.props.receiptStore.defaultReceipt
                              .get_tax_total,
                            10,
                          )),
                      10,
                    ),
                  ).toString();
                  for (
                    let changeLength = 0;
                    changeLength < 26 - changeValue.length;
                    changeLength += 1
                  ) {
                    change = change + " ";
                  }
                  change = change + changeValue;

                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${change}`,
                        { align: "left", size: "normal", weight: "bold" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        "================================",
                        { size: "normal" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        strings.ThisServesAsYour,
                        { align: "center", size: "doubleheight" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        strings.OfficialReceipt + "\n",
                        { align: "center", size: "doubleheight" },
                        true,
                      ),
                    ),
                  );
                  writePromises.push(
                    BluetoothSerial.write(
                      TinyPOS.bufferedText(
                        `${
                          this.props.printerStore.companySettings.length > 0
                            ? this.props.printerStore.companySettings[0].footer.toString()
                            : ""
                        }`,
                        { align: "center", size: "normal" },
                        true,
                      ),
                    ),
                  );

                  // Add 3 new lines
                  writePromises.push(
                    BluetoothSerial.write(TinyPOS.bufferedLine(3)),
                  );

                  // Push drawer
                  writePromises.push(
                    BluetoothSerial.write(TinyPOS.kickCashDrawer()),
                  );
                  writePromises.push(
                    BluetoothSerial.write(TinyPOS.kickCashDrawer()),
                  );

                  Promise.all(writePromises)
                    .then(res2 => {
                      receiptCurrent.completed(
                        this.props.attendantStore.defaultAttendant.user_name,
                      );

                      this.props.receiptStore.defaultReceipt.changeTaxesAmount(
                        this.props.receiptStore.defaultReceipt.get_tax_total,
                      );
                      // add to row
                      this.props.paymentStore.add({
                        receipt: this.props.receiptStore.defaultReceipt._id.toString(),
                        date: Date.now(),
                        paid: parseInt(this.props.stateStore.payment_value, 10),
                        type: this.props.stateStore.payment_state[0].selected,
                        dateUpdated: Date.now(),
                        syncStatus: false,
                      });

                      // Reset payment amount
                      // this.setState({
                      //   modalVisible: false,
                      //   paymentAmount: 0,
                      // });
                      this.props.stateStore.changeValue(
                        "modalVisible",
                        false,
                        "Payment",
                      );
                      this.props.stateStore.changeValue(
                        "paymentAmount",
                        0,
                        "Payment",
                      );

                      Toast.show({
                        text: strings.TransactionCompleted,
                        duration: 5000,
                      });
                    })
                    .catch(err => {
                      receiptCurrent.completed(
                        this.props.attendantStore.defaultAttendant.user_name,
                      );

                      this.props.receiptStore.defaultReceipt.changeTaxesAmount(
                        this.props.receiptStore.defaultReceipt.get_tax_total,
                      );

                      // add to row
                      this.props.paymentStore.add({
                        receipt: this.props.receiptStore.defaultReceipt._id.toString(),
                        date: Date.now(),
                        paid: parseInt(this.props.stateStore.payment_value, 10),
                        type: this.props.stateStore.payment_state[0].selected,
                        dateUpdated: Date.now(),
                        syncStatus: false,
                      });
                      // this.setState({
                      //   modalVisible: false,
                      //   paymentAmount: 0,
                      // });
                      this.props.stateStore.changeValue(
                        "modalVisible",
                        false,
                        "Payment",
                      );
                      this.props.stateStore.changeValue(
                        "paymentAmount",
                        0,
                        "Payment",
                      );
                      Toast.show({
                        text: err.message + strings.TransactionCompleted,
                        buttonText: strings.Okay,
                        position: "bottom",
                        duration: 5000,
                      });
                    });
                } else {
                  receiptCurrent.completed(
                    this.props.attendantStore.defaultAttendant.user_name,
                  );

                  this.props.receiptStore.defaultReceipt.changeTaxesAmount(
                    this.props.receiptStore.defaultReceipt.get_tax_total,
                  );
                  // add to row
                  this.props.paymentStore.add({
                    receipt: this.props.receiptStore.defaultReceipt._id.toString(),
                    date: Date.now(),
                    paid: parseInt(this.props.stateStore.payment_value, 10),
                    type: this.props.stateStore.payment_state[0].selected,
                    dateUpdated: Date.now(),
                    syncStatus: false,
                  });

                  // this.setState({
                  //   modalVisible: false,
                  //   paymentAmount: 0,
                  // });
                  this.props.stateStore.changeValue(
                    "modalVisible",
                    false,
                    "Payment",
                  );
                  this.props.stateStore.changeValue(
                    "paymentAmount",
                    0,
                    "Payment",
                  );
                  Toast.show({
                    text:
                      strings.TransactionCompleted[
                        strings.UnableToConnectPrinter
                      ],
                    buttonText: strings.Okay,
                    position: "bottom",
                    duration: 6000,
                  });
                }

                const { defaultShift } = this.props.shiftStore;

                // If shift started and shift hasn't ended
                if (defaultShift.shiftStarted && !defaultShift.shiftEnded) {
                  // Set the default receipt
                  const { defaultReceipt } = this.props.receiptStore;

                  // set shift
                  defaultReceipt.setShift(defaultShift._id);

                  const { ending_cash } = defaultShift;

                  // Set the end cash
                  defaultShift.setEndCash(
                    ending_cash + defaultReceipt.netTotal,
                  );
                }

                // this.props.receiptStore.defaultReceipt.clear();
                this.props.receiptStore.add(
                  this.props.receiptStore.defaultReceipt,
                );
                this.props.receiptStore.setPreviousReceipt(
                  this.props.receiptStore.defaultReceipt,
                );
                let discountValueForDisplay = this.props.receiptStore
                  .defaultReceipt.discounts;
                let taxesValueForDisplay = this.props.receiptStore
                  .defaultReceipt.get_tax_total;
                this.props.receiptStore.newReceipt(
                  this.props.printerStore.companySettings[0].tax,
                );
                this.props.receiptStore.setLastScannedBarcode("");
                let paymentObject = {
                  receipt: this.props.receiptStore.defaultReceipt._id.toString(),
                };
                this.props.receiptStore.defaultReceipt.table = "Receipt";
                paymentObject.table = "Payment";
                automatic_sync_background_job(
                  this.props.receiptStore.defaultReceipt,
                  this.props,
                  1,
                );
                automatic_sync_background_job(paymentObject, this.props, 2);
                this.props.receiptStore.unselectReceiptLine();
                this.props.navigation.navigate("Sales", {
                  cash: this.props.stateStore.payment_value,
                  change: parseFloat(
                    parseFloat(this.props.stateStore.payment_value, 10) -
                      (parseFloat(totalPurchase, 10) -
                        parseFloat(discountValueForDisplay, 10) +
                        parseFloat(taxesValueForDisplay, 10)),
                    10,
                  ),
                });
              },
            },
          ],
        );
      });
    }
  };

  onBack() {
    this.props.navigation.goBack();
  }

  onPrinterChange(value) {
    this.props.stateStore.changeValue("itemSelected", value, "Payment");
    BluetoothSerial.connect("DC:0D:30:0B:77:B1")
      .then(res => {
        this.props.stateStore.changeValue("connection", true, "Payment");
      })
      .catch(() => {
        // this.setState({ connection: false });
        this.props.stateStore.changeValue("connection", false, "Payment");
      });
  }

  onPrinterPress() {
    this.props.navigation.navigate("Settings");
  }

  onConnectDevice() {
    if (this.props.printerStore.rows.length > 0) {
      for (let i = 0; i < this.props.printerStore.rows.length; i += 1) {
        if (this.props.printerStore.rows[i].defaultPrinter) {
          // this.setState({ connectionStatus: "Connecting..." });
          this.props.stateStore.changeValue(
            "connectionStatus",
            "Connecting...",
            "Payment",
          );

          BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
            .then(() => {
              // this.setState({ connection: true });
              this.props.stateStore.changeValue("connection", true, "Payment");

              this.props.printerStore.setDefaultPrinter({
                _id: this.props.printerStore.rows[i]._id,
                name: this.props.printerStore.rows[i].name,
                macAddress: this.props.printerStore.rows[i].macAddress,
                defaultPrinter: this.props.printerStore.rows[i].defaultPrinter,
              });
              // this.setState({ connectionStatus: "Connected" });
              this.props.stateStore.changeValue(
                "connectionStatus",
                "Connected",
                "Payment",
              );
            })
            .catch(() => {
              BluetoothSerial.connect(
                this.props.printerStore.rows[i].macAddress,
              )
                .then(() => {
                  // this.setState({ connection: true });
                  this.props.stateStore.changeValue(
                    "connection",
                    true,
                    "Payment",
                  );

                  this.props.printerStore.setDefaultPrinter({
                    _id: this.props.printerStore.rows[i]._id,
                    name: this.props.printerStore.rows[i].name,
                    macAddress: this.props.printerStore.rows[i].macAddress,
                    defaultPrinter: this.props.printerStore.rows[i]
                      .defaultPrinter,
                  });
                  // this.setState({ connectionStatus: "Connected" });
                  this.props.stateStore.changeValue(
                    "connectionStatus",
                    "Connected",
                    "Payment",
                  );
                })
                .catch(() => {
                  // this.setState({ connectionStatus: "Not Connected" });
                  this.props.stateStore.changeValue(
                    "connectionStatus",
                    "Not Connected",
                    "Payment",
                  );
                });
            });
        }
      }
    } else {
      Toast.show({
        text: strings.NoAddedPrinterDevice,
        buttonText: strings.Okay,
        position: "bottom",
        duration: 6000,
      });
    }
  }
  searchCustomer(text) {
    this.props.customerStore.search(text).then(result => {
      for (let i = 0; i < result.length; i += 1) {
        let existing = false;
        for (let v = 0; v < this.state.arrayObjects.length; v += 1) {
          if (result[i]._id === this.state.arrayObjects[v]._id) {
            existing = true;
          }
        }
        if (!existing) {
          this.state.arrayObjects.push(result[i]);
        }
      }
    });
  }
  onSaveCustomer() {
    if (this.props.stateStore.payment_state[0].customerName) {
      if (
        EmailValidator.validate(
          this.props.stateStore.payment_state[0].customerEmail,
        )
      ) {
        this.props.customerStore.add({
          name: this.props.stateStore.payment_state[0].customerName,
          email: this.props.stateStore.payment_state[0].customerEmail,
          phoneNumber: this.props.stateStore.payment_state[0]
            .customerPhoneNumber,
          note: this.props.stateStore.payment_state[0].customerNotes,
        });
        this.props.stateStore.changeValue("modalVisible", false, "Payment");
        this.props.stateStore.changeValue("customerName", "", "Payment");
        this.props.stateStore.changeValue("customerEmail", "", "Payment");
        this.props.stateStore.changeValue("customerPhoneNumber", "", "Payment");
        this.props.stateStore.changeValue("customerNotes", "", "Payment");
      } else {
        Alert.alert(strings.InvalidEmail, strings.PleaseEnterValidEmail);
      }
    } else {
      Alert.alert(strings.InvalidEmail, strings.PleaseEnterValidEmail);
    }
  }
  onCancelAddCustomer() {
    this.props.stateStore.changeValue("modalVisible", false, "Payment");
    this.props.stateStore.changeValue("customerName", "", "Payment");
    this.props.stateStore.changeValue("customerEmail", "", "Payment");
    this.props.stateStore.changeValue("customerPhoneNumber", "", "Payment");
    this.props.stateStore.changeValue("customerNotes", "", "Payment");
  }

  render() {
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <PaymentScreen
        values={this.props.stateStore.payment_state[0].toJSON()}
        paymentValue={this.props.stateStore.payment_value}
        amountDue={this.props.stateStore.amount_due}
        // value={this.props.stateStore.payment_value}
        // modalVisible={this.props.stateStore.payment_state[0].modalVisible}
        name={this.props.stateStore.payment_state[0].customerName}
        connectDevice={() => this.onConnectDevice()}
        onPickerChange={text =>
          this.props.stateStore.changeValue("selected", text, "Payment")
        }
        onValueChange={this.onValueChange.bind(this)}
        defaultCustomer={
          this.props.receiptStore.defaultCustomer.name.toString()
            ? this.props.receiptStore.defaultCustomer.name.toString()
            : "Default customer"
        }
        onPay={this.onPay}
        onPrinterChange={value => this.onPrinterChange(value)}
        searchCustomer={text => this.searchCustomer(text)}
        searchedCustomers={this.state.arrayObjects}
        modalVisibleChange={text =>
          this.props.stateStore.changeValue("modalVisible", text, "Payment")
        }
        navigation={() => {
          this.getBluetoothState(true);
          this.onBack();
        }}
        onPrinterPress={() => this.onPrinterPress()}
        onChangeaCustomerName={text =>
          this.props.stateStore.changeValue("customerName", text, "Payment")
        }
        onChangeCustomerEmail={text =>
          this.props.stateStore.changeValue("customerEmail", text, "Payment")
        }
        onChangeCustomerPhoneNumber={text =>
          this.props.stateStore.changeValue(
            "customerPhoneNumber",
            text,
            "Payment",
          )
        }
        onChangeCustomerNotes={text =>
          this.props.stateStore.changeValue("customerNotes", text, "Payment")
        }
        onSaveCustomer={() => this.onSaveCustomer()}
        onCancelAddCustomer={() => this.onCancelAddCustomer()}
        currency={
          this.props.printerStore.companySettings[0].countryCode
            ? this.props.printerStore.companySettings[0].countryCode
            : ""
        }
        useDefaultCustomer={this.props.stateStore.useDefaultCustomer}
      />
    );
  }
}
