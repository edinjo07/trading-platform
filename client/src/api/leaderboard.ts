import api from './client'

export interface LeaderboardEntry {
  rank:      number
  userId:    string
  username:  string
  avatar:    string
  country:   string
  returnPct: number
  netPnl:    number
  trades:    number
  winRate:   number
  sharpe:    number
  equity:    number
  streak:    number
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await api.get<{ success: boolean; data: LeaderboardEntry[] }>('/leaderboard')
  return res.data.data
}
