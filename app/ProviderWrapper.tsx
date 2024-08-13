'use client';

import { Provider } from 'react-redux';
import { ReactNode } from 'react';
import store from '../lib/store';

const ProviderWrapper = ({ children }: { children: ReactNode }) => {
  return <Provider store={store}>{children}</Provider>;
};

export default ProviderWrapper;
