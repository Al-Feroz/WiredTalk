import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TabState {
  currentTab: string;
}

const initialState: TabState = {
  currentTab: "Chat",
};

const TabSlice = createSlice({
  name: "tab",
  initialState,
  reducers: {
    changeTab(state, action: PayloadAction<string>) {
      state.currentTab = action.payload;
    },
  },
});

export const { changeTab } = TabSlice.actions;
export default TabSlice.reducer;
