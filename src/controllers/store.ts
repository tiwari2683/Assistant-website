import { configureStore } from '@reduxjs/toolkit';
import patientVisitReducer from './slices/patientVisitSlice';
import authReducer from './slices/authSlice';

import patientsReducer from './slices/patientsSlice';
import appointmentsReducer from './slices/appointmentsSlice';

export const store = configureStore({
    reducer: {
        patientVisit: patientVisitReducer,
        auth: authReducer,
        patients: patientsReducer,
        appointments: appointmentsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
