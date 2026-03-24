const Router = require("express");
const router = new Router();

const userRouter = require("./userRouter");
const roomRouter = require("./roomRouter");
// const adminRouter = require("./adminRouter");

router.use("/user", userRouter);
router.use("/room", roomRouter);
// router.use("/admin", adminRouter);

module.exports = router;
