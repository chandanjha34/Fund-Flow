/**
 * Kalshi API Integration
 * Connects FundFlow prediction markets with Kalshi's prediction market platform
 */

import { Configuration, ExchangeApi, PortfolioApi } from 'kalshi-typescript'

// Kalshi Configuration
const KALSHI_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_KALSHI_API_KEY || '',
  privateKeyPath: process.env.KALSHI_PRIVATE_KEY_PATH || '',
  privateKeyPem: process.env.KALSHI_PRIVATE_KEY_PEM || '',
  basePath: process.env.NEXT_PUBLIC_KALSHI_BASE_PATH || 'https://demo-api.kalshi.co/trade-api/v2'
}

export interface KalshiMarket {
  ticker: string
  event_ticker: string
  title: string
  subtitle: string
  yes_bid: number
  yes_ask: number
  no_bid: number
  no_ask: number
  last_price: number
  volume: number
  open_time: string
  close_time: string
  expiration_time: string
  status: string
  result?: string
}

export interface KalshiOrder {
  order_id: string
  client_order_id: string
  ticker: string
  side: 'yes' | 'no'
  type: 'limit' | 'market'
  quantity: number
  price?: number
  status: string
  created_time: string
}

/**
 * Initialize Kalshi configuration
 */
export function getKalshiConfig(): Configuration | null {
  try {
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      console.log('[Kalshi] Configuration skipped - browser environment')
      return null
    }

    if (!KALSHI_CONFIG.apiKey) {
      console.warn('[Kalshi] API key not configured. Set NEXT_PUBLIC_KALSHI_API_KEY in .env.local')
      return null
    }

    const config = new Configuration({
      apiKey: KALSHI_CONFIG.apiKey,
      basePath: KALSHI_CONFIG.basePath,
      ...(KALSHI_CONFIG.privateKeyPath && { privateKeyPath: KALSHI_CONFIG.privateKeyPath }),
      ...(KALSHI_CONFIG.privateKeyPem && { privateKeyPem: KALSHI_CONFIG.privateKeyPem })
    })

    console.log('[Kalshi] Configuration initialized')
    return config
  } catch (error) {
    console.error('[Kalshi] Configuration error:', error)
    return null
  }
}

/**
 * Check if Kalshi is configured and available
 */
export function isKalshiAvailable(): boolean {
  return Boolean(KALSHI_CONFIG.apiKey)
}

/**
 * Create a prediction market on Kalshi
 * Note: Kalshi has specific requirements for market creation
 * This is a simplified version - actual implementation may need admin approval
 */
export async function createKalshiMarket(
  title: string,
  options: string[],
  closeTime: Date
): Promise<string | null> {
  try {
    if (!isKalshiAvailable()) {
      console.log('[Kalshi] Not configured - using local-only mode')
      return null
    }

    // Note: Kalshi's API for creating markets typically requires special permissions
    // Most applications use existing markets or work with Kalshi team to create custom markets
    console.log('[Kalshi] Market creation requested:', { title, options, closeTime })
    
    // For now, we'll log the request and return null
    // In production, you would:
    // 1. Contact Kalshi team to create custom markets
    // 2. Or map to existing Kalshi markets
    // 3. Use their event/market creation API (if you have permissions)
    
    console.warn('[Kalshi] Custom market creation requires Kalshi team approval')
    return null
  } catch (error) {
    console.error('[Kalshi] Market creation error:', error)
    return null
  }
}

/**
 * Search for existing Kalshi markets that match criteria
 * Uses Next.js API route to avoid CORS issues
 */
export async function searchKalshiMarkets(query: string): Promise<KalshiMarket[]> {
  try {
    console.log('[Kalshi] Searching markets for:', query)
    
    // Call our internal API route which proxies to Kalshi
    const response = await fetch(`/api/kalshi/search?query=${encodeURIComponent(query)}`)
    
    if (!response.ok) {
      console.error('[Kalshi] API route returned status:', response.status)
      return []
    }
    
    const data = await response.json()
    
    if (data.success && data.markets) {
      console.log('[Kalshi] ✅ Found markets:', data.markets.length)
      return data.markets
    } else {
      console.warn('[Kalshi] No markets found:', data.error)
      return []
    }
  } catch (error: any) {
    console.error('[Kalshi] Search error:', error.message)
    return []
  }
}

/**
 * Place a bet on Kalshi
 */
