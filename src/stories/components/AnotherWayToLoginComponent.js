import * as React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import {
  Form,
  Item,
  Input,
  Button,
  Text,
  Spinner,
} from "native-base";
import { currentLanguage } from "../../translations/CurrentLanguage";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import translation from "../.././translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
// TODO: styles based from props
const AnotherWayToLogin = props => {
  strings.setLanguage(currentLanguage().companyLanguage);
  return (
    <Form style={{ width: 350 }}>
      {/*<Item*/}
      {/*regular*/}
      {/*// error={props.emailError}*/}
      {/*style={{ backgroundColor: "white" }}*/}
      {/*>*/}
      {/*<Icon active name="key" size={30} />*/}
      {/*<Input*/}
      {/*placeholder="Site Url"*/}
      {/*value={props.values.url}*/}
      {/*onChangeText={text => props.changeStateValues("url", text)}*/}
      {/*/>*/}
      {/*</Item>*/}
      <Item
        regular
        // error={props.emailError}
        style={{ backgroundColor: "white" }}
      >
        <Icon active name="key" size={30} />
        <Input
          placeholder="Activation Key"
          value={props.values.activationKey}
          onChangeText={text => props.changeStateValues("activationKey", text)}
        />
      </Item>
      <Item
        regular
        // error={props.emailError}
        style={{ backgroundColor: "white" }}
      >
        <Icon active name="lock-open" size={30} />
        <Input
          placeholder="Password"
          value={props.values.password}
          onChangeText={text => props.changeStateValues("password", text)}
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
      {props.syncStatus ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Spinner color="red" />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontSize: 20 }}>Syncing...</Text>
          </View>
        </View>
      ) : (
        <View>
          <Button
            block
            onPress={props.onLogin}
            style={{ backgroundColor: "#427ec6" }}
          >
            <Text>{props.submitText}</Text>
          </Button>
          <View style={styles.view}>
            <TouchableOpacity
              onPress={() => props.changeStateValues("status", "Pin")}
            >
              <Text style={styles.text}>Set Owners Pin</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
export default AnotherWayToLogin;
