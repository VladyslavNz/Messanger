class CursorService {
encode(cursor) {
  const cursorString = `${cursor.createdAt.getTime()}_${cursor.id}`;
  return Buffer.from(cursorString).toString("base64");
}

decode(cursor) {
  try {
    const cursorString = Buffer.from(cursor, "base64").toString();
    const [createdAt, id] = cursorString.split("_");

    if (!createdAt || !id) return null;

    return {
      createdAt: new Date(Number(createdAt)),
      id: id
    };
  } catch (error) {
    console.error("Error decoding cursor:", error);
    return null;
  }
}
}

module.exports = new CursorService();