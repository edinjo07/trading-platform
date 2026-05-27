/**
 * orderEngine.ts
 *
 * Single source of truth for all trading operations.
 * Every function reads from and writes to Supabase — no in-memory state.
 *
 * Flow:
 *   placeMarketOrder()  →  validate → get price → deduct margin → open/add to position → log order
 *   closePosition()     →  get price → calc P&L → release margin → delete position → log trade
 */

import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../db'
import { getPrice, getAssetClass, isKnownSymbol, MAX_LEVERAGE } from './priceService'
import {
  AccountMode, OrderSide, PositionRow,
  PlaceOrderResult, ClosePositionResult,
} from '../types'

const COMMISSION_RATE = 0.0005   // 0.05 % of notional per trade leg
const STARTING_BALANCE = 100_000

// ─── Account helpers ──────────────────────────────────────────────────────────

async function getOrCreateAccount(userId: string, mode: AccountMode) {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, cash_balance')
    .eq('user_id', userId)
    .eq('mode', mode)
    .single()

  if (error?.code === 'PGRST116') {
    // No account yet — create with starting balance
    const { data: created, error: ce } = await supabase
      .from('accounts')
      .insert({ user_id: userId, mode, cash_balance: STARTING_BALANCE })
      .select('id, cash_balance')
      .single()
    if (ce) throw new Error(`Account create failed: ${ce.message}`)
    return created as { id: string; cash_balance: number }
  }
  if (error) throw new Error(`Account load failed: ${error.message}`)
  return data as { id: string; cash_balance: number }
}

// ─── Place market order ────────────────────────────────────────────────────────

