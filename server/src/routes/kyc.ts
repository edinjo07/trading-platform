import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getKYC, submitKYC, reviewKYC } from '../services/kycService'

const router = Router()
router.use(authenticate)

// GET /api/kyc — current verification state for the signed-in user
router.get('/', async (req: AuthRequest, res: Response) => {
  const kyc = await getKYC(req.user!.userId)
  res.json(kyc)
})

// POST /api/kyc/submit — submit ID and/or proof-of-address documents for review
router.post('/submit', async (req: AuthRequest, res: Response) => {
  const { idType, idDocName, poaType, poaDocName } = req.body ?? {}
  if (!idType && !poaType) {
    return res.status(400).json({ error: 'Provide at least one document to submit' })
  }
  const kyc = await submitKYC(req.user!.userId, { idType, idDocName, poaType, poaDocName })
  res.json(kyc)
})

// POST /api/kyc/review — approve/reject the signed-in user's own submission.
// (Self-review is allowed here so the demo can drive the flow; in production this
//  would be an admin-only endpoint. The auto-review monitor also handles approvals.)
router.post('/review', async (req: AuthRequest, res: Response) => {
  const decision = req.body?.decision
  if (decision !== 'approve' && decision !== 'reject') {
    return res.status(400).json({ error: 'decision must be "approve" or "reject"' })
  }
  const kyc = await reviewKYC(req.user!.userId, decision, req.body?.reason)
  res.json(kyc)
})

export default router
