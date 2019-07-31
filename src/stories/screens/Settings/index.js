import * as React from "react";
import { Dimensions, TouchableOpacity, View, StyleSheet } from "react-native";
import {
  Container,
  Header,
  Title,
  Left,
  Body,
  Right,
  Content,
  Text,
  Card,
  List,
  ListItem,
  Spinner,
} from "native-base";

import Icon from "react-native-vector-icons/FontAwesome";
import { currentLanguage } from "../../../translations/CurrentLanguage";

import CompanySettings from "@components/CompanyComponent";
import PrinterSettings from "@components/PrinterSettingsComponent";
import BluetoothScanner from "../../components/BluetoothScannerComponent";
import AddAttendant from "../../components/AddAttendantComponent";
import Sync from "../../components/SyncComponent";
import Queue from "../../components/QueueComponent";

import { Grid, Col } from "react-native-easy-grid";
import translation from "../../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
class Settings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      devices: [],
      checkBoxValue: 0,
      checkBoxBluetoothValue: "disable",
      pressedTab: strings.Bluetooth,
    };
    this.onLayout = this.onLayout.bind(this);
  }

  navigate = () => this.props.navigation.navigate("DrawerOpen");

  onLayout() {
    const { width, height } = Dimensions.get("window");

    this.setState({ midComponentWidth: width * 0.5406 });
    this.setState({ rightComponentWidth: width * 0.3906 });
    this.setState({ leftComponentWidth: width * 0.0688 });
    this.setState({ screenHeight: height });
  }

  renderRow = item => {
    const SelectedIcon =
      this.state.pressedTab === item.name ? (
        <Icon size={20} name="chevron-right" style={styles.listItemIcon} />
      ) : null;

    return (
      <ListItem
        style={styles.listItem}
        onPress={() => {
          this.props.changeReturnValue(item.name);
          this.setState({
            pressedTab: item.name,
          });
        }}
      >
        <Text>{item.name}</Text>
        {SelectedIcon}
      </ListItem>
    );
  };

  renderMenu = () => {
    const {
      // PrinterStatus
      currentAddress,
      connectionStatus,
      connected,
      connectDevice,
      checkBoxValue,
      checkBoxValueOnChange,
      availableDevices,
      availableDevicesChangeValue,
      printerStore,
      printers,
      addDevice,
      addedDevice,
      removeDevice,

      // Bluetooth Scanner
      values,
      bluetoothScannerStatus,

      // CompanySettings
      changeName,
      changeTax,
      changeHeader,
      changeFooter,
      changeCountry,
      onCompanySave,
      companyCountry,

      // Sync
      syncAll,
      onSyncEdit,
      onSyncSave,
      changeUrl,
      changeUserName,
      changePassword,
      syncEditStatus,
      url,
      user_name,
      password,
      isHttps,
      toggleHttps,

      // Attendant
      attendant,
      onDeleteAttendant,
      onClickAttendant,
      attendantsData,
      attendantsInfo,
      attendantForm,
      onChangeRoleStatus,
      roleStatus,
      rolesData,
      onAddRoles,
      onDeleteRoles,
      onClickRole,
      selectedRole,

      // Queue
      queueHost,
      setQueueHost,
      hasTailOrder,
      toggleTailOrder,
      onQueueSave,
      isEditingQueue,
      setQueueEditing,
      setQueueNotEditing,
      useDescription,
      toggleUseDescription,
      useDefaultCustomer,
      toggleUseDefaultCustomer,
      isStackItem,
      toggleIsStackItem,

      // Sync
      isSyncing,
      setDeviceId,
      deviceId,

      // navigation
      navigation,

      changeLanguage,
      companyLanguage,
      changeEditStatus,
      editStatus,
        isAutomatic,
        toggleAutomatic
    } = this.props;

    if (this.props.returnValue === strings.Bluetooth) {
      return (
        <View>
          <PrinterSettings
            navigation={navigation}
            printers={printers}
            addDevice={addDevice}
            connected={connected}
            addedDevice={addedDevice}
            removeDevice={removeDevice}
            printerStore={printerStore}
            connectDevice={connectDevice}
            checkBoxValue={checkBoxValue}
            currentAddress={currentAddress}
            connectionStatus={connectionStatus}
            availableDevices={availableDevices}
            checkBoxValueOnChange={checkBoxValueOnChange}
            availableDevicesChangeValue={availableDevicesChangeValue}
          />
          <BluetoothScanner
            value={values}
            onCheckBoxValueChange={bluetoothScannerStatus}
          />
        </View>
      );
    }
    if (this.props.returnValue === "Merchant") {
      return this.props.loading ? (
        <Spinner color="#427ec6" />
      ) : (
        <CompanySettings
          values={values}
          changeName={changeName}
          changeTax={changeTax}
          changeHeader={changeHeader}
          changeFooter={changeFooter}
          changeCountry={changeCountry}
          changeLanguage={changeLanguage}
          companyCountry={companyCountry}
          companyLanguage={companyLanguage}
          editStatus={editStatus}
          onCompanyEdit={changeEditStatus}
          onCompanySave={() => {
            changeEditStatus(false);
            onCompanySave();
          }}
        />
      );
    }

    if (this.props.returnValue === strings.Sync) {
      return (
        <Sync
          sync={syncAll}
          onSyncEdit={onSyncEdit}
          onSyncSave={onSyncSave}
          changeUrl={changeUrl}
          isSyncing={isSyncing}
          changeUserName={changeUserName}
          changePassword={changePassword}
          syncEditStatus={syncEditStatus}
          url={url}
          user_name={user_name}
          password={password}
          isHttps={isHttps}
          isAutomatic={isAutomatic}
          toggleIsHttps={toggleHttps}
          toggleAutomatic={toggleAutomatic}
          deviceId={deviceId}
          setDeviceId={setDeviceId}
        />
      );
    }

    if (this.props.returnValue === "Employees") {
      if (attendant && attendant.role === "Owner") {
        return (
          <AddAttendant
            onDeleteAttendant={onDeleteAttendant}
            onClickAttendant={onClickAttendant}
            attendantsData={attendantsData}
            attendantsInfo={attendantsInfo}
            onSave={attendantForm}
            onEdit={attendantForm}
            onChangeRoleStatus={onChangeRoleStatus}
            roleStatus={roleStatus}
            rolesData={rolesData}
            onAddRoles={onAddRoles}
            onDeleteRoles={onDeleteRoles}
            onClickRole={onClickRole}
            selectedRole={selectedRole}
          />
        );
      }
    }

    if (this.props.returnValue === strings.Queueing) {
      return (
        <Queue
          queueHost={queueHost}
          onQueueSave={onQueueSave}
          hasTailOrder={hasTailOrder}
          setQueueHost={setQueueHost}
          isEditingQueue={isEditingQueue}
          toggleTailOrder={toggleTailOrder}
          setQueueEditing={setQueueEditing}
          setQueueNotEditing={setQueueNotEditing}
          useDescription={useDescription}
          toggleUseDescription={toggleUseDescription}
          useDefaultCustomer={useDefaultCustomer}
          toggleUseDefaultCustomer={toggleUseDefaultCustomer}
          isStackItem={isStackItem}
          toggleIsStackItem={toggleIsStackItem}
        />
      );
    }

    return null;
  };

  render() {
    let menuItems = [
      { name: strings.Bluetooth },
      { name: strings.Company },
      { name: strings.Sync },
    ];
    if (this.props.attendant && this.props.attendant.role === "Owner") {
      menuItems = [
        { name: strings.Bluetooth },
        { name: "Merchant" },
        { name: "Employees" },
        { name: strings.Sync },
        { name: strings.Queueing },
      ];
    }
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <Container>
        <Header style={styles.header}>
          <Left>
            <TouchableOpacity onPress={this.navigate}>
              <Icon name="bars" size={25} color="white" style={styles.icon} />
            </TouchableOpacity>
          </Left>
          <Body style={styles.headerBody}>
            <Title>{strings.Settings}</Title>
          </Body>
          <Right>
            <TouchableOpacity onPress={() => this.props.restoreDefault()}>
              <Title>{strings.RestoreDefault}</Title>
            </TouchableOpacity>
          </Right>
        </Header>
        <Grid>
          <Col size={30}>
            <Card transparent style={styles.card}>
              <List dataArray={menuItems} renderRow={this.renderRow} />
            </Card>
          </Col>
          <Col size={70}>
            <Content padder>{this.renderMenu()}</Content>
          </Col>
        </Grid>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#4b4c9d",
  },
  icon: {
    paddingLeft: 5,
  },
  headerBody: {
    flex: 3,
  },
  view: {
    flexDirection: "row",
  },
  card: {
    flex: 1,
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
    borderRadius: 0,
    flexDirection: "row",
  },
  listItem: {
    justifyContent: "space-between",
  },
  listItemIcon: {
    color: "gray",
    alignSelf: "flex-end",
  },
});

export default Settings;
