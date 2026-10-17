const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")

const USERNAME_MIN = 3
const USERNAME_MAX = 30
const EMAIL_MAX = 254
const PASSWORD_MIN = 6
const PASSWORD_MAX = 72 // bcrypt only uses the first 72 bytes

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Same shape the auth controller returns, so the frontend AuthContext can use it as-is.
// The password hash is never included.
const publicUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email
})

/**
 * @name updateProfileController
 * @description update the logged in user's username and/or email.
 * @access private
 *
 * Email note: login looks the user up with an exact `findOne({ email })`, and register
 * stores the email exactly as typed. To keep login working, the email is only trimmed here
 * (never lowercased); uniqueness is still checked case-insensitively so two accounts can't
 * differ only by letter case.
 */
async function updateProfileController(req, res) {
    const user = await userModel.findById(req.user.id)

    if (!user) {
        return res.status(404).json({ message: "User not found." })
    }

    const { username, email } = req.body || {}

    if ((username !== undefined && typeof username !== "string") ||
        (email !== undefined && typeof email !== "string")) {
        return res.status(400).json({ message: "Invalid data provided." })
    }

    const newUsername = username === undefined ? user.username : username.trim()
    const newEmail = email === undefined ? user.email : email.trim()

    const usernameChanged = newUsername !== user.username
    const emailChanged = newEmail !== user.email

    // Only validate what actually changed, so older accounts whose saved values
    // predate these rules can still edit the other field.
    if (usernameChanged) {
        if (newUsername.length < USERNAME_MIN || newUsername.length > USERNAME_MAX) {
            return res.status(400).json({
                message: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters long.`
            })
        }
    }

    if (emailChanged) {
        if (!newEmail || newEmail.length > EMAIL_MAX || !EMAIL_PATTERN.test(newEmail)) {
            return res.status(400).json({ message: "Please enter a valid email address." })
        }
    }

    if (!usernameChanged && !emailChanged) {
        return res.status(200).json({
            message: "No changes to save.",
            user: publicUser(user)
        })
    }

    // Duplicate checks against every OTHER account (case-insensitive).
    if (usernameChanged) {
        const taken = await userModel.findOne({
            _id: { $ne: user._id },
            username: new RegExp(`^${escapeRegex(newUsername)}$`, "i")
        })

        if (taken) {
            return res.status(400).json({ message: "That username is already taken." })
        }
    }

    if (emailChanged) {
        const taken = await userModel.findOne({
            _id: { $ne: user._id },
            email: new RegExp(`^${escapeRegex(newEmail)}$`, "i")
        })

        if (taken) {
            return res.status(400).json({ message: "An account already exists with this email address." })
        }
    }

    user.username = newUsername
    user.email = newEmail

    try {
        await user.save()
    } catch (err) {
        // Two requests racing past the checks above are still stopped by the unique indexes.
        if (err && err.code === 11000) {
            const field = err.keyPattern && err.keyPattern.email ? "email address" : "username"
            return res.status(400).json({ message: `That ${field} is already in use.` })
        }
        throw err
    }

    res.status(200).json({
        message: "Profile updated successfully.",
        user: publicUser(user)
    })
}


/**
 * @name changePasswordController
 * @description change the logged in user's password. Requires the current password.
 * The existing JWT cookie is left untouched, so the user stays logged in.
 * @access private
 */
async function changePasswordController(req, res) {
    const { currentPassword, newPassword, confirmPassword } = req.body || {}

    if (typeof currentPassword !== "string" || !currentPassword ||
        typeof newPassword !== "string" || !newPassword ||
        typeof confirmPassword !== "string" || !confirmPassword) {
        return res.status(400).json({
            message: "Please provide your current password, a new password and its confirmation."
        })
    }

    if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
        return res.status(400).json({
            message: `New password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters long.`
        })
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New password and confirmation do not match." })
    }

    const user = await userModel.findById(req.user.id)

    if (!user) {
        return res.status(404).json({ message: "User not found." })
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password)

    if (!isCurrentValid) {
        return res.status(400).json({ message: "Current password is incorrect." })
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password)

    if (isSameAsCurrent) {
        return res.status(400).json({ message: "New password must be different from your current password." })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.status(200).json({ message: "Password changed successfully." })
}


module.exports = {
    updateProfileController,
    changePasswordController
}
