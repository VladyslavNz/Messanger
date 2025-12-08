const Router = require("express");
const router = new Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const authenticateRole = require("../middleware/authenticateRole");

router.use(authMiddleware, authenticateRole(["ADMIN"]));

router.get("/users", adminController.getAllUsers);
router.get("/stats", adminController.getSystemStats);
router.post("/users/:userId/ban", adminController.banUser);
router.post("/users/:userId/unban", adminController.unBanUser);
router.delete("/users/:userId", adminController.deleteUser);

module.exports = router;
