const Router = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const router = new Router();

router.post("/registration", userController.registration);
router.post("/login", userController.login);
router.post("/logout", authMiddleware, userController.logout);
router.get("/auth", authMiddleware, userController.checkAuth);
router.get("/refresh", userController.refresh);
router.get("/search", authMiddleware, userController.getUser); //get user
module.exports = router;
