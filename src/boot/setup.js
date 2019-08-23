import * as React from "react";
import { Provider } from "mobx-react/native";
import { StyleProvider } from "native-base";
import Orientation from "react-native-orientation";
import config from "./configureStore";
import BackgroundJob from "react-native-background-job";
import { get_unsynced_records } from "../store/SyncStore/SyncAutomatic";
import App from "../App";
import getTheme from "../theme/components";
import variables from "../theme/variables/platform";
const stores2 = config();
BackgroundJob.cancel({ jobKey: "AutomaticSync" });
BackgroundJob.cancel({ jobKey: "myJob" });
const backgroundJob = {
  jobKey: "SyncUnsyncedRecords",
  job: () => get_unsynced_records(stores2),
};
BackgroundJob.register(backgroundJob);
var backgroundSchedule = {
  jobKey: "SyncUnsyncedRecords",
  period: 1,
  allowExecutionInForeground: true,
  networkType: BackgroundJob.NETWORK_TYPE_UNMETERED,
};
BackgroundJob.schedule(backgroundSchedule);
export default function(stores) {
  return class Setup extends React.Component {
    constructor(props) {
      super(props);
    }
    componentDidMount() {
      Orientation.lockToLandscape();
    }
    render() {
      return (
        <StyleProvider style={getTheme(variables)}>
          <Provider {...stores}>
            <App />
          </Provider>
        </StyleProvider>
      );
    }
  };
}
