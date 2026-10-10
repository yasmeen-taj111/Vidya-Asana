import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { chatLimiter } from '../../middleware/rateLimit';
import { query } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { generateUUID } from '../../utils/ids';

export const chatRouter = Router();

import { generateChatResponse } from './chatEngine';

// POST /chat
chatRouter.post('/', authenticate, chatLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { message, conversationId = generateUUID() } = req.body;

    if (!message || typeof message !== 'string') {
      return sendError(res, 'VALIDATION_ERROR', 'Message is required', 422);
    }

    // Save user message
    const userMsgId = generateUUID();
    await query(
      `INSERT INTO chat_messages (id, user_id, conversation_id, role, content, created_at)
       VALUES (?, ?, ?, 'USER', ?, NOW())`,
      [userMsgId, userId, conversationId, message]
    );

    const { reply, suggestedActions } = generateChatResponse(message);

    // Save bot message
    const botMsgId = generateUUID();
    await query(
      `INSERT INTO chat_messages (id, user_id, conversation_id, role, content, created_at)
       VALUES (?, ?, ?, 'ASSISTANT', ?, NOW())`,
      [botMsgId, userId, conversationId, reply]
    );

    sendSuccess(res, {
      conversationId,
      reply,
      suggestedActions,
    });
  } catch (err) {
    next(err);
  }
});