export async function placeMarketOrder(
  userId: string,
  mode: AccountMode,
  params: {
    symbol: string
    side: OrderSide
    quantity: number
    leverage?: number
    takeProfit?: number
    stopLoss?: number
  }
): Promise<PlaceOrderResult> {
  const { symbol, side, quantity, takeProfit, stopLoss } = params

  // ── Validate inputs ─────────────────────────────────────────────────────────
  if (!isKnownSymbol(symbol)) throw new Error(`Unknown symbol: ${symbol}`)
  if (!['buy', 'sell'].includes(side)) throw new Error('Side must be buy or sell')
  if (!isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be a positive number')

  const assetClass = getAssetClass(symbol)
  const maxLev = MAX_LEVERAGE[assetClass] ?? 10
  const leverage = Math.max(1, Math.min(Math.round(params.leverage ?? 1), maxLev))

  // ── Get live price ──────────────────────────────────────────────────────────
  const fillPrice = getPrice(symbol)
  if (!fillPrice) throw new Error(`No price available for ${symbol}`)

  // ── Cost calculation ────────────────────────────────────────────────────────
  const notional   = quantity * fillPrice
  const margin     = parseFloat((notional / leverage).toFixed(2))
  const commission = parseFloat((notional * COMMISSION_RATE).toFixed(8))
  const totalCost  = parseFloat((margin + commission).toFixed(2))

  // ── Load account and check funds ────────────────────────────────────────────
  const account = await getOrCreateAccount(userId, mode)
  if (account.cash_balance < totalCost) {
    throw new Error(
      `Insufficient funds — need $${totalCost.toFixed(2)}, have $${account.cash_balance.toFixed(2)}`
    )
  }

  const positionSide = side === 'buy' ? 'long' : 'short'
  const now = new Date().toISOString()

  // ── Check for existing position on the same symbol/side ────────────────────
  const { data: existing } = await supabase
    .from('positions')
    .select('id, quantity, avg_price, margin, take_profit, stop_loss')
    .eq('user_id', userId)
    .eq('mode', mode)
    .eq('symbol', symbol)
    .eq('side', positionSide)
    .maybeSingle()

  if (existing) {
    // Average into the existing position
    const newQty      = existing.quantity + quantity
    const newAvgPrice = parseFloat(
      ((existing.avg_price * existing.quantity + fillPrice * quantity) / newQty).toFixed(8)
    )
    const newMargin   = parseFloat((existing.margin + margin).toFixed(2))

    const { error: upErr } = await supabase
      .from('positions')
      .update({
        quantity:    newQty,
        avg_price:   newAvgPrice,
        margin:      newMargin,
        take_profit: takeProfit ?? existing.take_profit,
        stop_loss:   stopLoss   ?? existing.stop_loss,
        updated_at:  now,
      })
      .eq('id', existing.id)
    if (upErr) throw new Error(`Position update failed: ${upErr.message}`)
  } else {
    // Open a brand-new position
    const { error: insErr } = await supabase
      .from('positions')
      .insert({
        user_id:     userId,
        mode,
        symbol,
        side:        positionSide,
        quantity,
        avg_price:   fillPrice,
        leverage,
        margin,
        take_profit: takeProfit ?? null,
        stop_loss:   stopLoss   ?? null,
        opened_at:   now,
        updated_at:  now,
      })
    if (insErr) throw new Error(`Position insert failed: ${insErr.message}`)
  }

  // ── Deduct cost from cash (guarded by gte to prevent race-condition overdraft) ──
  const newBalance = parseFloat((account.cash_balance - totalCost).toFixed(2))
  const { error: balErr } = await supabase
    .from('accounts')
    .update({ cash_balance: newBalance, updated_at: now })
    .eq('user_id', userId)
    .eq('mode', mode)
    .gte('cash_balance', totalCost)   // atomic guard
  if (balErr) throw new Error(`Balance update failed: ${balErr.message}`)

  // ── Log the order ───────────────────────────────────────────────────────────
  const orderId = uuidv4()
  await supabase.from('orders').insert({
    id:          orderId,
    user_id:     userId,
    mode,
    symbol,
    side,
    type:        'market',
    status:      'filled',
    quantity,
    fill_price:  fillPrice,
    commission,
    leverage,
    take_profit: takeProfit ?? null,
    stop_loss:   stopLoss   ?? null,
    created_at:  now,
  })

  return {
    id: orderId, symbol, side, quantity,
    fillPrice, leverage, margin, commission, totalCost,
    takeProfit, stopLoss, createdAt: now,
  }
}

// ─── Close position ────────────────────────────────────────────────────────────

export async function closePosition(
  positionId: string,
  userId: string,
  mode: AccountMode
): Promise<ClosePositionResult> {
  // ── Load the position (must belong to this user) ───────────────────────────
  const { data: pos, error: posErr } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .eq('user_id', userId)
    .eq('mode', mode)
    .single()
  if (posErr || !pos) throw new Error('Position not found')
  const position = pos as PositionRow

  // ── Get live exit price ────────────────────────────────────────────────────
  const exitPrice = getPrice(position.symbol)
  if (!exitPrice) throw new Error(`No price available for ${position.symbol}`)

  // ── P&L calculation ────────────────────────────────────────────────────────
  const closingNotional = position.quantity * exitPrice
  const commission      = parseFloat((closingNotional * COMMISSION_RATE).toFixed(8))

  const rawPnl = position.side === 'long'
    ? (exitPrice - position.avg_price) * position.quantity
    : (position.avg_price - exitPrice) * position.quantity
  const pnl    = parseFloat(rawPnl.toFixed(2))
  const netPnl = parseFloat((pnl - commission).toFixed(2))

  const now = new Date().toISOString()

  // ── Delete the position ────────────────────────────────────────────────────
  const { error: delErr } = await supabase
    .from('positions')
    .delete()
    .eq('id', positionId)
  if (delErr) throw new Error(`Position delete failed: ${delErr.message}`)

  // ── Return margin + net P&L to cash ───────────────────────────────────────
  const { data: acct } = await supabase
    .from('accounts')
    .select('cash_balance')
    .eq('user_id', userId)
    .eq('mode', mode)
    .single()

  if (acct) {
    const released = parseFloat((position.margin + netPnl).toFixed(2))
    await supabase
      .from('accounts')
      .update({
        cash_balance: parseFloat((acct.cash_balance + released).toFixed(2)),
        updated_at:   now,
      })
      .eq('user_id', userId)
      .eq('mode', mode)
  }

  // ── Record the closed trade ────────────────────────────────────────────────
  const tradeId = uuidv4()
  await supabase.from('trades').insert({
    id:          tradeId,
    user_id:     userId,
    mode,
    symbol:      position.symbol,
    side:        position.side,
    quantity:    position.quantity,
    entry_price: position.avg_price,
    exit_price:  exitPrice,
    leverage:    position.leverage,
    pnl,
    commission,
    net_pnl:     netPnl,
    opened_at:   position.opened_at,
    closed_at:   now,
  })

  // ── Log the closing order ──────────────────────────────────────────────────
  await supabase.from('orders').insert({
    id:         uuidv4(),
    user_id:    userId,
    mode,
    symbol:     position.symbol,
    side:       position.side === 'long' ? 'sell' : 'buy',
    type:       'market',
    status:     'filled',
    quantity:   position.quantity,
    fill_price: exitPrice,
    commission,
    leverage:   position.leverage,
    created_at: now,
  })

  return {
    tradeId,
    symbol:     position.symbol,
    side:       position.side,
    quantity:   position.quantity,
    entryPrice: position.avg_price,
    exitPrice,
    pnl,
    commission,
    netPnl,
    openedAt:   position.opened_at,
    closedAt:   now,
  }
}

// ─── Update SL/TP on an open position ─────────────────────────────────────────

export async function updatePositionSLTP(
  positionId: string,
  userId: string,
  mode: AccountMode,
  takeProfit: number | null,
  stopLoss:   number | null
): Promise<PositionRow> {
  const { data, error } = await supabase
    .from('positions')
    .update({ take_profit: takeProfit, stop_loss: stopLoss, updated_at: new Date().toISOString() })
    .eq('id', positionId)
    .eq('user_id', userId)
    .eq('mode', mode)
    .select()
    .single()
  if (error) throw new Error(error.code === 'PGRST116' ? 'Position not found' : error.message)
  return data as PositionRow
}
