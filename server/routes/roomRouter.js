const Router = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roomController = require("../controllers/roomController");
const messageController = require("../controllers/messageController");
const router = new Router();

router.post("/", authMiddleware, roomController.createRoom); //get existing or create room
router.get("/", authMiddleware, roomController.getUserRooms); //get all rooms
router.delete("/", authMiddleware, roomController.deleteRoom); //delete room for yourself
router.get("/:roomId/messages", authMiddleware, messageController.getMessages); //get history limit 20 message
router.post("/:roomId/messages", authMiddleware, messageController.sendMessage); //send message
router.delete(
  "/messages/:messageId",
  authMiddleware,
  messageController.deleteMessage,
); // delete message

module.exports = router;
