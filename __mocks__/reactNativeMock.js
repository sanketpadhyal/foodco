const React = require('react');

const MockComponent = ({ children, ...props }) => React.createElement('div', props, children);

class AnimatedValue {
  constructor(val) { this._value = val; }
  setValue(val) { this._value = val; }
  interpolate() { return this; }
}

module.exports = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default || obj.android || Object.values(obj)[0],
  },
  StyleSheet: {
    create: (styles) => styles,
    absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
  },
  Animated: {
    Value: AnimatedValue,
    timing: () => ({ start: (cb) => cb && cb({ finished: true }) }),
    parallel: (anims) => ({ start: (cb) => cb && cb({ finished: true }) }),
    sequence: (anims) => ({ start: (cb) => cb && cb({ finished: true }) }),
    spring: () => ({ start: (cb) => cb && cb({ finished: true }) }),
    View: MockComponent,
    Text: MockComponent,
    Image: MockComponent,
    ScrollView: MockComponent,
  },
  Easing: {
    out: (fn) => fn,
    in: (fn) => fn,
    inOut: (fn) => fn,
    quad: (t) => t,
    cubic: (t) => t,
    ease: (t) => t,
  },
  View: MockComponent,
  Text: MockComponent,
  TouchableOpacity: MockComponent,
  TouchableHighlight: MockComponent,
  TouchableWithoutFeedback: MockComponent,
  Pressable: MockComponent,
  Image: MockComponent,
  ScrollView: MockComponent,
  FlatList: MockComponent,
  SectionList: MockComponent,
  TextInput: MockComponent,
  Modal: MockComponent,
  ActivityIndicator: MockComponent,
  StatusBar: {
    currentHeight: 24,
    setBarStyle: () => {},
    setBackgroundColor: () => {},
    setTranslucent: () => {},
  },
  BackHandler: {
    addEventListener: () => ({ remove: () => {} }),
    removeEventListener: () => {},
  },
  InteractionManager: {
    runAfterInteractions: (cb) => {
      if (typeof cb === 'function') cb();
      return { cancel: () => {} };
    },
  },
  Linking: {
    openURL: () => Promise.resolve(),
    canOpenURL: () => Promise.resolve(true),
  },
  Share: {
    share: () => Promise.resolve({ action: 'sharedAction' }),
  },
};
