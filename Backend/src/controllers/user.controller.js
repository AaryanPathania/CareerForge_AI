
const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

// Validate a basic email format.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Escape special characters before using a value in a regular expression.
const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Return public user details without exposing the password hash.
const publicUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email
});

/**
 * Update the logged-in user's username and/or email.
 * Requires authentication middleware.
 */
async function updateProfileController(req, res) {
    const user = await userModel.findById(req.user.id);

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    const { username, email } = req.body || {};

    if (
        (username !== undefined && typeof username !== "string") ||
        (email !== undefined && typeof email !== "string")
    ) {
        return res.status(400).json({
            message: "Invalid data provided."
        });
    }

    const newUsername =
        username === undefined ? user.username : username.trim();

    const newEmail =
        email === undefined ? user.email : email.trim();

    const usernameChanged = newUsername !== user.username;
    const emailChanged = newEmail !== user.email;

    if (usernameChanged) {
        if (
            newUsername.length < USERNAME_MIN ||
            newUsername.length > USERNAME_MAX
        ) {
            return res.status(400).json({
                message: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters long.`
            });
        }
    }

    if (emailChanged) {
        if (
            !newEmail ||
            newEmail.length > EMAIL_MAX ||
            !EMAIL_PATTERN.test(newEmail)
        ) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }
    }

    if (!usernameChanged && !emailChanged) {
        return res.status(200).json({
            message: "No changes to save.",
            user: publicUser(user)
        });
    }

    // Check whether another account uses the requested username.
    if (usernameChanged) {
        const taken = await userModel.findOne({
            _id: { $ne: user._id },
            username: new RegExp(`^${escapeRegex(newUsername)}$`, "i")
        });

        if (taken) {
            return res.status(400).json({
                message: "That username is already taken."
            });
        }
    }

    // Check whether another account uses the requested email.
    if (emailChanged) {
        const taken = await userModel.findOne({
            _id: { $ne: user._id },
            email: new RegExp(`^${escapeRegex(newEmail)}$`, "i")
        });

        if (taken) {
            return res.status(400).json({
                message: "An account already exists with this email address."
            });
        }
    }

    user.username = newUsername;
    user.email = newEmail;

    try {
        await user.save();
    } catch (err) {
        // Handle duplicate-key errors from MongoDB indexes.
        if (err && err.code === 11000) {
            const field =
                err.keyPattern && err.keyPattern.email
                    ? "email address"
                    : "username";

            return res.status(400).json({
                message: `That ${field} is already in use.`
            });
        }

        throw err;
    }

    return res.status(200).json({
        message: "Profile updated successfully.",
        user: publicUser(user)
    });
}

/**
 * Change the logged-in user's password.
 * Requires the current password.
 */
async function changePasswordController(req, res) {
    const { currentPassword, newPassword, confirmPassword } =
        req.body || {};

    if (
        typeof currentPassword !== "string" ||
        !currentPassword ||
        typeof newPassword !== "string" ||
        !newPassword ||
        typeof confirmPassword !== "string" ||
        !confirmPassword
    ) {
        return res.status(400).json({
            message:
                "Please provide your current password, a new password and its confirmation."
        });
    }

    if (
        newPassword.length < PASSWORD_MIN ||
        newPassword.length > PASSWORD_MAX
    ) {
        return res.status(400).json({
            message: `New password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters long.`
        });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({
            message: "New password and confirmation do not match."
        });
    }

    const user = await userModel.findById(req.user.id);

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    const isCurrentValid = await bcrypt.compare(
        currentPassword,
        user.password
    );

    if (!isCurrentValid) {
        return res.status(400).json({
            message: "Current password is incorrect."
        });
    }

    const isSameAsCurrent = await bcrypt.compare(
        newPassword,
        user.password
    );

    if (isSameAsCurrent) {
        return res.status(400).json({
            message:
                "New password must be different from your current password."
        });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
        message: "Password changed successfully."
    });
}

module.exports = {
    updateProfileController,
    changePasswordController
};
