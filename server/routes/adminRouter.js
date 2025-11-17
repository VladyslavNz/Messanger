const Router = require("express");
const router = new Router();

router.get("/stats");
router.get("/users");

module.exports = router;
