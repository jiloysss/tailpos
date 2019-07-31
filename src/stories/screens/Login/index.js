import * as React from "react";
import { View, Image } from "react-native";
import { Container, Content, Text, Spinner } from "native-base";

// import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { currentLanguage } from "../../../translations/CurrentLanguage";

import styles from "./styles";

import EmailFormComponent from "@components/EmailFormComponent";
import AnotherWayToLoginComponent from "@components/AnotherWayToLoginComponent";
import CodeInputComponent from "@components/CodeInputComponent";
import translation from "../../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
class Login extends React.Component {
  render() {
    const LoginComponent =
      this.props.values.loginStatus === "idle" ? (
          this.props.values.status === "Pin" ? (
              <EmailFormComponent
                  submitText="Set Pin"
                  onSubmit={() => this.props.onSetPin()}
                  changeStateValues={(status,value)=>this.props.changeStateValues(status,value)}
                  values={this.props.values}
              />
          ) : (
              <AnotherWayToLoginComponent
                  onLogin={this.props.onLogin}
                  changeStateValues={(status,value)=>this.props.changeStateValues(status,value)}
                  values={this.props.values}
                  submitText="Login"
              />
              )
      ) : (
        <Spinner color="white" />
      );
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <Container style={styles.container}>
        <CodeInputComponent
          visible={this.props.values.verificationVisible}
          onVerify={code => this.props.onVerify(code)}
          onResend={() => this.props.onResend()}
          onClose={() => this.props.onCodeInputClose()}
        />
        <Content
          padder
          contentContainerStyle={{ flex: 1, justifyContent: "center" }}
        >
          <View style={{ alignSelf: "center", alignItems: "center" }}>
            <Image
              style={{
                width: 200,
                height: 64,
                opacity: 0.75,
                marginBottom: 30,
              }}
              source={{ uri: "whole_text_logo" }}
            />
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 24,
                color: "#427ec6",
                textAlign: "center",
              }}
            >
                {this.props.values.status === "Pin" ? (
              strings.SetOwnerPin
              ) : (
                strings.Login
                )}
            </Text>
            {LoginComponent}
          </View>
        </Content>
      </Container>
    );
  }
}

export default Login;
