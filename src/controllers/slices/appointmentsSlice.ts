import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Appointment } from '../../models';
import { fetchAppointments, createAppointment } from '../apiThunks';

interface AppointmentsState {
    appointments: Appointment[];
    isLoading: boolean;
    error: string | null;
}

const initialState: AppointmentsState = {
    appointments: [],
    isLoading: false,
    error: null,
};

export const appointmentsSlice = createSlice({
    name: 'appointments',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAppointments.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAppointments.fulfilled, (state, action: PayloadAction<Appointment[]>) => {
                state.isLoading = false;
                state.appointments = action.payload;
            })
            .addCase(fetchAppointments.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(createAppointment.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createAppointment.fulfilled, (state) => {
                state.isLoading = false;
                // If backend does not return the created item correctly, the fetchAppointments dispatch will still catch it.
                // We could also do state.appointments.push(action.payload) if we know the shape.
            })
            .addCase(createAppointment.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export default appointmentsSlice.reducer;
