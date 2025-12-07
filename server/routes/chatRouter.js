const Router = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");
const messageController = require("../controllers/messageController");
const router = new Router();

router.post("/", authMiddleware, chatController.createChat); //get existing or create chat
router.get("/", authMiddleware, chatController.getUserChats); //get all chats
router.delete("/", authMiddleware, chatController.deleteChat); //delete chat for yourself
router.get("/:chatId/messages", authMiddleware, messageController.getMessages); //get history limit 20 message
router.post("/:chatId/messages", authMiddleware, messageController.sendMessage); //send message
router.delete(
  "/messages/:messageId",
  authMiddleware,
  messageController.deleteMessage
); // delete message

module.exports = router;
