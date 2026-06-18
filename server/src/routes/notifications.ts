import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import {
  listNotifications, markRead, markAllRead, deleteNotification, clearAll,
} from '../services/notificationService'

const router = Router()
router.use(authenticate)

// GET /api/notifications — recent notifications + unread count
router.get('/', async (req: AuthRequest, res: Response) => {
  const { notifications, unread } = await listNotifications(req.user!.userId, 50)
  res.json({ notifications, unread })
})

// POST /api/notifications/:id/read — mark one as read
router.post('/:id/read', async (req: AuthRequest, res: Response) => {
  await markRead(req.user!.userId, req.params.id)
  res.json({ ok: true })
})

// POST /api/notifications/read-all — mark all as read
router.post('/read-all', async (req: AuthRequest, res: Response) => {
  await markAllRead(req.user!.userId)
  res.json({ ok: true })
})

// DELETE /api/notifications/:id — delete one
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await deleteNotification(req.user!.userId, req.params.id)
  res.json({ ok: true })
})

// DELETE /api/notifications — clear all
router.delete('/', async (req: AuthRequest, res: Response) => {
  await clearAll(req.user!.userId)
  res.json({ ok: true })
})

export default router
