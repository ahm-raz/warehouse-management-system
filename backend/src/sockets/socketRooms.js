import logger from "../logs/logger.js";

/**
 * Socket Room Management
 * Handles user-based and role-based room assignments
 * Supports future horizontal scaling with Redis adapter
 */

/**
 * Join user-specific room
 * Room format: user:{userId}
 * @param {Object} socket - Socket.io socket instance
 * @param {string} userId - User ID
 */
export const joinUserRoom = (socket, userId) => {
  const roomName = `user:${userId}`;
  socket.join(roomName);

  logger.debug("Socket joined user room", {
    socketId: socket.id,
    userId: userId,
    roomName: roomName,
  });
};

/**
 * Join role-specific room
 * Room format: role:{roleName}
 * @param {Object} socket - Socket.io socket instance
 * @param {string} role - User role (Admin, Manager, Staff)
 */
export const joinRoleRoom = (socket, role) => {
  const roomName = `role:${role}`;
  socket.join(roomName);

  logger.debug("Socket joined role room", {
    socketId: socket.id,
    role: role,
    roomName: roomName,
  });
};

/**
 * Join notification room
 * Room format: notification:{userId}
 * @param {Object} socket - Socket.io socket instance
 * @param {string} userId - User ID
 */
export const joinNotificationRoom = (socket, userId) => {
  const roomName = `notification:${userId}`;
  socket.join(roomName);

  logger.debug("Socket joined notification room", {
    socketId: socket.id,
    userId: userId,
    roomName: roomName,
  });
};

/**
 * Initialize socket rooms for authenticated user
 * Joins user-specific, role-specific, and notification rooms
 * @param {Object} socket - Socket.io socket instance
 */
export const initializeSocketRooms = (socket) => {
  if (!socket.user) {
    logger.warn("Cannot initialize rooms: Socket not authenticated", {
      socketId: socket.id,
    });
    return;
  }

  const { userId, role } = socket.user;

  // Join user-specific room
  joinUserRoom(socket, userId);

  // Join role-specific room
  joinRoleRoom(socket, role);

  // Join notification room
  joinNotificationRoom(socket, userId);

  logger.info("Socket rooms initialized", {
    socketId: socket.id,
    userId: userId,
    role: role,
    rooms: [`user:${userId}`, `role:${role}`, `notification:${userId}`],
  });
};

/**
 * Leave all rooms for socket
 * Useful for cleanup on disconnect
 * @param {Object} socket - Socket.io socket instance
 */
export const leaveAllRooms = (socket) => {
  if (socket.rooms) {
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      if (room !== socket.id) {
        // Don't leave the socket's own room
        socket.leave(room);
      }
    });

    logger.debug("Socket left all rooms", {
      socketId: socket.id,
      roomsLeft: rooms.filter((room) => room !== socket.id),
    });
  }
};

/**
 * Get user room name
 * @param {string} userId - User ID
 * @returns {string} Room name
 */
export const getUserRoom = (userId) => {
  return `user:${userId}`;
};

/**
 * Get role room name
 * @param {string} role - User role
 * @returns {string} Room name
 */
export const getRoleRoom = (role) => {
  return `role:${role}`;
};

/**
 * Get notification room name
 * @param {string} userId - User ID
 * @returns {string} Room name
 */
export const getNotificationRoom = (userId) => {
  return `notification:${userId}`;
};

/**
 * Get admin and manager rooms
 * Returns array of room names for Admin and Manager roles
 * Useful for broadcasting to all administrators
 * @returns {Array<string>} Array of room names
 */
export const getAdminRooms = () => {
  return ["role:Admin", "role:Manager"];
};
