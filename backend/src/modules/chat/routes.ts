import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { chatLimiter } from '../../middleware/rateLimit';
import { query } from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { generateUUID } from '../../utils/ids';

export const chatRouter = Router();

interface SuggestedAction {
  label: string;
  type: 'NAVIGATE' | 'BOOK';
  payload: Record<string, unknown>;
}

function generateChatResponse(message: string): { reply: string; suggestedActions?: SuggestedAction[] } {
  const lower = message.toLowerCase();

  if (lower.includes('quiet') || lower.includes('silent') || lower.includes('window')) {
    return {
      reply: 'I found several quiet zones and window-facing desks available at Central Study Hub. Would you like to explore available seats?',
      suggestedActions: [
        { label: 'View Floor 1 Silent Pods', type: 'NAVIGATE', payload: { path: '/discover' } },
        { label: 'Filter Quiet Desks', type: 'NAVIGATE', payload: { path: '/discover?quietZone=true' } },
      ],
    };
  }

  if (lower.includes('group') || lower.includes('team') || lower.includes('meeting')) {
    return {
      reply: 'Central Study Hub has discussion pods on Floor 2 equipped with whiteboards and collaborative tables.',
      suggestedActions: [
        { label: 'Browse Group Pods', type: 'NAVIGATE', payload: { path: '/discover?seatType=GROUP' } },
      ],
    };
  }

  if (lower.includes('computer') || lower.includes('pc') || lower.includes('terminal')) {
    return {
      reply: 'Computer workstations with high-speed wired Ethernet are available on Floor 1.',
      suggestedActions: [
        { label: 'View Computer Workstations', type: 'NAVIGATE', payload: { path: '/discover?seatType=COMPUTER' } },
      ],
    };
  }

  if (lower.includes('booking') || lower.includes('qr') || lower.includes('check in') || lower.includes('checkin')) {
    return {
      reply: 'You can view your active bookings and access your digital QR pass from the My Bookings page. Remember to scan your QR within 30 minutes of slot start!',
      suggestedActions: [
        { label: 'My Bookings', type: 'NAVIGATE', payload: { path: '/bookings' } },
      ],
    };
  }

  if (lower.includes('pomodoro') || lower.includes('timer') || lower.includes('study') || lower.includes('focus')) {
    return {
      reply: 'Ready for deep focus? Head to the Study Room to launch the Pomodoro timer and earn leaderboard focus points!',
      suggestedActions: [
        { label: 'Open Study Timer', type: 'NAVIGATE', payload: { path: '/study' } },
        { label: 'View Leaderboard', type: 'NAVIGATE', payload: { path: '/leaderboard' } },
      ],
    };
  }

  if (lower.includes('waitlist') || lower.includes('queue') || lower.includes('full')) {
    return {
      reply: 'If your favorite desk is taken, you can join its waitlist. When the seat is vacated or released, you get a 10-minute priority window to claim it!',
      suggestedActions: [
        { label: 'My Waitlists', type: 'NAVIGATE', payload: { path: '/waitlist' } },
      ],
    };
  }

  return {
    reply: `Hello! I'm AsanaBot, your intelligent library guide. I can help you find quiet ergonomic desks, book study pods, manage check-in QR passes, track your Pomodoro streaks, and join seat waitlists. How can I assist your study session today?`,
    suggestedActions: [
      { label: 'Discover Libraries', type: 'NAVIGATE', payload: { path: '/discover' } },
      { label: 'My Bookings', type: 'NAVIGATE', payload: { path: '/bookings' } },
      { label: 'Study Timer', type: 'NAVIGATE', payload: { path: '/study' } },
    ],
  };
}

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
