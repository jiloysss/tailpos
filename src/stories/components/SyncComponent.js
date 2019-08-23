import * as React from "react";
import { Dimensions, View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Button, Card, CardItem, Spinner } from "native-base";
import { Col, Grid } from "react-native-easy-grid";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { currentLanguage } from "../../translations/CurrentLanguage";

// Easy life
import EditInput from "./EditInputComponent";
import EditCheckBox from "./EditCheckBoxComponent";
import translation from "../.././translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
class CompanyComponent extends React.PureComponent {
  onSync = () => this.props.sync("sync");
  onForceSync = () => this.props.sync("forceSync");
  onSyncEdit = () => this.props.onSyncEdit(true);

  renderSyncButtons() {
    const { isErpnext } = this.props;

    let component = null;

    // if (url && user_name && password) {
    component = (
      <View style={styles.view}>
        <Button
          block
          style={{ width: isErpnext ? "35%" : "50%" }}
          onPress={this.onSync}
        >
          <Text style={{ flexWrap: "wrap", textAlign: "center" }}>
            {strings.Sync}
          </Text>
        </Button>
        {isErpnext ? (
          <Button
            block
            style={{ marginLeft: 10, width: "35%" }}
            onPress={this.onForceSync}
          >
            <Text style={{ flexWrap: "wrap", textAlign: "center" }}>
              {strings.ForceSync}
            </Text>
          </Button>
        ) : null}
      </View>
    );
    // }
    return component;
  }

  render() {
    const {
      url,
      user_name,
      password,
      syncEditStatus,
      onSyncSave,
      changeUrl,
      changeUserName,
      changePassword,
      isSyncing,
      isHttps,
      toggleIsHttps,
      setDeviceId,
      deviceId,
      toggleAutomatic,
      isAutomatic,
      isErpnext,
      toggleErpnext,
      deviceLastSynced,
    } = this.props;
    strings.setLanguage(currentLanguage().companyLanguage);

    const SyncStatus = isSyncing ? (
      <View style={styles.viewSync}>
        <Spinner color="#4B4C9D" />
        <Text style={styles.helpText}>{strings.SyncingErpnextData}</Text>
      </View>
    ) : null;

    return (
      <View>
        <Card style={styles.card}>
          <CardItem style={styles.cardItem}>
            <Grid>
              <Col style={styles.col}>
                <Text style={styles.textHeader}>{strings.SyncSettings}</Text>
              </Col>
              <Col>
                <View style={styles.viewRight}>
                  <TouchableOpacity onPress={this.onSyncEdit}>
                    <Icon name="pencil" size={30} style={styles.icon} />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Icon
                      name="content-save"
                      size={30}
                      style={styles.icon}
                      onPress={onSyncSave}
                    />
                  </TouchableOpacity>
                </View>
              </Col>
            </Grid>
          </CardItem>
          {SyncStatus}

          <EditInput
            secure={false}
            value={url}
            disabled={!syncEditStatus}
            onChange={changeUrl}
            placeholder="erpnext.com"
            label={strings.Server}
          />

          <EditCheckBox
            label="Is HTTPs"
            automaticLabel="Automatic Sync"
            erpnextLabel="is ERPNext"
            checked={isHttps}
            automaticChecked={isAutomatic}
            isErpnext={isErpnext}
            onPress={toggleIsHttps}
            onPressAutomatic={toggleAutomatic}
            onPressErpnext={toggleErpnext}
            disabled={!syncEditStatus}
          />
          <EditInput
            secure={false}
            value={user_name}
            disabled={!syncEditStatus}
            onChange={changeUserName}
            placeholder="Administrator"
            label={strings.Username}
          />
          <EditInput
            secure={true}
            value={password}
            disabled={!syncEditStatus}
            onChange={changePassword}
            placeholder={strings.Password}
            label={strings.Password}
          />
          <EditInput
            secure={false}
            value={deviceId}
            disabled={!syncEditStatus}
            onChange={setDeviceId}
            placeholder="xxxxxxxx"
            label={strings.DeviceID}
          />
          <EditInput
            disabled={true}
            value={deviceLastSynced}
            label="Device Last Synced"
          />
          <CardItem>{this.renderSyncButtons()}</CardItem>
        </Card>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    alignSelf: "center",
  },
  cardItem: {
    marginBottom: 15,
    backgroundColor: "#4b4c9d",
  },
  col: {
    alignSelf: "center",
  },
  textHeader: {
    color: "white",
    fontSize: Dimensions.get("window").width * 0.02,
  },
  icon: {
    color: "white",
    marginLeft: 10,
  },
  view: {
    flexDirection: "row",
  },
  lastButton: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  viewRight: {
    flexDirection: "row",
    alignSelf: "flex-end",
  },
  viewSync: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  helpText: {
    marginLeft: 10,
  },
});

export default CompanyComponent;
