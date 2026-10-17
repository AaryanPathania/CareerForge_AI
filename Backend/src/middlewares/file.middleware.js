const multer = require("multer")


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(Object.assign(new Error("Only PDF files are allowed."), { status: 400 }))
        }
        cb(null, true)
    }
})


module.exports = upload