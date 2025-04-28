import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: null,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUserDetails: (state, action) => {
            const { email, accessToken } = action.payload;
            state.user = { email, accessToken };
            localStorage.setItem("user", JSON.stringify(state.user));
            console.log("User details set in Redux: ", state.user);
        },
        clearUserDetails: (state) => {
            state.user = null;
            localStorage.removeItem("user");
        },
    },
});

export const { setUserDetails, clearUserDetails } = userSlice.actions;
export default userSlice.reducer;