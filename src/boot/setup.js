import * as React from "react";
import { Provider } from "mobx-react/native";
import { StyleProvider } from "native-base";
import Orientation from "react-native-orientation";

import App from "../App";
import getTheme from "../theme/components";
import variables from "../theme/variables/platform";



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
