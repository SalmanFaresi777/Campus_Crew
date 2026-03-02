const multer = require('multer')


const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const upload = multer({ 
    storage: storage,
    limits:{ fileSize: 3 * 1024 * 1024 }, // 3MB
    fileFilter:(req,file,cb)=>{
        if(file.mimetype.startsWith('image/')) cb(null,true); else cb(new Error('Only image files are allowed'));
    }
})

module.exports = upload

