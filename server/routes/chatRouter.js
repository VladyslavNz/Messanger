const Router = require("express");
const router = new Router();

router.post("/create-or-get");
router.get("/:chatId");
router.get("/user/:userId");

module.exports = router;
