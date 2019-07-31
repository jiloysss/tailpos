import * as React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Form, Item, Input, Button, Text, View } from "native-base";
import { currentLanguage } from "../../translations/CurrentLanguage";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import translation from "../.././translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
// TODO: styles based from props
const EmailFormComponent = props => {
  strings.setLanguage(currentLanguage().companyLanguage);

  return (
    <Form style={{ width: 350 }}>
      <Item
        regular
        error={props.emailError}
        style={{ backgroundColor: "white" }}
      >
        <Icon active name="account" size={30} />
        <Input
          placeholder={strings.Name}
          value={props.values.userName}
          onChangeText={text => props.changeStateValues("userName", text)}
        />
      </Item>
      <Item
        regular
        error={props.emailError}
        style={{ backgroundColor: "white" }}
      >
        <Icon active name="lock-open" size={30} />
        <Input
          keyboardType="numeric"
          placeholder={strings.Pin}
          value={props.values.pin}
          onChangeText={text => props.changeStateValues("pin", text)}
          secureTextEntry={props.values.securityPinStatus}
        />
        <Icon
          active
          name={props.values.securityPinStatus ? "eye-off" : "eye"}
          size={30}
          onPress={() =>
            props.changeStateValues(
              "securityPinStatus",
              !props.values.securityPinStatus,
            )
          }
        />
      </Item>
      <Item
        regular
        error={props.passwordError}
        style={{ backgroundColor: "white" }}
      >
        <Icon active name="lock-open" size={30} />
        <Input
          placeholder={strings.ConfirmPin}
          value={props.values.confirmPin}
          onChangeText={text => props.changeStateValues("confirmPin", text)}
          keyboardType="numeric"
          secureTextEntry={props.values.securityConfirmPinStatus}
        />
        <Icon
          active
          name={props.values.securityConfirmPinStatus ? "eye-off" : "eye"}
          size={30}
          onPress={() =>
            props.changeStateValues(
              "securityConfirmPinStatus",
              !props.values.securityConfirmPinStatus,
            )
          }
        />
      </Item>
      <Button
        block
        onPress={() => props.onSubmit()}
        style={{ backgroundColor: "#427ec6" }}
      >
        <Text>{props.submitText}</Text>
      </Button>
      <View style={styles.view}>
        <TouchableOpacity
          onPress={() => props.changeStateValues("status", "Activation")}
        >
          <Text style={styles.text}>Another Way to Login</Text>
        </TouchableOpacity>
      </View>
    </Form>
  );
};

const styles = StyleSheet.create({
  view: {
    height: 50,
    width: 350,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "blue",
  },
});
export default EmailFormComponent;
