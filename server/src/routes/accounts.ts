import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { AccountMode, Currency, AccountType } from '../types/index'

const VALID_MODES:        AccountMode[] = ['demo', 'real']
const VALID_CURRENCIES:   Currency[]    = ['USD', 'EUR', 'GBP']
const VALID_TYPES:        AccountType[] = ['raw_spread', 'ctrader', 'standard']
const STARTING_BALANCE = 100_000

const router = Router()

// GET /api/accounts — list all accounts that exist for this user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  // Normalise rows — account_number / account_type may not exist before migration 2
  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    account_number: r.account_number ?? 0,
    mode:           r.mode,
    currency:       r.currency ?? 'USD',
    account_type:   r.account_type ?? 'raw_spread',
    cash_balance:   r.cash_balance,
  }))
  return res.json(rows)
})

// POST /api/accounts — create a new account
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const { mode, currency, accountType } = req.body

  if (!VALID_MODES.includes(mode)) {
    return res.status(400).json({ error: 'mode must be demo or real' })
  }
  if (!VALID_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: 'currency must be USD, EUR, or GBP' })
  }
  if (!VALID_TYPES.includes(accountType)) {
    return res.status(400).json({ error: 'accountType must be raw_spread, ctrader, or standard' })
  }

  // Check if this (mode, currency) combo already exists for the user
  const { data: existing } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .eq('currency', currency)
    .maybeSingle()

  if (existing) {
    return res.status(409).json({ error: 'An account with this mode and currency already exists', account_number: existing.account_number ?? 0 })
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id:      userId,
      mode,
      currency,
      account_type: accountType,
      cash_balance: STARTING_BALANCE,
      created_at:   now,
      updated_at:   now,
    })
    .select('*')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  const r = data as Record<string, unknown>
  return res.status(201).json({
    account_number: r.account_number ?? 0,
    mode:           r.mode,
    currency:       r.currency,
    account_type:   r.account_type ?? accountType,
    cash_balance:   r.cash_balance,
  })
})

export default router
