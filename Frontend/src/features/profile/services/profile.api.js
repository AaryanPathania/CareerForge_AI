import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
})


/**
 * @description Service to update the logged in user's username and/or email.
 * Resolves with { message, user: { id, username, email } }.
 */
export const updateProfile = async ({ username, email }) => {
    const response = await api.put("/api/users/me", { username, email })

    return response.data
}


/**
 * @description Service to change the logged in user's password (keeps the current session).
 */
export const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    const response = await api.put("/api/users/me/password", { currentPassword, newPassword, confirmPassword })

    return response.data
}
