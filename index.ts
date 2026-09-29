import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

LogBox.ignoreAllLogs(true);

registerRootComponent(App);
