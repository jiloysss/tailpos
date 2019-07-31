import * as React from "react";
import { observer, inject } from "mobx-react/native";
import { Toast } from "native-base";
import SplashScreen from "react-native-splash-screen";
import { currentLanguage } from "../../translations/CurrentLanguage";
import { fetch_data_via_activation_key } from "../../store/SyncStore/ActivationKeySync";

import Login from "@screens/Login";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
@inject(
  "loginForm",
  "tokenStore",
  "itemStore",
  "categoryStore",
  "discountStore",
  "shiftStore",
  "attendantStore",
  "receiptStore",
  "paymentStore",
  "roleStore",
)
@observer
export default class LoginContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loginStatus: "idle",
      verificationVisible: false,
      pin: "",
      confirmPin: "",
      securityPinStatus: true,
      securityConfirmPinStatus: true,
      userName: "",
      status: "Pin",
      activationKey: "",
      password: "",
      url: "",
    };
  }

  componentWillMount() {
    // because log-out
    const isLogout = this.props.navigation.getParam("isLogout", false);

    // if logging out
    if (isLogout) {
      // token stores parin
      const { currentToken } = this.props.tokenStore;

      // remove current session
      currentToken.delete();

      // item, category, discounts
      this.props.itemStore.destroyDb();
      this.props.shiftStore.destroyDb();
      this.props.paymentStore.destroyDb();
      this.props.receiptStore.destroyDb();
      this.props.categoryStore.destroyDb();
      this.props.discountStore.destroyDb();
      this.props.attendantStore.destroyDb();
    } else {
      // getting the current token

      this.props.tokenStore.getCurrentToken().then(result => {
        // if naay session
        if (result !== null) {
          this.props.navigation.navigate("Loading", { isLogin: true });
        }
      });
    }
  }

  componentDidMount() {
    // hide the splash screen
    SplashScreen.hide();
  }

  onSetPin() {
    if (this.state.userName) {
      if (this.state.pin.length === 4) {
        if (this.state.pin === this.state.confirmPin) {
          this.props.attendantStore.add({
            user_name: this.state.userName,
            pin_code: this.state.pin,
            role: "Owner",
            canLogin: true,
            dateUpdated: Date.now(),
            syncStatus: false,
          });
          this.props.roleStore.add({
            role: "Owner",
          });
          this.props.navigation.navigate("Loading");
        } else {
          Toast.show({
            text: strings.PinCodeDoesNotMatch,
            buttonText: strings.Okay,
            type: "danger",
            duration: 5000,
          });
        }
      } else {
        Toast.show({
          text: strings.PinMustBeExactly4Characters,
          buttonText: strings.Okay,
          type: "danger",
          duration: 5000,
        });
      }
    } else {
      Toast.show({
        text: strings.EnterValidName,
        buttonText: strings.Okay,
        type: "danger",
        duration: 5000,
      });
    }
  }

  onCodeInputClose() {
    this.changeStateValues("verificationVisible", false);
  }

  registered() {
    this.props.loginForm.registered();
  }

  changeStateValues = (key, value) => {
    this.setState(this.changeValue(key, value));
  };
  changeValue = (key, value) => {
    return {
      [key]: value,
    };
  };
  onLogin = async () => {
    await fetch_data_via_activation_key(this.state);
  };
  render() {
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <Login
        values={this.state}
        onLogin={this.onLogin}
        onSetPin={() => this.onSetPin()}
        onVerify={code => this.onVerify(code)}
        onResend={() => this.onResend()}
        onCodeInputClose={() => this.onCodeInputClose()}
        changeStateValues={(key, value) => this.changeStateValues(key, value)}
      />
    );
  }
}
