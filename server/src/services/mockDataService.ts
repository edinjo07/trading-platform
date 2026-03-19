import { Candle, Ticker, OrderBook, OrderBookEntry, Trade, Symbol } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { startRealDataFeeds } from './realDataService'

// ---------------------------------------------------------------------------
// Public event bus — emits 'candle' events for live streaming
// ---------------------------------------------------------------------------
export const marketEvents = new EventEmitter()
marketEvents.setMaxListeners(1000)

// ---------------------------------------------------------------------------
// Market definitions
// ---------------------------------------------------------------------------
export const SYMBOLS: Symbol[] = [
  // ── Stocks ──────────────────────────────────────────────────────────────────
  { symbol: 'AAPL',  name: 'Apple Inc.',                assetClass: 'stock', baseAsset: 'AAPL',  quoteAsset: 'USD' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                assetClass: 'stock', baseAsset: 'TSLA',  quoteAsset: 'USD' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',              assetClass: 'stock', baseAsset: 'NVDA',  quoteAsset: 'USD' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',           assetClass: 'stock', baseAsset: 'MSFT',  quoteAsset: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',             assetClass: 'stock', baseAsset: 'GOOGL', quoteAsset: 'USD' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',           assetClass: 'stock', baseAsset: 'AMZN',  quoteAsset: 'USD' },
  { symbol: 'META',  name: 'Meta Platforms',            assetClass: 'stock', baseAsset: 'META',  quoteAsset: 'USD' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',            assetClass: 'stock', baseAsset: 'JPM',   quoteAsset: 'USD' },
  { symbol: 'NFLX',  name: 'Netflix Inc.',              assetClass: 'stock', baseAsset: 'NFLX',  quoteAsset: 'USD' },
  { symbol: 'COIN',  name: 'Coinbase Global',           assetClass: 'stock', baseAsset: 'COIN',  quoteAsset: 'USD' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',    assetClass: 'stock', baseAsset: 'AMD',   quoteAsset: 'USD' },
  { symbol: 'DIS',   name: 'Walt Disney Co.',           assetClass: 'stock', baseAsset: 'DIS',   quoteAsset: 'USD' },
  // Defense & Aerospace
  { symbol: 'LMT',  name: 'Lockheed Martin Corp.',      assetClass: 'stock', baseAsset: 'LMT',  quoteAsset: 'USD' },
  { symbol: 'RTX',  name: 'RTX Corp. (Raytheon)',       assetClass: 'stock', baseAsset: 'RTX',  quoteAsset: 'USD' },
  { symbol: 'NOC',  name: 'Northrop Grumman Corp.',     assetClass: 'stock', baseAsset: 'NOC',  quoteAsset: 'USD' },
  { symbol: 'GD',   name: 'General Dynamics Corp.',     assetClass: 'stock', baseAsset: 'GD',   quoteAsset: 'USD' },
  { symbol: 'BA',   name: 'Boeing Co.',                 assetClass: 'stock', baseAsset: 'BA',   quoteAsset: 'USD' },
  { symbol: 'HII',  name: 'Huntington Ingalls Ind.',    assetClass: 'stock', baseAsset: 'HII',  quoteAsset: 'USD' },
  { symbol: 'LDOS', name: 'Leidos Holdings Inc.',       assetClass: 'stock', baseAsset: 'LDOS', quoteAsset: 'USD' },
  { symbol: 'CACI', name: 'CACI International Inc.',    assetClass: 'stock', baseAsset: 'CACI', quoteAsset: 'USD' },
  // Energy Stocks
  { symbol: 'XOM',  name: 'ExxonMobil Corp.',           assetClass: 'stock', baseAsset: 'XOM',  quoteAsset: 'USD' },
  { symbol: 'CVX',  name: 'Chevron Corp.',              assetClass: 'stock', baseAsset: 'CVX',  quoteAsset: 'USD' },
  { symbol: 'COP',  name: 'ConocoPhillips',             assetClass: 'stock', baseAsset: 'COP',  quoteAsset: 'USD' },
  // ── Crypto (IC Markets naming: USD not USDT) ─────────────────────────────
  { symbol: 'BTCUSD',   name: 'Bitcoin',       assetClass: 'crypto', baseAsset: 'BTC',   quoteAsset: 'USD' },
  { symbol: 'ETHUSD',   name: 'Ethereum',      assetClass: 'crypto', baseAsset: 'ETH',   quoteAsset: 'USD' },
  { symbol: 'LTCUSD',   name: 'Litecoin',      assetClass: 'crypto', baseAsset: 'LTC',   quoteAsset: 'USD' },
  { symbol: 'BCHUSD',   name: 'Bitcoin Cash',  assetClass: 'crypto', baseAsset: 'BCH',   quoteAsset: 'USD' },
  { symbol: 'DSHUSD',   name: 'Dash',          assetClass: 'crypto', baseAsset: 'DSH',   quoteAsset: 'USD' },
  { symbol: 'XRPUSD',   name: 'XRP',           assetClass: 'crypto', baseAsset: 'XRP',   quoteAsset: 'USD' },
  { symbol: 'DOTUSD',   name: 'Polkadot',      assetClass: 'crypto', baseAsset: 'DOT',   quoteAsset: 'USD' },
  { symbol: 'LNKUSD',   name: 'Chainlink',     assetClass: 'crypto', baseAsset: 'LNK',   quoteAsset: 'USD' },
  { symbol: 'ADAUSD',   name: 'Cardano',       assetClass: 'crypto', baseAsset: 'ADA',   quoteAsset: 'USD' },
  { symbol: 'BNBUSD',   name: 'BNB',           assetClass: 'crypto', baseAsset: 'BNB',   quoteAsset: 'USD' },
  { symbol: 'SOLUSD',   name: 'Solana',        assetClass: 'crypto', baseAsset: 'SOL',   quoteAsset: 'USD' },
  { symbol: 'AVAXUSD',  name: 'Avalanche',     assetClass: 'crypto', baseAsset: 'AVAX',  quoteAsset: 'USD' },
  { symbol: 'MATICUSD', name: 'Polygon',       assetClass: 'crypto', baseAsset: 'MATIC', quoteAsset: 'USD' },
  { symbol: 'DOGEUSD',  name: 'Dogecoin',      assetClass: 'crypto', baseAsset: 'DOGE',  quoteAsset: 'USD' },
  { symbol: 'XLMUSD',   name: 'Stellar',       assetClass: 'crypto', baseAsset: 'XLM',   quoteAsset: 'USD' },
  { symbol: 'XTZUSD',   name: 'Tezos',         assetClass: 'crypto', baseAsset: 'XTZ',   quoteAsset: 'USD' },
  { symbol: 'UNIUSD',   name: 'Uniswap',       assetClass: 'crypto', baseAsset: 'UNI',   quoteAsset: 'USD' },
  { symbol: 'EMCUSD',   name: 'Emercoin',      assetClass: 'crypto', baseAsset: 'EMC',   quoteAsset: 'USD' },
  { symbol: 'NMCUSD',   name: 'Namecoin',      assetClass: 'crypto', baseAsset: 'NMC',   quoteAsset: 'USD' },
  { symbol: 'PPCUSD',   name: 'Peercoin',      assetClass: 'crypto', baseAsset: 'PPC',   quoteAsset: 'USD' },
  { symbol: 'LUNAUSD',  name: 'Terra Luna',    assetClass: 'crypto', baseAsset: 'LUNA',  quoteAsset: 'USD' },
  // ── Forex Majors ──────────────────────────────────────────────────────────
  { symbol: 'EURUSD', name: 'Euro / US Dollar',               assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'USD' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar',      assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'USD' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen',       assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'JPY' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc',        assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'CHF' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar',    assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'CAD' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / USD',        assetClass: 'forex', baseAsset: 'AUD', quoteAsset: 'USD' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / USD',       assetClass: 'forex', baseAsset: 'NZD', quoteAsset: 'USD' },
  // ── Forex Minors ──────────────────────────────────────────────────────────
  { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar',    assetClass: 'forex', baseAsset: 'AUD', quoteAsset: 'CAD' },
  { symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc',        assetClass: 'forex', baseAsset: 'AUD', quoteAsset: 'CHF' },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen',       assetClass: 'forex', baseAsset: 'AUD', quoteAsset: 'JPY' },
  { symbol: 'AUDNZD', name: 'Australian Dollar / New Zealand Dollar', assetClass: 'forex', baseAsset: 'AUD', quoteAsset: 'NZD' },
  { symbol: 'CADCHF', name: 'Canadian Dollar / Swiss Franc',          assetClass: 'forex', baseAsset: 'CAD', quoteAsset: 'CHF' },
  { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen',         assetClass: 'forex', baseAsset: 'CAD', quoteAsset: 'JPY' },
  { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen',             assetClass: 'forex', baseAsset: 'CHF', quoteAsset: 'JPY' },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar',               assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'AUD' },
  { symbol: 'EURCAD', name: 'Euro / Canadian Dollar',                 assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'CAD' },
  { symbol: 'EURCHF', name: 'Euro / Swiss Franc',                     assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'CHF' },
  { symbol: 'EURGBP', name: 'Euro / British Pound',                   assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'GBP' },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen',                    assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'JPY' },
  { symbol: 'EURNZD', name: 'Euro / New Zealand Dollar',              assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'NZD' },
  { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar',      assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'AUD' },
  { symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar',        assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'CAD' },
  { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc',            assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'CHF' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen',           assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'JPY' },
  { symbol: 'GBPNZD', name: 'British Pound / New Zealand Dollar',     assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'NZD' },
  { symbol: 'NZDCAD', name: 'New Zealand Dollar / Canadian Dollar',   assetClass: 'forex', baseAsset: 'NZD', quoteAsset: 'CAD' },
  { symbol: 'NZDCHF', name: 'New Zealand Dollar / Swiss Franc',       assetClass: 'forex', baseAsset: 'NZD', quoteAsset: 'CHF' },
  { symbol: 'NZDJPY', name: 'New Zealand Dollar / Japanese Yen',      assetClass: 'forex', baseAsset: 'NZD', quoteAsset: 'JPY' },
  // ── Forex Exotics ─────────────────────────────────────────────────────────
  { symbol: 'EURHUF',  name: 'Euro / Hungarian Forint',             assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'HUF' },
  { symbol: 'EURNOK',  name: 'Euro / Norwegian Krone',              assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'NOK' },
  { symbol: 'EURPLN',  name: 'Euro / Polish Zloty',                 assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'PLN' },
  { symbol: 'EURSEK',  name: 'Euro / Swedish Krona',                assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'SEK' },
  { symbol: 'EURZAR',  name: 'Euro / South African Rand',           assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'ZAR' },
  { symbol: 'EURMXN',  name: 'Euro / Mexican Peso',                 assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'MXN' },
  { symbol: 'EURTRY',  name: 'Euro / Turkish Lira',                 assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'TRY' },
  { symbol: 'GBPNOK',  name: 'British Pound / Norwegian Krone',     assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'NOK' },
  { symbol: 'GBPPLN',  name: 'British Pound / Polish Zloty',        assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'PLN' },
  { symbol: 'GBPSEK',  name: 'British Pound / Swedish Krona',       assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'SEK' },
  { symbol: 'GBPZAR',  name: 'British Pound / South African Rand',  assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'ZAR' },
  { symbol: 'USDCNH',  name: 'US Dollar / Chinese Yuan (Offshore)', assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'CNH' },
  { symbol: 'USDCZK',  name: 'US Dollar / Czech Koruna',            assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'CZK' },
  { symbol: 'USDDKK',  name: 'US Dollar / Danish Krone',            assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'DKK' },
  { symbol: 'USDHKD',  name: 'US Dollar / Hong Kong Dollar',        assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'HKD' },
  { symbol: 'USDHUF',  name: 'US Dollar / Hungarian Forint',        assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'HUF' },
  { symbol: 'USDILS',  name: 'US Dollar / Israeli Shekel',          assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'ILS' },
  { symbol: 'USDMXN',  name: 'US Dollar / Mexican Peso',            assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'MXN' },
  { symbol: 'USDNOK',  name: 'US Dollar / Norwegian Krone',         assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'NOK' },
  { symbol: 'USDPLN',  name: 'US Dollar / Polish Zloty',            assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'PLN' },
  { symbol: 'USDSEK',  name: 'US Dollar / Swedish Krona',           assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'SEK' },
  { symbol: 'USDSGD',  name: 'US Dollar / Singapore Dollar',        assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'SGD' },
  { symbol: 'USDTHB',  name: 'US Dollar / Thai Baht',               assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'THB' },
  { symbol: 'USDZAR',  name: 'US Dollar / South African Rand',      assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'ZAR' },
  { symbol: 'USDTRY',  name: 'US Dollar / Turkish Lira',            assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'TRY' },
  { symbol: 'NOKJPY',  name: 'Norwegian Krone / Japanese Yen',      assetClass: 'forex', baseAsset: 'NOK', quoteAsset: 'JPY' },
  { symbol: 'SGDJPY',  name: 'Singapore Dollar / Japanese Yen',     assetClass: 'forex', baseAsset: 'SGD', quoteAsset: 'JPY' },
  { symbol: 'AUDMXN',  name: 'Australian Dollar / Mexican Peso',    assetClass: 'forex', baseAsset: 'AUD', quoteAsset: 'MXN' },
  { symbol: 'AUDSGD',  name: 'Australian Dollar / Singapore Dollar',assetClass: 'forex', baseAsset: 'AUD', quoteAsset: 'SGD' },
  { symbol: 'EURSGD',  name: 'Euro / Singapore Dollar',             assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'SGD' },
  { symbol: 'GBPSGD',  name: 'British Pound / Singapore Dollar',    assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'SGD' },
  { symbol: 'NZDSGD',  name: 'New Zealand Dollar / Sing. Dollar',   assetClass: 'forex', baseAsset: 'NZD', quoteAsset: 'SGD' },
  { symbol: 'EURCZK',  name: 'Euro / Czech Koruna',                 assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'CZK' },
  // ── Commodities ───────────────────────────────────────────────────────────
  // Precious Metals (spot)
  { symbol: 'XAUUSD', name: 'Gold',      assetClass: 'commodity', baseAsset: 'XAU', quoteAsset: 'USD' },
  { symbol: 'XAGUSD', name: 'Silver',    assetClass: 'commodity', baseAsset: 'XAG', quoteAsset: 'USD' },
  { symbol: 'XPTUSD', name: 'Platinum',  assetClass: 'commodity', baseAsset: 'XPT', quoteAsset: 'USD' },
  { symbol: 'XPDUSD', name: 'Palladium', assetClass: 'commodity', baseAsset: 'XPD', quoteAsset: 'USD' },
  // Energy
  { symbol: 'XBRUSD', name: 'Brent Crude Oil (Spot)',   assetClass: 'commodity', baseAsset: 'XBR',   quoteAsset: 'USD' },
  { symbol: 'WTI',    name: 'Crude Oil WTI',            assetClass: 'commodity', baseAsset: 'WTI',   quoteAsset: 'USD' },
  { symbol: 'BRENT',  name: 'Brent Crude Oil',          assetClass: 'commodity', baseAsset: 'BRENT', quoteAsset: 'USD' },
  { symbol: 'NGAS',   name: 'Natural Gas',              assetClass: 'commodity', baseAsset: 'NGAS',  quoteAsset: 'USD' },
  { symbol: 'GC25',   name: 'Gold Futures',             assetClass: 'commodity', baseAsset: 'GC',    quoteAsset: 'USD' },
  // Agricultural & Soft
  { symbol: 'COCOA',   name: 'Cocoa',        assetClass: 'commodity', baseAsset: 'COCOA',   quoteAsset: 'USD' },
  { symbol: 'COFFEE',  name: 'Coffee',       assetClass: 'commodity', baseAsset: 'COFFEE',  quoteAsset: 'USD' },
  { symbol: 'CORN',    name: 'Corn',         assetClass: 'commodity', baseAsset: 'CORN',    quoteAsset: 'USD' },
  { symbol: 'COTTON',  name: 'Cotton',       assetClass: 'commodity', baseAsset: 'COTTON',  quoteAsset: 'USD' },
  { symbol: 'OJ',      name: 'Orange Juice', assetClass: 'commodity', baseAsset: 'OJ',      quoteAsset: 'USD' },
  { symbol: 'SOYBEAN', name: 'Soybeans',     assetClass: 'commodity', baseAsset: 'SOYBEAN', quoteAsset: 'USD' },
  { symbol: 'SUGAR',   name: 'Sugar',        assetClass: 'commodity', baseAsset: 'SUGAR',   quoteAsset: 'USD' },
  { symbol: 'WHEAT',   name: 'Wheat',        assetClass: 'commodity', baseAsset: 'WHEAT',   quoteAsset: 'USD' },
  // Metals & Other
  { symbol: 'COPPER', name: 'Copper',      assetClass: 'commodity', baseAsset: 'COPPER', quoteAsset: 'USD' },
  { symbol: 'LUMBER', name: 'Lumber',      assetClass: 'commodity', baseAsset: 'LUMBER', quoteAsset: 'USD' },
  { symbol: 'HO',     name: 'Heating Oil', assetClass: 'commodity', baseAsset: 'HO',     quoteAsset: 'USD' },
  // ── Indices ───────────────────────────────────────────────────────────────
  { symbol: 'US500',   name: 'S&P 500',          assetClass: 'index', baseAsset: 'US500',   quoteAsset: 'USD' },
  { symbol: 'USTEC',   name: 'NASDAQ 100',        assetClass: 'index', baseAsset: 'USTEC',   quoteAsset: 'USD' },
  { symbol: 'US30',    name: 'Dow Jones 30',      assetClass: 'index', baseAsset: 'US30',    quoteAsset: 'USD' },
  { symbol: 'UK100',   name: 'FTSE 100',          assetClass: 'index', baseAsset: 'UK100',   quoteAsset: 'GBP' },
  { symbol: 'DE40',    name: 'DAX 40',            assetClass: 'index', baseAsset: 'DE40',    quoteAsset: 'EUR' },
  { symbol: 'F40',     name: 'CAC 40',            assetClass: 'index', baseAsset: 'F40',     quoteAsset: 'EUR' },
  { symbol: 'JP225',   name: 'Nikkei 225',        assetClass: 'index', baseAsset: 'JP225',   quoteAsset: 'JPY' },
  { symbol: 'AUS200',  name: 'ASX 200',           assetClass: 'index', baseAsset: 'AUS200',  quoteAsset: 'AUD' },
  { symbol: 'STOXX50', name: 'Euro Stoxx 50',     assetClass: 'index', baseAsset: 'STOXX50', quoteAsset: 'EUR' },
  { symbol: 'CA60',    name: 'S&P/TSX 60',        assetClass: 'index', baseAsset: 'CA60',    quoteAsset: 'CAD' },
  { symbol: 'CH20',    name: 'SMI 20',            assetClass: 'index', baseAsset: 'CH20',    quoteAsset: 'CHF' },
  { symbol: 'HK50',    name: 'Hang Seng 50',      assetClass: 'index', baseAsset: 'HK50',    quoteAsset: 'HKD' },
  { symbol: 'ES35',    name: 'IBEX 35',           assetClass: 'index', baseAsset: 'ES35',    quoteAsset: 'EUR' },
  { symbol: 'IT40',    name: 'FTSE MIB 40',       assetClass: 'index', baseAsset: 'IT40',    quoteAsset: 'EUR' },
  { symbol: 'NL25',    name: 'AEX 25',            assetClass: 'index', baseAsset: 'NL25',    quoteAsset: 'EUR' },
  { symbol: 'NO25',    name: 'OBX 25',            assetClass: 'index', baseAsset: 'NO25',    quoteAsset: 'NOK' },
  { symbol: 'SING',    name: 'Singapore STI',     assetClass: 'index', baseAsset: 'SING',    quoteAsset: 'SGD' },
  { symbol: 'PL40',    name: 'WIG 40',            assetClass: 'index', baseAsset: 'PL40',    quoteAsset: 'PLN' },
  { symbol: 'ZA50',    name: 'SA Top 40',         assetClass: 'index', baseAsset: 'ZA50',    quoteAsset: 'ZAR' },
  { symbol: 'TW50',    name: 'TWSE 50',           assetClass: 'index', baseAsset: 'TW50',    quoteAsset: 'TWD' },
  { symbol: 'IN50',    name: 'Nifty 50',          assetClass: 'index', baseAsset: 'IN50',    quoteAsset: 'INR' },
  { symbol: 'KO200',   name: 'KOSPI 200',         assetClass: 'index', baseAsset: 'KO200',   quoteAsset: 'KRW' },
  { symbol: 'DX',      name: 'US Dollar Index',   assetClass: 'index', baseAsset: 'DX',      quoteAsset: 'USD' },
  { symbol: 'VIX',     name: 'CBOE Volatility',   assetClass: 'index', baseAsset: 'VIX',     quoteAsset: 'USD' },
  { symbol: 'EUSTX50', name: 'Euro Stoxx 50 CFD', assetClass: 'index', baseAsset: 'EUSTX50', quoteAsset: 'EUR' },
  // ── Government Bonds ──────────────────────────────────────────────────────
  { symbol: 'TNOTE',  name: 'US 10-Year T-Note',  assetClass: 'bond', baseAsset: 'TNOTE',  quoteAsset: 'USD' },
  { symbol: 'BUND',   name: 'German Bund',         assetClass: 'bond', baseAsset: 'BUND',   quoteAsset: 'EUR' },
  { symbol: 'GILT',   name: 'UK Gilt',             assetClass: 'bond', baseAsset: 'GILT',   quoteAsset: 'GBP' },
  { symbol: 'JGB',    name: 'Japan Gov. Bond',     assetClass: 'bond', baseAsset: 'JGB',    quoteAsset: 'JPY' },
  { symbol: 'OAT',    name: 'French OAT',          assetClass: 'bond', baseAsset: 'OAT',    quoteAsset: 'EUR' },
  { symbol: 'BTP',    name: 'Italian BTP',         assetClass: 'bond', baseAsset: 'BTP',    quoteAsset: 'EUR' },
  { symbol: 'AUB',    name: 'Australian Bond',     assetClass: 'bond', baseAsset: 'AUB',    quoteAsset: 'AUD' },
  { symbol: 'BONO',   name: 'Spanish Bond',        assetClass: 'bond', baseAsset: 'BONO',   quoteAsset: 'EUR' },
  { symbol: 'USBOND', name: 'US 30-Year Bond',     assetClass: 'bond', baseAsset: 'USBOND', quoteAsset: 'USD' },
]

// ---------------------------------------------------------------------------
// Instrument parameters for GBM simulation
// ---------------------------------------------------------------------------
interface InstrumentParams {
  basePrice: number
  annualVol: number      // annualized volatility (e.g. 0.40 = 40%)
  annualDrift: number    // annualized drift
  priceDecimals: number  // decimal places for display
  tickSize: number       // minimum price increment
  avgSpread: number      // typical bid-ask spread as fraction of price
  baseVolume: number     // average daily volume units
}

const PARAMS: Record<string, InstrumentParams> = {
  // ── Stocks ──────────────────────────────────────────────────────────────────
  AAPL:  { basePrice: 187.50, annualVol: 0.28, annualDrift: 0.12, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 8e7   },
  TSLA:  { basePrice: 204.30, annualVol: 0.60, annualDrift: 0.15, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 1.2e8 },
  NVDA:  { basePrice: 875.20, annualVol: 0.55, annualDrift: 0.20, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 4.5e7 },
  MSFT:  { basePrice: 415.80, annualVol: 0.25, annualDrift: 0.10, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 2.5e7 },
  GOOGL: { basePrice: 162.40, annualVol: 0.28, annualDrift: 0.11, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 2e7   },
  AMZN:  { basePrice: 178.50, annualVol: 0.30, annualDrift: 0.12, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 3e7   },
  META:  { basePrice: 495.20, annualVol: 0.42, annualDrift: 0.18, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 1.5e7 },
  JPM:   { basePrice: 198.50, annualVol: 0.24, annualDrift: 0.09, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 8e6   },
  NFLX:  { basePrice: 625.00, annualVol: 0.38, annualDrift: 0.13, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 5e6   },
  COIN:  { basePrice: 198.00, annualVol: 0.90, annualDrift: 0.20, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 1.5e7 },
  AMD:   { basePrice: 162.00, annualVol: 0.52, annualDrift: 0.16, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 4e7   },
  DIS:   { basePrice: 98.50,  annualVol: 0.28, annualDrift: 0.06, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 1e7   },
  LMT:   { basePrice: 485.00, annualVol: 0.22, annualDrift: 0.11, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 1.2e6 },
  RTX:   { basePrice: 128.50, annualVol: 0.25, annualDrift: 0.10, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 5e6   },
  NOC:   { basePrice: 488.00, annualVol: 0.22, annualDrift: 0.09, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 8e5   },
  GD:    { basePrice: 295.00, annualVol: 0.20, annualDrift: 0.09, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 1.5e6 },
  BA:    { basePrice: 168.00, annualVol: 0.45, annualDrift: 0.08, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 8e6   },
  HII:   { basePrice: 272.00, annualVol: 0.28, annualDrift: 0.08, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 5e5   },
  LDOS:  { basePrice: 168.00, annualVol: 0.26, annualDrift: 0.10, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 8e5   },
  CACI:  { basePrice: 455.00, annualVol: 0.28, annualDrift: 0.11, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 3e5   },
  XOM:   { basePrice: 112.00, annualVol: 0.26, annualDrift: 0.08, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 2e7   },
  CVX:   { basePrice: 152.00, annualVol: 0.25, annualDrift: 0.07, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 1.5e7 },
  COP:   { basePrice: 112.00, annualVol: 0.28, annualDrift: 0.09, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 8e6   },
  // ── Crypto ────────────────────────────────────────────────────────────────
  BTCUSD:   { basePrice: 74000,  annualVol: 0.70, annualDrift: 0.25, priceDecimals: 1, tickSize: 0.1,     avgSpread: 0.0002, baseVolume: 3e10   },
  ETHUSD:   { basePrice: 1900,   annualVol: 0.75, annualDrift: 0.20, priceDecimals: 2, tickSize: 0.01,    avgSpread: 0.0003, baseVolume: 1.5e10 },
  LTCUSD:   { basePrice: 82,     annualVol: 0.70, annualDrift: 0.10, priceDecimals: 2, tickSize: 0.01,    avgSpread: 0.0004, baseVolume: 1.2e9  },
  BCHUSD:   { basePrice: 380,    annualVol: 0.80, annualDrift: 0.10, priceDecimals: 2, tickSize: 0.01,    avgSpread: 0.0005, baseVolume: 5e8    },
  DSHUSD:   { basePrice: 28,     annualVol: 0.90, annualDrift: 0.05, priceDecimals: 2, tickSize: 0.01,    avgSpread: 0.0008, baseVolume: 1e8    },
  XRPUSD:   { basePrice: 2.30,   annualVol: 0.85, annualDrift: 0.15, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.0005, baseVolume: 5e9    },
  DOTUSD:   { basePrice: 7.10,   annualVol: 0.95, annualDrift: 0.15, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.0007, baseVolume: 8e8    },
  LNKUSD:   { basePrice: 14.20,  annualVol: 0.90, annualDrift: 0.18, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.0006, baseVolume: 1e9    },
  ADAUSD:   { basePrice: 0.45,   annualVol: 0.95, annualDrift: 0.15, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.0007, baseVolume: 3e9    },
  BNBUSD:   { basePrice: 590,    annualVol: 0.65, annualDrift: 0.20, priceDecimals: 2, tickSize: 0.01,    avgSpread: 0.0003, baseVolume: 8e8    },
  SOLUSD:   { basePrice: 130,    annualVol: 1.10, annualDrift: 0.30, priceDecimals: 2, tickSize: 0.01,    avgSpread: 0.0005, baseVolume: 2e9    },
  AVAXUSD:  { basePrice: 25.5,   annualVol: 1.00, annualDrift: 0.20, priceDecimals: 2, tickSize: 0.01,    avgSpread: 0.0006, baseVolume: 1.5e9  },
  MATICUSD: { basePrice: 0.72,   annualVol: 1.05, annualDrift: 0.15, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.0008, baseVolume: 2e9    },
  DOGEUSD:  { basePrice: 0.125,  annualVol: 1.20, annualDrift: 0.10, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.001,  baseVolume: 8e9    },
  XLMUSD:   { basePrice: 0.28,   annualVol: 0.90, annualDrift: 0.10, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.001,  baseVolume: 2e9    },
  XTZUSD:   { basePrice: 0.75,   annualVol: 0.95, annualDrift: 0.10, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.001,  baseVolume: 5e8    },
  UNIUSD:   { basePrice: 8.50,   annualVol: 1.00, annualDrift: 0.15, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.0008, baseVolume: 4e8    },
  EMCUSD:   { basePrice: 0.08,   annualVol: 1.20, annualDrift: 0.05, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.002,  baseVolume: 5e6    },
  NMCUSD:   { basePrice: 0.35,   annualVol: 1.10, annualDrift: 0.05, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.003,  baseVolume: 3e6    },
  PPCUSD:   { basePrice: 0.40,   annualVol: 1.10, annualDrift: 0.05, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.003,  baseVolume: 2e6    },
  LUNAUSD:  { basePrice: 0.50,   annualVol: 1.50, annualDrift: 0.05, priceDecimals: 4, tickSize: 0.0001,  avgSpread: 0.005,  baseVolume: 5e7    },
  // ── Forex Majors ──────────────────────────────────────────────────────────
  EURUSD: { basePrice: 1.0885, annualVol: 0.07, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00005, baseVolume: 5e11   },
  GBPUSD: { basePrice: 1.2745, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00007, baseVolume: 3e11   },
  USDJPY: { basePrice: 149.32, annualVol: 0.06, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.005,   baseVolume: 4e11   },
  USDCHF: { basePrice: 0.8945, annualVol: 0.06, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00007, baseVolume: 2e11   },
  USDCAD: { basePrice: 1.3615, annualVol: 0.06, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00008, baseVolume: 2e11   },
  AUDUSD: { basePrice: 0.6520, annualVol: 0.09, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00007, baseVolume: 2.5e11 },
  NZDUSD: { basePrice: 0.6085, annualVol: 0.10, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00009, baseVolume: 1e11   },
  // ── Forex Minors ──────────────────────────────────────────────────────────
  AUDCAD: { basePrice: 0.8875, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.0001,  baseVolume: 8e10   },
  AUDCHF: { basePrice: 0.5830, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00012, baseVolume: 5e10   },
  AUDJPY: { basePrice: 97.20,  annualVol: 0.11, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.009,   baseVolume: 1e11   },
  AUDNZD: { basePrice: 1.0715, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00015, baseVolume: 4e10   },
  CADCHF: { basePrice: 0.6580, annualVol: 0.07, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00012, baseVolume: 3e10   },
  CADJPY: { basePrice: 109.50, annualVol: 0.09, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.009,   baseVolume: 8e10   },
  CHFJPY: { basePrice: 168.00, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.01,    baseVolume: 4e10   },
  EURAUD: { basePrice: 1.6840, annualVol: 0.10, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.0001,  baseVolume: 8e10   },
  EURCAD: { basePrice: 1.5040, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.0001,  baseVolume: 8e10   },
  EURCHF: { basePrice: 0.9650, annualVol: 0.05, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00006, baseVolume: 1.5e11 },
  EURGBP: { basePrice: 0.8540, annualVol: 0.05, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00006, baseVolume: 1.5e11 },
  EURJPY: { basePrice: 162.45, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.007,   baseVolume: 2e11   },
  EURNZD: { basePrice: 1.7930, annualVol: 0.10, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00015, baseVolume: 4e10   },
  GBPAUD: { basePrice: 1.9680, annualVol: 0.11, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00015, baseVolume: 5e10   },
  GBPCAD: { basePrice: 1.7570, annualVol: 0.09, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00012, baseVolume: 4e10   },
  GBPCHF: { basePrice: 1.1300, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00012, baseVolume: 4e10   },
  GBPJPY: { basePrice: 190.20, annualVol: 0.10, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.009,   baseVolume: 1.5e11 },
  GBPNZD: { basePrice: 2.0950, annualVol: 0.11, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.0002,  baseVolume: 3e10   },
  NZDCAD: { basePrice: 0.8280, annualVol: 0.09, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00015, baseVolume: 3e10   },
  NZDCHF: { basePrice: 0.5440, annualVol: 0.09, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00015, baseVolume: 2e10   },
  NZDJPY: { basePrice: 90.70,  annualVol: 0.10, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.009,   baseVolume: 3e10   },
  // ── Forex Exotics ─────────────────────────────────────────────────────────
  EURHUF:  { basePrice: 398.50, annualVol: 0.12, annualDrift: 0.00, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.005,   baseVolume: 5e10   },
  EURNOK:  { basePrice: 11.75,  annualVol: 0.12, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0003,  baseVolume: 4e10   },
  EURPLN:  { basePrice: 4.265,  annualVol: 0.10, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0003,  baseVolume: 3e10   },
  EURSEK:  { basePrice: 11.35,  annualVol: 0.10, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0003,  baseVolume: 3e10   },
  EURZAR:  { basePrice: 20.50,  annualVol: 0.20, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.001,   baseVolume: 2e10   },
  EURMXN:  { basePrice: 19.20,  annualVol: 0.18, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0008,  baseVolume: 2e10   },
  EURTRY:  { basePrice: 387.00, annualVol: 0.28, annualDrift: 0.02, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.01,    baseVolume: 1e10   },
  GBPNOK:  { basePrice: 13.76,  annualVol: 0.13, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0004,  baseVolume: 2e10   },
  GBPPLN:  { basePrice: 4.99,   annualVol: 0.11, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0004,  baseVolume: 2e10   },
  GBPSEK:  { basePrice: 13.28,  annualVol: 0.12, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0004,  baseVolume: 2e10   },
  GBPZAR:  { basePrice: 24.05,  annualVol: 0.22, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.001,   baseVolume: 1e10   },
  USDCNH:  { basePrice: 7.240,  annualVol: 0.04, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0001,  baseVolume: 3e11   },
  USDCZK:  { basePrice: 23.40,  annualVol: 0.10, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.003,   baseVolume: 2e10   },
  USDDKK:  { basePrice: 6.890,  annualVol: 0.06, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0002,  baseVolume: 3e10   },
  USDHKD:  { basePrice: 7.826,  annualVol: 0.01, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0001,  baseVolume: 2e11   },
  USDHUF:  { basePrice: 365.60, annualVol: 0.12, annualDrift: 0.00, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.003,   baseVolume: 3e10   },
  USDILS:  { basePrice: 3.740,  annualVol: 0.12, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.001,   baseVolume: 2e10   },
  USDMXN:  { basePrice: 17.40,  annualVol: 0.14, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.002,   baseVolume: 1.5e11 },
  USDNOK:  { basePrice: 10.72,  annualVol: 0.12, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0002,  baseVolume: 8e10   },
  USDPLN:  { basePrice: 3.916,  annualVol: 0.10, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0002,  baseVolume: 4e10   },
  USDSEK:  { basePrice: 10.45,  annualVol: 0.11, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0002,  baseVolume: 4e10   },
  USDSGD:  { basePrice: 1.344,  annualVol: 0.05, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0001,  baseVolume: 1e11   },
  USDTHB:  { basePrice: 35.20,  annualVol: 0.06, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.002,   baseVolume: 3e10   },
  USDZAR:  { basePrice: 18.60,  annualVol: 0.18, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0003,  baseVolume: 6e10   },
  USDTRY:  { basePrice: 36.20,  annualVol: 0.28, annualDrift: 0.02, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.003,   baseVolume: 3e10   },
  NOKJPY:  { basePrice: 13.92,  annualVol: 0.12, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.002,   baseVolume: 1e10   },
  SGDJPY:  { basePrice: 111.10, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.009,   baseVolume: 2e10   },
  AUDMXN:  { basePrice: 11.35,  annualVol: 0.18, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.001,   baseVolume: 5e9    },
  AUDSGD:  { basePrice: 0.8750, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0001,  baseVolume: 8e9    },
  EURSGD:  { basePrice: 1.4620, annualVol: 0.06, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0001,  baseVolume: 1e10   },
  GBPSGD:  { basePrice: 1.7100, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0001,  baseVolume: 8e9    },
  NZDSGD:  { basePrice: 0.8170, annualVol: 0.09, annualDrift: 0.00, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0001,  baseVolume: 5e9    },
  EURCZK:  { basePrice: 25.45,  annualVol: 0.10, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.003,   baseVolume: 2e10   },
  // ── Commodities ───────────────────────────────────────────────────────────
  XAUUSD: { basePrice: 2400,  annualVol: 0.15, annualDrift: 0.05, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0002, baseVolume: 2e8   },
  XAGUSD: { basePrice: 28.5,  annualVol: 0.25, annualDrift: 0.03, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0004, baseVolume: 5e7   },
  XPTUSD: { basePrice: 1000,  annualVol: 0.22, annualDrift: 0.02, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0005, baseVolume: 2e7   },
  XPDUSD: { basePrice: 1060,  annualVol: 0.30, annualDrift: 0.00, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.001,  baseVolume: 5e6   },
  XBRUSD: { basePrice: 82.5,  annualVol: 0.35, annualDrift: 0.02, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0003, baseVolume: 1.5e8 },
  WTI:    { basePrice: 78,    annualVol: 0.35, annualDrift: 0.02, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0003, baseVolume: 1.5e8 },
  BRENT:  { basePrice: 83,    annualVol: 0.34, annualDrift: 0.02, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0003, baseVolume: 1.5e8 },
  NGAS:   { basePrice: 2.20,  annualVol: 0.55, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.0005, baseVolume: 8e7   },
  GC25:   { basePrice: 2420,  annualVol: 0.15, annualDrift: 0.05, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0002, baseVolume: 1e8   },
  COCOA:  { basePrice: 9800,  annualVol: 0.40, annualDrift: 0.03, priceDecimals: 0, tickSize: 1,      avgSpread: 0.0005, baseVolume: 2e7   },
  COFFEE: { basePrice: 245,   annualVol: 0.30, annualDrift: 0.02, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0005, baseVolume: 3e7   },
  CORN:   { basePrice: 435,   annualVol: 0.25, annualDrift: 0.01, priceDecimals: 2, tickSize: 0.25,   avgSpread: 0.0005, baseVolume: 5e7   },
  COTTON: { basePrice: 75.5,  annualVol: 0.28, annualDrift: 0.01, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0005, baseVolume: 2e7   },
  OJ:     { basePrice: 285,   annualVol: 0.35, annualDrift: 0.01, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.001,  baseVolume: 5e6   },
  SOYBEAN:{ basePrice: 1055,  annualVol: 0.25, annualDrift: 0.01, priceDecimals: 2, tickSize: 0.25,   avgSpread: 0.0005, baseVolume: 3e7   },
  SUGAR:  { basePrice: 21.5,  annualVol: 0.30, annualDrift: 0.01, priceDecimals: 2, tickSize: 0.01,   avgSpread: 0.0005, baseVolume: 4e7   },
  WHEAT:  { basePrice: 540,   annualVol: 0.28, annualDrift: 0.01, priceDecimals: 2, tickSize: 0.25,   avgSpread: 0.0005, baseVolume: 4e7   },
  COPPER: { basePrice: 4.25,  annualVol: 0.25, annualDrift: 0.02, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.0005, baseVolume: 5e7   },
  LUMBER: { basePrice: 480,   annualVol: 0.45, annualDrift: 0.01, priceDecimals: 2, tickSize: 0.10,   avgSpread: 0.001,  baseVolume: 1e7   },
  HO:     { basePrice: 2.60,  annualVol: 0.38, annualDrift: 0.01, priceDecimals: 3, tickSize: 0.001,  avgSpread: 0.001,  baseVolume: 3e7   },
  // ── Indices ───────────────────────────────────────────────────────────────
  US500:   { basePrice: 5200,  annualVol: 0.18, annualDrift: 0.08, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 3e9  },
  USTEC:   { basePrice: 18000, annualVol: 0.22, annualDrift: 0.10, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 2e9  },
  US30:    { basePrice: 38500, annualVol: 0.16, annualDrift: 0.07, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 1e9  },
  UK100:   { basePrice: 7900,  annualVol: 0.16, annualDrift: 0.06, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 1.5e9 },
  DE40:    { basePrice: 18500, annualVol: 0.20, annualDrift: 0.08, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 1e9  },
  F40:     { basePrice: 8100,  annualVol: 0.18, annualDrift: 0.07, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 8e8  },
  JP225:   { basePrice: 38000, annualVol: 0.20, annualDrift: 0.07, priceDecimals: 0, tickSize: 1,    avgSpread: 0.0002, baseVolume: 2e9  },
  AUS200:  { basePrice: 7800,  annualVol: 0.16, annualDrift: 0.06, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 8e8  },
  STOXX50: { basePrice: 5050,  annualVol: 0.18, annualDrift: 0.07, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 8e8  },
  CA60:    { basePrice: 22000, annualVol: 0.16, annualDrift: 0.07, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 3e8  },
  CH20:    { basePrice: 11800, annualVol: 0.15, annualDrift: 0.06, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 2e8  },
  HK50:    { basePrice: 18500, annualVol: 0.22, annualDrift: 0.04, priceDecimals: 0, tickSize: 1,    avgSpread: 0.0003, baseVolume: 5e8  },
  ES35:    { basePrice: 11200, annualVol: 0.20, annualDrift: 0.06, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 2e8  },
  IT40:    { basePrice: 34000, annualVol: 0.22, annualDrift: 0.06, priceDecimals: 0, tickSize: 1,    avgSpread: 0.0003, baseVolume: 2e8  },
  NL25:    { basePrice: 875,   annualVol: 0.18, annualDrift: 0.06, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 1e8  },
  NO25:    { basePrice: 1380,  annualVol: 0.20, annualDrift: 0.05, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 5e7  },
  SING:    { basePrice: 3350,  annualVol: 0.16, annualDrift: 0.05, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 2e8  },
  PL40:    { basePrice: 2450,  annualVol: 0.22, annualDrift: 0.06, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0004, baseVolume: 1e8  },
  ZA50:    { basePrice: 74000, annualVol: 0.20, annualDrift: 0.05, priceDecimals: 0, tickSize: 1,    avgSpread: 0.0004, baseVolume: 2e8  },
  TW50:    { basePrice: 20500, annualVol: 0.20, annualDrift: 0.06, priceDecimals: 0, tickSize: 1,    avgSpread: 0.0004, baseVolume: 3e8  },
  IN50:    { basePrice: 22000, annualVol: 0.20, annualDrift: 0.08, priceDecimals: 0, tickSize: 1,    avgSpread: 0.0003, baseVolume: 2e8  },
  KO200:   { basePrice: 380,   annualVol: 0.20, annualDrift: 0.05, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 2e8  },
  DX:      { basePrice: 104.5, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0003, baseVolume: 5e9 },
  VIX:     { basePrice: 18.5,  annualVol: 1.00, annualDrift: 0.00, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.001,  baseVolume: 5e8  },
  EUSTX50: { basePrice: 5050,  annualVol: 0.18, annualDrift: 0.07, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 8e8  },
  // ── Government Bonds ──────────────────────────────────────────────────────
  TNOTE:  { basePrice: 108.5,  annualVol: 0.07, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0002, baseVolume: 5e9 },
  BUND:   { basePrice: 131.2,  annualVol: 0.08, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0002, baseVolume: 3e9 },
  GILT:   { basePrice: 95.8,   annualVol: 0.09, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0003, baseVolume: 2e9 },
  JGB:    { basePrice: 144.5,  annualVol: 0.05, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0002, baseVolume: 1e9 },
  OAT:    { basePrice: 128.9,  annualVol: 0.08, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0003, baseVolume: 1e9 },
  BTP:    { basePrice: 117.5,  annualVol: 0.10, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0004, baseVolume: 8e8 },
  AUB:    { basePrice: 96.2,   annualVol: 0.07, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0003, baseVolume: 5e8 },
  BONO:   { basePrice: 112.8,  annualVol: 0.09, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0004, baseVolume: 5e8 },
  USBOND: { basePrice: 109.5,  annualVol: 0.08, annualDrift: -0.01, priceDecimals: 3, tickSize: 0.001, avgSpread: 0.0002, baseVolume: 2e9 },
}


// ---------------------------------------------------------------------------
// GBM state per symbol
// ---------------------------------------------------------------------------
interface GBMState {
  price: number
  open24h: number
  high24h: number
  low24h: number
  volume24h: number
  lastTick: number
}

const gbmState: Record<string, GBMState> = {}
for (const sym of SYMBOLS) {
  const p = PARAMS[sym.symbol]
  gbmState[sym.symbol] = {
    price: p.basePrice,
    open24h: p.basePrice,
    high24h: p.basePrice * 1.015,
    low24h:  p.basePrice * 0.985,
    volume24h: p.baseVolume * 0.04,
    lastTick: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Live candle state (1-minute candle currently being built)
// ---------------------------------------------------------------------------
interface LiveCandle { open: number; high: number; low: number; close: number; volume: number; time: number }
const liveCandles: Record<string, LiveCandle> = {}
for (const sym of SYMBOLS) {
  const p = PARAMS[sym.symbol]
  const minuteTs = Math.floor(Date.now() / 60000) * 60
  liveCandles[sym.symbol] = { time: minuteTs, open: p.basePrice, high: p.basePrice, low: p.basePrice, close: p.basePrice, volume: 0 }
}

// ---------------------------------------------------------------------------
// Recent trades ring buffer (per symbol, max 100)
// ---------------------------------------------------------------------------
const recentTradesBuffer: Record<string, Trade[]> = {}
for (const sym of SYMBOLS) recentTradesBuffer[sym.symbol] = []

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function round(n: number, d: number): number {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

// ---------------------------------------------------------------------------
// GBM tick — called every 500ms per symbol
// ---------------------------------------------------------------------------
export function tickSymbol(symbol: string): { trade: Trade; candleUpdate: LiveCandle; isNewCandle: boolean } {
  const state = gbmState[symbol]
  const p = PARAMS[symbol]
  if (!state || !p) throw new Error(`Unknown symbol: ${symbol}`)

  const now = Date.now()
  const dtSec = Math.max((now - state.lastTick) / 1000, 0.001)
  state.lastTick = now

  // Geometric Brownian Motion: dS = S*(mu*dt + sigma*sqrt(dt)*Z)
  const annualSec = 252 * 6.5 * 3600
  const mu = p.annualDrift / annualSec
  const sigma = p.annualVol / Math.sqrt(annualSec)
  const z = randn()
  const ret = mu * dtSec + sigma * Math.sqrt(dtSec) * z
  const newPrice = round(state.price * Math.exp(ret), p.priceDecimals)

  state.price = newPrice
  state.high24h = Math.max(state.high24h, newPrice)
  state.low24h  = Math.min(state.low24h,  newPrice)

  // Volume tick
  const tickVol = round(randBetween(p.baseVolume * 0.000002, p.baseVolume * 0.00001), 4)
  state.volume24h += tickVol

  // Add a micro-trade to buffer
  const side = ret >= 0 ? 'buy' : 'sell'
  const trade: Trade = {
    id: uuidv4(),
    symbol,
    price: newPrice,
    size: round(tickVol, 4),
    side,
    timestamp: now,
  }
  recentTradesBuffer[symbol].unshift(trade)
  if (recentTradesBuffer[symbol].length > 100) recentTradesBuffer[symbol].pop()

  // Live candle management
  const minuteTs = Math.floor(now / 60000) * 60
  let isNewCandle = false
  let lc = liveCandles[symbol]

  if (minuteTs > lc.time) {
    // Emit the completed candle before rolling
    marketEvents.emit('candle', symbol, { ...lc })
    isNewCandle = true
    lc = { time: minuteTs, open: newPrice, high: newPrice, low: newPrice, close: newPrice, volume: tickVol }
    liveCandles[symbol] = lc
  } else {
    lc.close  = newPrice
    lc.high   = Math.max(lc.high, newPrice)
    lc.low    = Math.min(lc.low,  newPrice)
    lc.volume = round(lc.volume + tickVol, 4)
  }

  return { trade, candleUpdate: { ...lc }, isNewCandle }
}

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------
export function getLivePrice(symbol: string): number {
  return gbmState[symbol]?.price ?? PARAMS[symbol]?.basePrice ?? 100
}

export function getAssetClass(symbol: string): 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'bond' {
  const sym = SYMBOLS.find(s => s.symbol === symbol)
  return sym?.assetClass ?? 'stock'
}

export function getSymbolInfo(symbol: string) {
  return SYMBOLS.find(s => s.symbol === symbol) ?? null
}

/** Returns current market session for a stock (ET) – always 'regular' for crypto/forex */
export function getMarketSession(symbol: string): 'pre' | 'regular' | 'post' | 'closed' {
  const ac = getAssetClass(symbol)
  if (ac !== 'stock') return 'regular'
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const h = et.getHours(), m = et.getMinutes()
  const mins = h * 60 + m
  const day = et.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return 'closed'
  if (mins >= 4 * 60 && mins < 9 * 60 + 30)  return 'pre'
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'regular'
  if (mins >= 16 * 60 && mins < 20 * 60)     return 'post'
  return 'closed'
}

// ---------------------------------------------------------------------------
// Overnight swap rates — IC Markets typical values
//   Expressed as USD per 1 base-currency unit per night.
//   Positive  = credited,  negative = debited.
//   Source: IC Markets MetaTrader 4 swap specifications (approximate, 2025).
//   The engine multiplies by position.quantity to get total USD swap.
// ---------------------------------------------------------------------------
const SWAP_RATES: Record<string, { long: number; short: number }> = {
  // Forex Majors
  EURUSD: { long: -0.0000449, short:  0.0000155 },
  GBPUSD: { long: -0.0000459, short:  0.0000127 },
  USDJPY: { long:  0.0000202, short: -0.0000507 },
  USDCHF: { long:  0.0000145, short: -0.0000322 },
  USDCAD: { long:  0.0000052, short: -0.0000328 },
  AUDUSD: { long: -0.0000248, short:  0.0000033 },
  NZDUSD: { long: -0.0000218, short:  0.0000038 },
  // Forex Minors
  EURJPY: { long: -0.0000240, short: -0.0000160 },
  GBPJPY: { long:  0.0000135, short: -0.0000540 },
  EURGBP: { long: -0.0000110, short: -0.0000050 },
  EURCAD: { long: -0.0000200, short: -0.0000100 },
  EURCHF: { long: -0.0000080, short: -0.0000250 },
  EURAUD: { long: -0.0000300, short: -0.0000100 },
  EURNZD: { long: -0.0000280, short: -0.0000120 },
  GBPAUD: { long: -0.0000250, short: -0.0000150 },
  GBPCAD: { long: -0.0000200, short: -0.0000200 },
  GBPCHF: { long: -0.0000050, short: -0.0000350 },
  GBPNZD: { long: -0.0000230, short: -0.0000170 },
  AUDJPY: { long: -0.0000055, short: -0.0000250 },
  CADJPY: { long:  0.0000020, short: -0.0000300 },
  CHFJPY: { long:  0.0000010, short: -0.0000300 },
  AUDNZD: { long: -0.0000060, short: -0.0000100 },
  AUDCAD: { long: -0.0000080, short: -0.0000120 },
  AUDCHF: { long: -0.0000060, short: -0.0000190 },
  CADCHF: { long:  0.0000050, short: -0.0000200 },
  NZDJPY: { long: -0.0000030, short: -0.0000200 },
  NZDCAD: { long: -0.0000080, short: -0.0000100 },
  NZDCHF: { long: -0.0000050, short: -0.0000160 },
  // Forex Exotics (typically negative both sides)
  USDTRY: { long:  0.0001500, short: -0.0010000 },
  EURTRY: { long:  0.0001200, short: -0.0009000 },
  USDMXN: { long:  0.0000800, short: -0.0004000 },
  EURMXN: { long:  0.0000600, short: -0.0003500 },
  USDZAR: { long:  0.0001200, short: -0.0007000 },
  EURZAR: { long:  0.0001000, short: -0.0006500 },
  GBPZAR: { long:  0.0001100, short: -0.0006800 },
  USDNOK: { long: -0.0000100, short: -0.0000200 },
  USDSEK: { long: -0.0000100, short: -0.0000200 },
  USDPLN: { long:  0.0000100, short: -0.0000400 },
  USDCZK: { long:  0.0000050, short: -0.0000300 },
  USDDKK: { long: -0.0000050, short: -0.0000150 },
  USDHKD: { long:  0.0000020, short: -0.0000100 },
  USDCNH: { long:  0.0000100, short: -0.0000250 },
  USDSGD: { long: -0.0000050, short: -0.0000150 },
  USDTHB: { long:  0.0000200, short: -0.0000500 },
  USDHUF: { long:  0.0000150, short: -0.0000500 },
  USDILS: { long: -0.0000100, short: -0.0000300 },
  EURNOK: { long: -0.0000200, short: -0.0000100 },
  EURSEK: { long: -0.0000200, short: -0.0000100 },
  EURPLN: { long: -0.0000100, short: -0.0000300 },
  EURHUF: { long: -0.0000200, short: -0.0000400 },
  EURSGD: { long: -0.0000150, short: -0.0000200 },
  GBPNOK: { long: -0.0000150, short: -0.0000150 },
  GBPSEK: { long: -0.0000150, short: -0.0000150 },
  GBPPLN: { long: -0.0000100, short: -0.0000300 },
  GBPSGD: { long: -0.0000100, short: -0.0000200 },
  AUDSGD: { long: -0.0000050, short: -0.0000100 },
  AUDMXN: { long:  0.0000500, short: -0.0003000 },
  NZDSGD: { long: -0.0000050, short: -0.0000100 },
  NOKJPY: { long: -0.0000020, short: -0.0000150 },
  SGDJPY: { long: -0.0000020, short: -0.0000200 },
  EURCZK: { long: -0.0000100, short: -0.0000300 },
  // Precious Metals (triple swap on Wednesday — high carry cost to hold long)
  XAUUSD: { long: -0.0000634, short:  0.0000167 },
  XAGUSD: { long: -0.0000879, short:  0.0000175 },
  XPTUSD: { long: -0.0000500, short:  0.0000100 },
  XPDUSD: { long: -0.0000500, short:  0.0000100 },
  GC25:   { long: -0.0000634, short:  0.0000167 },
  // Energies (triple swap on Friday)
  WTI:    { long: -0.0000385, short: -0.0000385 },
  BRENT:  { long: -0.0000362, short: -0.0000362 },
  XBRUSD: { long: -0.0000362, short: -0.0000362 },
  NGAS:   { long: -0.0000455, short: -0.0000455 },
  HO:     { long: -0.0000385, short: -0.0000385 },
  LUMBER: { long: -0.0000300, short: -0.0000300 },
  COPPER: { long: -0.0000350, short: -0.0000350 },
  // Soft Commodities (triple swap on Wednesday)
  COCOA:   { long: -0.0000500, short: -0.0000500 },
  COFFEE:  { long: -0.0000500, short: -0.0000500 },
  CORN:    { long: -0.0000300, short: -0.0000300 },
  COTTON:  { long: -0.0000400, short: -0.0000400 },
  OJ:      { long: -0.0000500, short: -0.0000500 },
  SOYBEAN: { long: -0.0000300, short: -0.0000300 },
  SUGAR:   { long: -0.0000450, short: -0.0000450 },
  WHEAT:   { long: -0.0000300, short: -0.0000300 },
  // Indices (triple swap on Friday — typically negative both sides)
  US500:   { long: -0.0000593, short: -0.0000593 },
  USTEC:   { long: -0.0000509, short: -0.0000509 },
  US30:    { long: -0.0000209, short: -0.0000209 },
  UK100:   { long: -0.0000256, short: -0.0000256 },
  DE40:    { long: -0.0000119, short: -0.0000119 },
  F40:     { long: -0.0000124, short: -0.0000124 },
  JP225:   { long: -0.0001053, short: -0.0001053 },
  AUS200:  { long: -0.0000256, short: -0.0000256 },
  STOXX50: { long: -0.0000198, short: -0.0000198 },
  CA60:    { long: -0.0000455, short: -0.0000455 },
  CH20:    { long: -0.0000085, short: -0.0000085 },
  HK50:    { long: -0.0000541, short: -0.0000541 },
  ES35:    { long: -0.0000178, short: -0.0000178 },
  IT40:    { long: -0.0000294, short: -0.0000294 },
  NL25:    { long: -0.0000114, short: -0.0000114 },
  NO25:    { long: -0.0000365, short: -0.0000365 },
  SING:    { long: -0.0000274, short: -0.0000274 },
  PL40:    { long: -0.0000408, short: -0.0000408 },
  ZA50:    { long: -0.0000136, short: -0.0000136 },
  TW50:    { long: -0.0000492, short: -0.0000492 },
  IN50:    { long: -0.0000455, short: -0.0000455 },
  KO200:   { long: -0.0000547, short: -0.0000547 },
  DX:      { long: -0.0000200, short: -0.0000200 },
  VIX:     { long: -0.0005000, short: -0.0005000 },
  EUSTX50: { long: -0.0000198, short: -0.0000198 },
  // Bonds (triple swap on Wednesday)
  TNOTE:  { long: -0.0000509, short:  0.0000169 },
  BUND:   { long: -0.0000076, short: -0.0000262 },
  GILT:   { long: -0.0000419, short:  0.0000105 },
  JGB:    { long: -0.0000069, short: -0.0000207 },
  OAT:    { long: -0.0000078, short: -0.0000260 },
  BTP:    { long: -0.0000085, short: -0.0000255 },
  AUB:    { long: -0.0000207, short:  0.0000103 },
  BONO:   { long: -0.0000089, short: -0.0000267 },
  USBOND: { long: -0.0000275, short:  0.0000092 },
  // Crypto (triple swap on Friday — very high negative both sides)
  BTCUSD:   { long: -0.0004000, short: -0.0004000 },
  ETHUSD:   { long: -0.0003900, short: -0.0003900 },
  LTCUSD:   { long: -0.0004900, short: -0.0004900 },
  BCHUSD:   { long: -0.0004600, short: -0.0004600 },
  DSHUSD:   { long: -0.0005000, short: -0.0005000 },
  XRPUSD:   { long: -0.0005200, short: -0.0005200 },
  DOTUSD:   { long: -0.0005000, short: -0.0005000 },
  LNKUSD:   { long: -0.0005000, short: -0.0005000 },
  ADAUSD:   { long: -0.0005000, short: -0.0005000 },
  BNBUSD:   { long: -0.0004500, short: -0.0004500 },
  SOLUSD:   { long: -0.0004500, short: -0.0004500 },
  AVAXUSD:  { long: -0.0005000, short: -0.0005000 },
  MATICUSD: { long: -0.0005500, short: -0.0005500 },
  DOGEUSD:  { long: -0.0005500, short: -0.0005500 },
  XLMUSD:   { long: -0.0005500, short: -0.0005500 },
  XTZUSD:   { long: -0.0005000, short: -0.0005000 },
  UNIUSD:   { long: -0.0005000, short: -0.0005000 },
  EMCUSD:   { long: -0.0006000, short: -0.0006000 },
  NMCUSD:   { long: -0.0006000, short: -0.0006000 },
  PPCUSD:   { long: -0.0006000, short: -0.0006000 },
  LUNAUSD:  { long: -0.0008000, short: -0.0008000 },
  // Stocks — no overnight swap (CFD dividends handled separately)
}

/** Returns overnight swap rate: USD per base-currency unit per night.
 *  Falls back to a conservative default if the symbol is not listed. */
export function getSwapRate(symbol: string): { long: number; short: number } {
  if (SWAP_RATES[symbol]) return SWAP_RATES[symbol]
  const ac = getAssetClass(symbol)
  const defaults: Record<string, { long: number; short: number }> = {
    forex:     { long: -0.0000300, short: -0.0000100 },
    commodity: { long: -0.0000400, short: -0.0000200 },
    index:     { long: -0.0000400, short: -0.0000400 },
    crypto:    { long: -0.0005000, short: -0.0005000 },
    stock:     { long:  0,         short:  0          },
    bond:      { long: -0.0000300, short: -0.0000100 },
  }
  return defaults[ac] ?? { long: 0, short: 0 }
}

// ---------------------------------------------------------------------------
// Trading hours — IC Markets server time (GMT+2 / GMT+3 DST)
//   Forex / Currency pairs : Mon 00:01 – Fri 23:57
//   Gold (XAUUSD)          : Mon 01:02 – Fri 23:57
//   Other precious metals  : Mon 01:02 – Fri 23:59
//   Crypto CFDs            : 24/7 (no break)
//   Stocks CFDs            : exchange session only (US = 13:30–20:00 UTC)
//   Indices / Energies     : extended hours — mostly 24/5 with short breaks
//   Bonds                  : typically 00:05 – 23:55 Mon–Fri
// ---------------------------------------------------------------------------
function getServerMinutes(): { dayOfWeek: number; minuteOfDay: number } {
  const now = new Date()
  // Detect EET DST: last Sunday March → last Sunday October
  const y = now.getUTCFullYear()
  const marchLastSun = new Date(Date.UTC(y, 2, 31 - ((new Date(Date.UTC(y, 2, 31)).getUTCDay() + 7) % 7)))
  const octLastSun   = new Date(Date.UTC(y, 9, 31 - ((new Date(Date.UTC(y, 9, 31)).getUTCDay() + 7) % 7)))
  const isDST = now >= marchLastSun && now < octLastSun
  const offsetH = isDST ? 3 : 2
  const server = new Date(now.getTime() + offsetH * 3600 * 1000)
  return {
    dayOfWeek:   server.getUTCDay(),              // 0=Sun, 1=Mon, …, 5=Fri, 6=Sat
    minuteOfDay: server.getUTCHours() * 60 + server.getUTCMinutes(),
  }
}

export function isMarketOpen(symbol: string): boolean {
  const { dayOfWeek: dow, minuteOfDay: tod } = getServerMinutes()
  const ac = getAssetClass(symbol)

  // Weekend: all markets closed except crypto
  if (dow === 0 || dow === 6) return ac === 'crypto'

  switch (ac) {
    case 'crypto':
      return true  // 24/7

    case 'forex': {
      // Mon 00:01 / every weekday 00:01 – Fri 23:57
      if (dow === 1 && tod < 1)   return false  // Mon before 00:01
      if (dow === 5 && tod > 1437) return false  // Fri after 23:57
      return true
    }

    case 'commodity': {
      // Gold (XAUUSD): 01:02 – 23:57 Mon–Fri
      if (['XAUUSD','GC25'].includes(symbol)) {
        if (dow === 5 && tod > 1437) return false
        return tod >= 62
      }
      // Other precious metals: 01:02 – 23:59 Mon–Fri
      if (['XAGUSD','XPTUSD','XPDUSD'].includes(symbol)) {
        if (dow === 5 && tod > 1437) return false
        return tod >= 62
      }
      // Energies & softs: 01:00 – 23:55 Mon–Fri
      if (dow === 5 && tod > 1435) return false
      return tod >= 60
    }

    case 'index': {
      // US indices (US500, USTEC, US30): 01:00 – 23:59 Mon–Fri (CME/CBOT quasi-24h)
      if (['US500','USTEC','US30','VIX','DX'].includes(symbol)) {
        if (dow === 5 && tod > 1437) return false
        return tod >= 60
      }
      // European indices (UK100, DE40, F40, STOXX50, EUSTX50): 07:00 – 21:00 Mon–Fri
      if (['UK100','DE40','F40','STOXX50','EUSTX50','NL25','IT40','ES35','NO25','PL40'].includes(symbol)) {
        return tod >= 420 && tod <= 1260
      }
      // Asian indices: JP225 00:00–06:30 & 07:30–13:30, AUS200 02:30–08:30
      if (symbol === 'JP225')  return (tod < 390) || (tod >= 450 && tod <= 810)
      if (symbol === 'AUS200') return tod >= 150 && tod <= 510
      if (symbol === 'HK50')   return tod >= 90  && tod <= 540
      if (symbol === 'SING')   return tod >= 90  && tod <= 540
      if (symbol === 'IN50')   return tod >= 270 && tod <= 660
      if (symbol === 'KO200')  return tod >= 90  && tod <= 510
      if (symbol === 'TW50')   return tod >= 90  && tod <= 510
      // Default: 01:00 – 23:55 Mon–Fri
      return tod >= 60 && tod <= 1435
    }

    case 'stock': {
      // US stocks: 13:30 – 20:00 UTC = server min 810–1200 (GMT+2) / 870–1260 (GMT+3)
      const openMin  = 810  // 13:30 UTC (Mon–Fri, approx)
      const closeMin = 1200 // 20:00 UTC
      return tod >= openMin && tod <= closeMin
    }

    case 'bond': {
      // Bond futures: 00:05 – 23:55 Mon–Fri
      if (dow === 5 && tod > 1435) return false
      return tod >= 5 && tod <= 1435
    }

    default:
      return true
  }
}

export function getSpread(symbol: string): { bid: number; ask: number } {
  const p = PARAMS[symbol]
  const mid = getLivePrice(symbol)
  const half = round(mid * (p?.avgSpread ?? 0.0001) / 2, p?.priceDecimals ?? 4)
  return { bid: round(mid - half, p?.priceDecimals ?? 4), ask: round(mid + half, p?.priceDecimals ?? 4) }
}

export function getLiveCandle(symbol: string): LiveCandle {
  return { ...liveCandles[symbol] }
}

// ---------------------------------------------------------------------------
// Historical OHLCV with GBM seeding from current price
// ---------------------------------------------------------------------------
export function generateCandles(symbol: string, interval: string, limit = 300): Candle[] {
  const intervalMs: Record<string, number> = {
    '1m': 60_000, '3m': 180_000, '5m': 300_000, '15m': 900_000,
    '30m': 1_800_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
  }
  const ms = intervalMs[interval] ?? 3_600_000
  const p = PARAMS[symbol]
  if (!p) return []

  const now = Math.floor(Date.now() / ms) * ms
  // Anchor GBM simulation to the current real price (avoids stale basePrice)
  let price = getLivePrice(symbol)

  // Volatility scaled to candle interval
  const annualBars = (252 * 6.5 * 3600 * 1000) / ms
  const barVol = p.annualVol / Math.sqrt(annualBars)
  const barDrift = p.annualDrift / annualBars

  const candles: Candle[] = []
  for (let i = 0; i < limit; i++) {
    const time = Math.floor((now - (limit - i) * ms) / 1000)
    const open = price
    // Generate 5 intra-bar ticks for realistic OHLC
    let high = open, low = open, close = open
    for (let t = 0; t < 5; t++) {
      const tickRet = barDrift / 5 + (barVol / Math.sqrt(5)) * randn()
      close = round(close * Math.exp(tickRet), p.priceDecimals)
      high  = Math.max(high, close)
      low   = Math.min(low,  close)
    }
    const volume = round(randBetween(p.baseVolume * 0.001, p.baseVolume * 0.005) * (ms / 86_400_000), 2)
    candles.push({ time, open, high, low, close, volume })
    price = close
  }

  // Stitch the live candle prices into the last bar, but keep the formula-computed time.
  // liveCandles[symbol].time is set at module-init and never updated on Vercel serverless
  // (no tickSymbol interval runs), so using lc.time would embed a stale cold-start timestamp.
  const lc = liveCandles[symbol]
  if (lc) {
    const last = candles[candles.length - 1]
    candles[candles.length - 1] = {
      time:   last.time,              // keep the formula-derived current timestamp
      open:   last.open,
      high:   Math.max(last.high, lc.high),
      low:    Math.min(last.low, lc.low),
      close:  lc.close,              // real live price as close
      volume: lc.volume || last.volume,
    }
  }

  return candles
}

// ---------------------------------------------------------------------------
// Persistent ticker (uses tracked 24h stats)
// ---------------------------------------------------------------------------
export function generateTicker(symbol: string): Ticker {
  const state = gbmState[symbol]
  const p = PARAMS[symbol]
  if (!state || !p) return { symbol, price: 0, change: 0, changePercent: 0, high24h: 0, low24h: 0, volume24h: 0, timestamp: Date.now(), isOpen: false }
  const price = state.price
  const change = round(price - state.open24h, p.priceDecimals)
  const changePercent = round((change / state.open24h) * 100, 2)
  const { bid, ask } = getSpread(symbol)
  const spreadVal = round(ask - bid, p.priceDecimals)
  return {
    symbol, price, change, changePercent,
    high24h: state.high24h, low24h: state.low24h,
    volume24h: round(state.volume24h, 2),
    timestamp: Date.now(),
    bid, ask, spread: spreadVal,
    isOpen: isMarketOpen(symbol),
    session: getMarketSession(symbol),
  }
}

export function getAllTickers(): Ticker[] {
  return SYMBOLS.map(s => generateTicker(s.symbol))
}

// ---------------------------------------------------------------------------
// Professional order book with realistic spread + depth clustering
// ---------------------------------------------------------------------------
export function generateOrderBook(symbol: string, depth = 20): OrderBook {
  const { bid, ask } = getSpread(symbol)
  const p = PARAMS[symbol]

  const bids: OrderBookEntry[] = []
  const asks: OrderBookEntry[] = []
  let bidTotal = 0
  let askTotal = 0

  // Larger orders cluster near the spread, smaller further away
  for (let i = 1; i <= depth; i++) {
    const distanceFactor = Math.pow(i, 1.3)
    const bidPrice = round(bid - (i - 1) * p.tickSize * distanceFactor * randBetween(1, 2.5), p.priceDecimals)
    const askPrice = round(ask + (i - 1) * p.tickSize * distanceFactor * randBetween(1, 2.5), p.priceDecimals)

    // Volume is bigger near the spread (iceberg model)
    const baseSize = p.baseVolume * 0.000005
    const bidSize = round(baseSize * randBetween(0.3, 3) / i, 4)
    const askSize = round(baseSize * randBetween(0.3, 3) / i, 4)

    bidTotal += bidSize
    askTotal += askSize
    bids.push({ price: bidPrice, size: bidSize, total: round(bidTotal, 4) })
    asks.push({ price: askPrice, size: askSize, total: round(askTotal, 4) })
  }

  return {
    symbol, bids, asks, timestamp: Date.now(),
    spread:   asks.length && bids.length ? round(asks[0].price - bids[0].price, 8) : 0,
    midPrice: asks.length && bids.length ? round((asks[0].price + bids[0].price) / 2, 8) : 0,
  }
}

// ---------------------------------------------------------------------------
// Recent trades from ring buffer
// ---------------------------------------------------------------------------
export function getRecentTradesFromBuffer(symbol: string, count = 50): Trade[] {
  return recentTradesBuffer[symbol]?.slice(0, count) ?? []
}

export function generateRecentTrades(symbol: string, count = 50): Trade[] {
  return getRecentTradesFromBuffer(symbol, count)
}

// ---------------------------------------------------------------------------
// Boot: seed recent trades buffer with synthetic history
// ---------------------------------------------------------------------------
export function seedTradeHistory(): void {
  for (const sym of SYMBOLS) {
    const p = PARAMS[sym.symbol]
    let price = p.basePrice
    let t = Date.now() - 5 * 60 * 1000  // 5 minutes of history
    const buf: Trade[] = []
    while (t < Date.now()) {
      const interval = Math.floor(randBetween(300, 3000))
      t += interval
      const ret = (p.annualVol / Math.sqrt(252 * 6.5 * 3600)) * Math.sqrt(interval / 1000) * randn()
      price = round(price * Math.exp(ret), p.priceDecimals)
      buf.push({
        id: uuidv4(), symbol: sym.symbol, price,
        size: round(randBetween(p.baseVolume * 0.000002, p.baseVolume * 0.00002), 4),
        side: ret >= 0 ? 'buy' : 'sell', timestamp: t,
      })
    }
    recentTradesBuffer[sym.symbol] = buf.reverse().slice(0, 100)
  }
}

// Seed on import
seedTradeHistory()

// ---------------------------------------------------------------------------
// Real-price injection — called by realDataService on every live tick
// ---------------------------------------------------------------------------
export function injectRealPrice(symbol: string, price: number): void {
  const state = gbmState[symbol]
  const p = PARAMS[symbol]
  if (!state || !p || price <= 0) return
  const rounded = round(price, p.priceDecimals)
  state.price   = rounded
  state.high24h = Math.max(state.high24h, rounded)
  state.low24h  = Math.min(state.low24h,  rounded)
  // lastTick intentionally NOT updated — GBM still runs for smooth intra-tick movement

  // ── Also update the live 1-minute candle with the real price ──────────────
  // This ensures the current bar's close always reflects the real market price
  // even if the GBM ticker hasn't fired yet since the last real tick.
  const lc = liveCandles[symbol]
  if (lc) {
    lc.close = rounded
    lc.high  = Math.max(lc.high, rounded)
    lc.low   = Math.min(lc.low,  rounded)
  }
}

/** Inject full 24-hour stats seeded from Binance /ticker/24hr endpoint.
 *  Sets open24h so the ticker shows an accurate 24-hour change % on cold start. */
export function inject24hStats(
  symbol: string,
  openPrice: number,
  highPrice: number,
  lowPrice: number,
  volume24h: number,
): void {
  const state = gbmState[symbol]
  const p = PARAMS[symbol]
  if (!state || !p) return
  if (openPrice > 0) state.open24h  = round(openPrice, p.priceDecimals)
  if (highPrice  > 0) state.high24h = round(highPrice,  p.priceDecimals)
  if (lowPrice   > 0) state.low24h  = round(lowPrice,   p.priceDecimals)
  if (volume24h  > 0) state.volume24h = volume24h
}

// Auto-connect to live market feeds (Binance WS + Twelve Data WS)
// Skipped on Vercel (serverless) — prices are seeded via REST in api/[...path].ts instead
if (!process.env.VERCEL) {
  startRealDataFeeds(injectRealPrice, inject24hStats)
}
