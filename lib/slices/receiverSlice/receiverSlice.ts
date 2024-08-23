import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ReceiverState {
  _id: string;
  name: string;
  email: string;
  image: string;
  headline: string;
  connectionId: string;
}

const initialState: ReceiverState = {
  _id: "",
  name: "",
  image: "",
  email: "",
  headline: "",
  connectionId: "",
};

const ReceiverSlice = createSlice({
  name: "receiver",
  initialState,
  reducers: {
    changeReceiver(
      state,
      action: PayloadAction<{
        _id: string;
        name: string;
        email: string;
        image: string;
        headline: string;
        connectionId: string;
      }>
    ) {
      state._id = action.payload._id;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.image = action.payload.image;
      state.headline = action.payload.headline;
      state.connectionId = action.payload.connectionId;
    },
  },
});

export const { changeReceiver } = ReceiverSlice.actions;
export default ReceiverSlice.reducer;
