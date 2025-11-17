const Router = require("express");
const router = new Router();

router.post("/send");
router.get("/:chatId");

module.exports = router;