export async function placeKalshiBet(
  ticker: string,
  side: 'yes' | 'no',
  amount: number,
  price?: number
): Promise<KalshiOrder | null> {
  try {
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      console.log('[Kalshi] Bet placement skipped - browser environment (local bet only)')
      return null
    }

    if (!isKalshiAvailable()) {
      console.log('[Kalshi] Not configured - bet placed locally only')
      return null
    }

    const config = getKalshiConfig()
    if (!config) return null

    const api = new PortfolioApi(config)
    
    console.log('[Kalshi] Bet placement requested:', { ticker, side, amount, price })
    
    try {
      const order = await api.createOrder({
        createOrderRequest: {
          ticker,
          action: side === 'yes' ? 'buy' : 'sell',
          side: side,
          count: amount,
          type: price ? 'limit' : 'market',
          ...(price && { yes_price: price })
        }
      })
      
      if (order.data?.order) {
        console.log('[Kalshi] ✅ Bet placed successfully:', order.data.order.order_id)
        return order.data.order as any
      }
      
      return null
    } catch (apiError: any) {
      console.error('[Kalshi] API order placement failed:', apiError.message)
      throw new Error(`Kalshi order failed: ${apiError.message || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('[Kalshi] Bet placement error:', error)
    throw error
  }
}

/**
 * Get market data from Kalshi
 */
export async function getKalshiMarketData(ticker: string): Promise<KalshiMarket | null> {
  try {
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      console.log('[Kalshi] Market data fetch skipped - browser environment')
      return null
    }

    if (!isKalshiAvailable()) {
      return null
    }

    const config = getKalshiConfig()
    if (!config) return null

    const api = new ExchangeApi(config)
    
    console.log('[Kalshi] Fetching market data for:', ticker)
    
    try {
      const response = await api.getMarket({ marketTicker: ticker })
      
      if (response.data?.market) {
        console.log('[Kalshi] ✅ Market data retrieved:', ticker)
        return response.data.market as any
      }
      
      return null
    } catch (apiError: any) {
      console.warn('[Kalshi] Market data fetch failed:', apiError.message)
      return null
    }
  } catch (error) {
    console.error('[Kalshi] Market data fetch error:', error)
    return null
  }
}

/**
 * Sync local proposal with Kalshi market
 */
export async function syncWithKalshi(
  proposalId: string,
  proposalData: {
    title: string
    description: string
    options: string[]
    totalStake: number
    closesAt: number
  }
): Promise<{
  synced: boolean
  kalshiTicker?: string
  message: string
}> {
  try {
    if (!isKalshiAvailable()) {
      return {
        synced: false,
        message: 'Kalshi not configured. Running in local-only mode.'
      }
    }

    console.log('[Kalshi] Attempting to sync proposal:', proposalId)
    
    // Strategy 1: Try to find matching existing market
    const existingMarkets = await searchKalshiMarkets(proposalData.title)
    if (existingMarkets.length > 0) {
      console.log('[Kalshi] Found matching market:', existingMarkets[0].ticker)
      return {
        synced: true,
        kalshiTicker: existingMarkets[0].ticker,
        message: 'Linked to existing Kalshi market'
      }
    }

    // Strategy 2: Request custom market creation
    const ticker = await createKalshiMarket(
      proposalData.title,
      proposalData.options,
      new Date(proposalData.closesAt)
    )

    if (ticker) {
      return {
        synced: true,
        kalshiTicker: ticker,
        message: 'Custom Kalshi market created'
      }
    }

    // Fallback: Local only
    return {
      synced: false,
      message: 'Kalshi market creation pending approval. Using local market for now.'
    }
  } catch (error) {
    console.error('[Kalshi] Sync error:', error)
    return {
      synced: false,
      message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get Kalshi market liquidity and odds
 */
export async function getKalshiOdds(ticker: string): Promise<{
  yesPrice: number
  noPrice: number
  liquidity: number
} | null> {
  try {
    if (!isKalshiAvailable()) {
      return null
    }

    const market = await getKalshiMarketData(ticker)
    if (!market) {
      return null
    }

    return {
      yesPrice: market.last_price,
      noPrice: 100 - market.last_price,
      liquidity: market.volume
    }
  } catch (error) {
    console.error('[Kalshi] Odds fetch error:', error)
    return null
  }
}

/**
 * Setup instructions for Kalshi integration
 */
export function getKalshiSetupInstructions(): string {
  return `
📊 Kalshi Integration Setup

To connect your prediction markets to Kalshi's real market infrastructure:

1. Create a Kalshi Account
   - Go to https://kalshi.com
   - Sign up for an account
   - Verify your identity (required for real money trading)

2. Get API Credentials
   - Login to Kalshi dashboard
   - Navigate to API settings
   - Generate an API key and download your private key

3. Configure Environment Variables
   Add these to your .env.local file:

   NEXT_PUBLIC_KALSHI_API_KEY=your_api_key_here
   KALSHI_PRIVATE_KEY_PEM=your_private_key_pem_content
   NEXT_PUBLIC_KALSHI_BASE_PATH=https://api.elections.kalshi.com/trade-api/v2

4. Production vs Demo
   - Demo API: https://demo-api.kalshi.co/trade-api/v2
   - Production API: https://api.elections.kalshi.com/trade-api/v2

5. Market Creation
   - Contact Kalshi team for custom market creation
   - Or map your proposals to existing Kalshi markets

Current Status: ${isKalshiAvailable() ? '✅ Configured' : '❌ Not configured (local mode)'}

Note: Without Kalshi credentials, your app runs in local-only mode with
full functionality but without connection to real prediction market liquidity.
  `.trim()
}

