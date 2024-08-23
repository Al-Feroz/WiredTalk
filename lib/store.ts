import ReceiverReducer from "./slices/receiverSlice/receiverSlice";
import RouteReducer from "./slices/routeSlice/routeSlice";
import TabReducer from "./slices/tabSlice/tabSlice";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    receiver: ReceiverReducer,
    route: RouteReducer,
    tab: TabReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
