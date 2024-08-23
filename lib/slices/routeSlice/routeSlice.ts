import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface RouteState {
  currentRoute: string;
}

const initialState: RouteState = {
  currentRoute: "",
};

const RouteSlice = createSlice({
  name: "route",
  initialState,
  reducers: {
    changeRoute(state, action: PayloadAction<string>) {
      state.currentRoute = action.payload;
    },
  },
});

export const { changeRoute } = RouteSlice.actions;
export default RouteSlice.reducer;
