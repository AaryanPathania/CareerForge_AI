const { Router } = require("express")
const userController = require("../controllers/user.controller")
const authMiddleware = require("../middlewares/auth.middleware")

const userRouter = Router()

/**
 * @route PUT /api/users/me
 * @description update the logged in user's username and/or email
 * @access private
 */
userRouter.put("/me", authMiddleware.authUser, userController.updateProfileController)


/**
 * @route PUT /api/users/me/password
 * @description change the logged in user's password (requires the current password)
 * @access private
 */
userRouter.put("/me/password", authMiddleware.authUser, userController.changePasswordController)


module.exports = userRouter
