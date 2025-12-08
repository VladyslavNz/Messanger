const Router = require("express");
const router = new Router();

const userRouter = require("./userRouter");
const chatRouter = require("./chatRouter");
const adminRouter = require("./adminRouter");

router.use("/user", userRouter);
router.use("/chat", chatRouter);
router.use("/admin", adminRouter);

module.exports = router;
