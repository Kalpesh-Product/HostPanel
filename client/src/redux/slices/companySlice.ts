import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedCompany: null,
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setSelectedCompany: (state, action) => {
      state.selectedCompany = action.payload;
    },
  },
});

export const { setSelectedCompany } = companySlice.actions;
export default companySlice.reducer;
