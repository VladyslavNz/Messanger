const Router = require("express");
const router = new Router();

router.post("/registration");
router.post("/login");
router.get("/auth"); //check token
router.get("/:id"); //get user
router.get("/"); //get all users
module.exports = router;
