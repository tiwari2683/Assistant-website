import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Patient } from '../../models';
import { fetchPatients, fetchWaitingRoom } from '../apiThunks';

interface PatientsState {
    patients: Patient[];
    waitingRoom: Patient[];
    isLoading: boolean;
    error: string | null;
}

const initialState: PatientsState = {
    patients: [],
    waitingRoom: [],
    isLoading: false,
    error: null,
};

const patientsSlice = createSlice({
    name: 'patients',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPatients.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchPatients.fulfilled, (state, action: PayloadAction<Patient[]>) => {
                state.isLoading = false;
                state.patients = action.payload;
            })
            .addCase(fetchPatients.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchWaitingRoom.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchWaitingRoom.fulfilled, (state, action: PayloadAction<Patient[]>) => {
                state.isLoading = false;
                state.waitingRoom = action.payload;
            })
            .addCase(fetchWaitingRoom.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export default patientsSlice.reducer;
