import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { signOut } from './authSlice';

interface ActaState {
  actasListasParaConfirmar: string[];
}

const initialState: ActaState = {
  actasListasParaConfirmar: [],
};

const actaSlice = createSlice({
  name: 'actas',
  initialState,
  reducers: {
    avisarActaLista(state, action: PayloadAction<string>) {
      if (!state.actasListasParaConfirmar.includes(action.payload)) {
        state.actasListasParaConfirmar.push(action.payload);
      }
    },
    descartarAvisoActa(state, action: PayloadAction<string>) {
      state.actasListasParaConfirmar =
        state.actasListasParaConfirmar.filter((id) => id !== action.payload);
    },
  },
  extraReducers(builder) {
    builder.addCase(signOut.fulfilled, () => initialState);
  },
});

export const { avisarActaLista, descartarAvisoActa } = actaSlice.actions;
export const actaReducer = actaSlice.reducer;
