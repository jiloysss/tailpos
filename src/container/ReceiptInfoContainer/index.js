import * as React from "react";
import { Alert } from "react-native";
import BluetoothSerial from "react-native-bluetooth-serial";
import TinyPOS from "tiny-esc-pos";
import { Toast } from "native-base";
import { formatNumber } from "accounting-js";
import { inject, observer } from "mobx-react/native";
import ReceiptInfo from "@screens/ReceiptInfo";
import { currentLanguage } from "../../translations/CurrentLanguage";
import { automatic_sync_background_job } from "../../store/SyncStore/SyncAutomatic";

import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
const moment = require("moment");
@inject(
  "paymentStore",
  "receiptStore",
  "printerStore",
  "itemStore",
  "shiftStore",
  "attendantStore",
  "syncStore",
)
@observer
export default class ReceiptInfoContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      reasonValue: "",
      cancelStatus: false,
      editStatus: false,
      connectionStatus: "Offline",
    };
  }
  componentWillMount() {
    for (let i = 0; i < this.props.printerStore.rows.length; i += 1) {
      if (this.props.printerStore.rows[i].defaultPrinter) {
        this.setState({ connectionStatus: "Connecting..." });
        BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
          .then(() => {
            this.setState({ connection: true });
            this.props.printerStore.setDefaultPrinter({
              _id: this.props.printerStore.rows[i]._id,
              name: this.props.printerStore.rows[i].name,
              macAddress: this.props.printerStore.rows[i].macAddress,
              defaultPrinter: this.props.printerStore.rows[i].defaultPrinter,
            });
            this.setState({ connectionStatus: "Online" });
          })
          .catch(() => {
            this.setState({ connectionStatus: "Connecting..." });
            BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
              .then(() => {
                this.setState({ connection: true });
                this.props.printerStore.setDefaultPrinter({
                  _id: this.props.printerStore.rows[i]._id,
                  name: this.props.printerStore.rows[i].name,
                  macAddress: this.props.printerStore.rows[i].macAddress,
                  defaultPrinter: this.props.printerStore.rows[i]
                    .defaultPrinter,
                });
                this.setState({ connectionStatus: "Online" });
              })
              .catch(() => {
                this.setState({ connectionStatus: "Offline" });
              });
          });
      }
    }
    const { paymentReceipt } = this.props.paymentStore;
    if (paymentReceipt) {
      this.setState({ reasonValue: paymentReceipt.reason });
    }
  }
  onConfirmReprint(values) {
    Alert.alert(
      strings.Reprint, // title
      strings.AreYouSureYouWantToReprintThisReceipt,
      [
        { text: strings.Cancel, style: "cancel" },
        {
          text: strings.OK,
          onPress: () => {
            this.onReprint(values);
          },
        },
      ],
    );
  }
  onReprint(values) {
    let receiptNumber = values.receipt.receiptNumber;
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
    // let receiptCurrent = this.props.receiptStore.defaultReceipt;

    // Let me print first
    BluetoothSerial.isConnected().then(res => {
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
                `${this.props.attendantStore.defaultAttendant.user_name}`,
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
        let labels = "";
        labels =
          labels +
          strings.Items +
          "     " +
          strings.Price +
          "    " +
          strings.Qty +
          "    " +
          strings.Amount;
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${labels}`,
              { align: "left", size: "normal" },
              true,
            ),
          ),
        );
        let totalPurchase = 0.0;
        values.receiptLines.map(val => {
          let finalLines = "";
          const name = val.item;

          if (name.length > 14) {
            let quotientValue = name.length / 14;
            for (
              let quotient = 0;
              quotient < parseInt(quotientValue, 10);
              quotient += 1
            ) {
              let currentCounter = quotient * 14;
              let nameCounter = "";
              for (let n = currentCounter; n < (quotient + 1) * 14; n += 1) {
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

          let priceString = formatNumber(parseFloat(val.price, 10)).toString();
          let qtyString = val.qty.toString();
          let amountString = (
            formatNumber(parseFloat(val.price, 10)) *
            formatNumber(parseFloat(val.qty, 10))
          )
            .toFixed(2)
            .toString();

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
          parseFloat(values.receipt.subtotal, 10),
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
          parseFloat(values.receipt.taxesValue, 10),
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
          parseFloat(values.receipt.discounts, 10),
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
        let total = "";
        total = total + strings.TotalAmount;

        for (
          let totalLength = 0;
          totalLength <
          20 -
            formatNumber(parseInt(totalPurchase, 10).toFixed(2)).toString()
              .length;
          totalLength += 1
        ) {
          total = total + " ";
        }
        total =
          total +
          formatNumber(parseInt(totalPurchase, 10).toFixed(2)).toString();

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
            formatNumber(parseInt(values.amountPaid, 10).toFixed(2)).toString()
              .length;
          cashLength += 1
        ) {
          cash = cash + " ";
        }
        cash =
          cash +
          formatNumber(parseInt(values.amountPaid, 10).toFixed(2)).toString();
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
          parseInt(
            parseInt(values.amountPaid, 10).toFixed(2) -
              parseInt(totalPurchase, 10).toFixed(2),
            10,
          ).toFixed(2),
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
              strings.OfficialReceipt,
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
        writePromises.push(BluetoothSerial.write(TinyPOS.bufferedLine(3)));

        Promise.all(writePromises)
          .then(res2 => {
            // Reset payment amount
            this.setState({
              modalVisible: false,
              paymentAmount: 0,
            });
            Toast.show({
              text: strings.ReprintCompleted,
              duration: 5000,
            });
          })
          .catch(err => {
            this.setState({
              modalVisible: false,
              paymentAmount: 0,
            });
            Toast.show({
              text: err.message,
              buttonText: strings.Okay,
              position: "bottom",
              duration: 5000,
            });
          });
      } else {
        // add to row
        this.setState({
          modalVisible: false,
          paymentAmount: 0,
        });
        Toast.show({
          text: strings.UnableToConnectPrinter,
          buttonText: strings.Okay,
          position: "bottom",
          duration: 6000,
        });
      }
    });
  }

  onReceiptCancel(obj) {
    const { paymentReceipt } = this.props.paymentStore;
    // payment receipt
    if (this.state.reasonValue) {
      paymentReceipt.changeReason(this.state.reasonValue);
      paymentReceipt.cancelled(paymentReceipt);
      this.props.shiftStore.setNewValues(obj);
      if (this.props.printerStore.sync[0].isAutomatic) {
        paymentReceipt.table = "Receipt";
        automatic_sync_background_job(paymentReceipt, this.props, "Edit");
      }
      // Navigate to payment store
      this.props.navigation.navigate("Receipts");
    } else {
      Toast.show({
        text: strings.InputValidReason,
        buttonText: strings.Okay,
        position: "bottom",
        duration: 3000,
        type: "danger",
      });
    }
  }

  onConnectDevice() {
    for (let i = 0; i < this.props.printerStore.rows.length; i += 1) {
      if (this.props.printerStore.rows[i].defaultPrinter) {
        this.setState({ connectionStatus: "Connecting..." });
        BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
          .then(() => {
            this.setState({ connection: true });
            this.props.printerStore.setDefaultPrinter({
              _id: this.props.printerStore.rows[i]._id,
              name: this.props.printerStore.rows[i].name,
              macAddress: this.props.printerStore.rows[i].macAddress,
              defaultPrinter: this.props.printerStore.rows[i].defaultPrinter,
            });
            this.setState({ connectionStatus: "Online" });
          })
          .catch(() => {
            BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
              .then(() => {
                this.setState({ connection: true });
                this.props.printerStore.setDefaultPrinter({
                  _id: this.props.printerStore.rows[i]._id,
                  name: this.props.printerStore.rows[i].name,
                  macAddress: this.props.printerStore.rows[i].macAddress,
                  defaultPrinter: this.props.printerStore.rows[i]
                    .defaultPrinter,
                });
                this.setState({ connectionStatus: "Online" });
              })
              .catch(() => {
                this.setState({ connectionStatus: "Offline" });
              });
          });
      }
    }
  }
  onChangeCancelStatus(text) {
    Alert.alert(
      strings.VoidReceipt, // title
      strings.AreYouSureYouWantToVoidReceipt,
      [
        { text: strings.No, style: "cancel" },
        {
          text: strings.Yes,
          onPress: () => {
            this.setState({ cancelStatus: text });
          },
        },
      ],
    );
  }

  render() {
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <ReceiptInfo
        currency={
          this.props.printerStore.companySettings[0].countryCode
            ? this.props.printerStore.companySettings[0].countryCode
            : ""
        }
        connectDevice={() => this.onConnectDevice()}
        reprintStatus={this.state.connectionStatus}
        onEditReason={text => this.setState({ editStatus: text })}
        editStatus={this.state.editStatus}
        onChangeCancelStatus={text => this.onChangeCancelStatus(text)}
        cancelStatus={this.state.cancelStatus}
        onChangeReason={text => this.setState({ reasonValue: text })}
        reasonValue={this.state.reasonValue}
        paymentStore={this.props.paymentStore}
        navigation={this.props.navigation}
        receipt={this.props.paymentStore.paymentReceipt}
        onReprint={values => this.onConfirmReprint(values)}
        onReceiptCancel={obj => this.onReceiptCancel(obj)}
      />
    );
  }
}
