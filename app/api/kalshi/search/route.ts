import { NextRequest, NextResponse } from 'next/server'

const KALSHI_API_KEY = process.env.NEXT_PUBLIC_KALSHI_API_KEY || ''
const KALSHI_BASE_PATH = process.env.NEXT_PUBLIC_KALSHI_BASE_PATH || 'https://demo-api.kalshi.co/trade-api/v2'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query') || ''
    
    console.log('[Kalshi API Route] Searching for:', query)
    
    if (!KALSHI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Kalshi API key not configured',
        markets: [] 
      })
    }
    
    // Build Kalshi API URL with search parameters
    const params = new URLSearchParams({
      limit: '50',
      status: 'open'
    })
    
    // Add search query if provided
    if (query) {
      params.append('search', query)
    }
    
    const kalshiUrl = `${KALSHI_BASE_PATH}/events?${params.toString()}`
    console.log('[Kalshi API Route] Fetching:', kalshiUrl)
    
    // Fetch from Kalshi API (server-side, no CORS issues)
    const response = await fetch(kalshiUrl, {
      headers: {
        'Authorization': `Bearer ${KALSHI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('[Kalshi API Route] API returned status:', response.status)
      return NextResponse.json({ 
        success: false, 
        error: `API returned ${response.status}`,
        markets: [] 
      })
    }
    
    const data = await response.json()
    
    if (data?.events && Array.isArray(data.events)) {
      console.log('[Kalshi API Route] ✅ Received', data.events.length, 'events from Kalshi')
      
      // Convert all events to market format
      // Use a Map to deduplicate by ticker
      const marketsMap = new Map<string, any>()
      
      data.events.forEach((event: any) => {
        // Check if event has nested markets first
        if (event.markets && Array.isArray(event.markets) && event.markets.length > 0) {
          // Prefer nested markets over event itself
          event.markets.forEach((market: any) => {
            const ticker = market.ticker || market.series_ticker || `MARKET-${Date.now()}-${Math.random()}`
            if (!marketsMap.has(ticker)) {
              marketsMap.set(ticker, {
                ticker: ticker,
                event_ticker: market.event_ticker || event.event_ticker || ticker,
                title: market.title || event.title || 'Untitled Market',
                subtitle: market.subtitle || market.ticker_name || event.subtitle || event.category || '',
                yes_bid: market.yes_bid || 50,
                yes_ask: market.yes_ask || 52,
                no_bid: market.no_bid || 48,
                no_ask: market.no_ask || 50,
                last_price: market.last_price || 50,
                volume: market.volume || event.volume || 0,
                open_time: market.open_time || event.open_time || new Date().toISOString(),
                close_time: market.close_time || event.close_time || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                expiration_time: market.expiration_time || market.close_time || event.expiration_time || event.close_time || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: market.status || event.status || 'open'
              })
            }
          })
        } else {
          // No nested markets, convert event itself to market
          const ticker = event.series_ticker || event.event_ticker || `EVENT-${Date.now()}-${Math.random()}`
          if (!marketsMap.has(ticker)) {
            marketsMap.set(ticker, {
              ticker: ticker,
              event_ticker: event.event_ticker || event.series_ticker,
              title: event.title || 'Untitled Event',
              subtitle: event.subtitle || event.category || '',
              yes_bid: 50,
              yes_ask: 52,
              no_bid: 48,
              no_ask: 50,
              last_price: 50,
              volume: event.volume || 0,
              open_time: event.open_time || new Date().toISOString(),
              close_time: event.close_time || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              expiration_time: event.expiration_time || event.close_time || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: event.status || 'open'
            })
          }
        }
      })
      
      const uniqueMarkets = Array.from(marketsMap.values())
      console.log('[Kalshi API Route] ✅ Returning', uniqueMarkets.length, 'unique markets')
      
      return NextResponse.json({
        success: true,
        markets: uniqueMarkets.slice(0, 20) // Increased limit to show more results
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'No events in response',
      markets: [] 
    })
    
  } catch (error: any) {
    console.error('[Kalshi API Route] Error:', error.message)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      markets: [] 
    })
  }
}

