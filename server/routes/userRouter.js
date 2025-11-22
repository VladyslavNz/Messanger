const Router = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const authenticateRole = require("../middleware/authenticateRole");
const router = new Router();

router.post("/registration", userController.registration);
router.post("/login", userController.login);
router.post("/logout", authMiddleware, userController.logout);
router.get("/auth", authMiddleware, userController.checkAuth);
router.get(
  "/search",
  authMiddleware,
  authenticateRole(["USER", "ADMIN"]),
  userController.getUser
); //get user
router.get(
  "/",
  authMiddleware,
  authenticateRole(["ADMIN"]),
  userController.findAllUsers
); //get all users
module.exports = router;
