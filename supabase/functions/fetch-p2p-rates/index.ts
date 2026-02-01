import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch real Binance P2P rates
async function fetchBinanceP2P(
  fiat: string, 
  crypto: string, 
  filters?: {
    noVerificationRequired?: boolean;
    onlyTradable?: boolean;
    minAmount?: number;
    paymentMethods?: string[];
  }
) {
  try {
    const payTypes = filters?.paymentMethods?.map(m => m.toUpperCase().replace(/ /g, '_')) || [];
    
    const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset: crypto,
        fiat: fiat,
        merchantCheck: filters?.noVerificationRequired ? false : undefined,
        page: 1,
        payTypes: payTypes.length > 0 ? payTypes : [],
        publisherType: null,
        rows: 10,
        tradeType: 'BUY',
        transAmount: filters?.minAmount || undefined
      })
    });

    const buyData = await response.json();
    
    const sellResponse = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset: crypto,
        fiat: fiat,
        merchantCheck: filters?.noVerificationRequired ? false : undefined,
        page: 1,
        payTypes: payTypes.length > 0 ? payTypes : [],
        publisherType: null,
        rows: 10,
        tradeType: 'SELL',
        transAmount: filters?.minAmount || undefined
      })
    });

    const sellData = await sellResponse.json();

    if (!buyData.data || !sellData.data) return null;

    let buyAds = buyData.data;
    let sellAds = sellData.data;

    // Apply filters
    if (filters?.onlyTradable) {
      buyAds = buyAds.filter((ad: any) => ad.adv?.tradableQuantity > 0);
      sellAds = sellAds.filter((ad: any) => ad.adv?.tradableQuantity > 0);
    }

    const bestBuy = buyAds[0]?.adv;
    const bestSell = sellAds[0]?.adv;

    if (!bestBuy || !bestSell) return null;

    // Construct Binance P2P URL
    const tradeUrl = `https://p2p.binance.com/en/trade/all-payments/${crypto}?fiat=${fiat}`;

    return {
      exchange: 'Binance',
      buyPrice: parseFloat(bestBuy.price),
      sellPrice: parseFloat(bestSell.price),
      available: parseFloat(bestBuy.surplusAmount || bestBuy.tradableQuantity || '0'),
      limit: `${bestBuy.minSingleTransAmount} - ${bestBuy.dynamicMaxSingleTransAmount} ${fiat}`,
      paymentMethod: bestBuy.tradeMethods?.map((m: any) => m.identifier || m.tradeMethodName).join(', ') || 'Multiple',
      tradeUrl
    };
  } catch (error) {
    console.error('Binance P2P error:', error);
    return null;
  }
}

// Fetch real OKX P2P rates
async function fetchOKXP2P(fiat: string, crypto: string) {
  try {
    const buyResponse = await fetch('https://www.okx.com/api/v5/market/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        side: 'buy',
        baseCurrency: crypto,
        quoteCurrency: fiat,
        paymentMethod: 'all'
      })
    });

    const buyData = await buyResponse.json();
    console.log('OKX buy response:', JSON.stringify(buyData));
    
    const sellResponse = await fetch('https://www.okx.com/api/v5/market/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        side: 'sell',
        baseCurrency: crypto,
        quoteCurrency: fiat,
        paymentMethod: 'all'
      })
    });

    const sellData = await sellResponse.json();
    console.log('OKX sell response:', JSON.stringify(sellData));

    if (!buyData.data?.length || !sellData.data?.length) {
      console.log('OKX: No data available for', crypto, fiat);
      return null;
    }

    const bestBuy = buyData.data[0];
    const bestSell = sellData.data[0];

    // Construct OKX P2P URL
    const tradeUrl = `https://www.okx.com/p2p-markets/${crypto.toLowerCase()}-${fiat.toLowerCase()}/buy`;

    return {
      exchange: 'OKX',
      buyPrice: parseFloat(bestBuy.price),
      sellPrice: parseFloat(bestSell.price),
      available: parseFloat(bestBuy.availableAmount || '0'),
      limit: `${bestBuy.minAmount} - ${bestBuy.maxAmount} ${fiat}`,
      paymentMethod: bestBuy.paymentMethods?.join(', ') || 'Multiple',
      tradeUrl
    };
  } catch (error) {
    console.error('OKX P2P error:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Fetch real Bybit P2P rates
async function fetchBybitP2P(fiat: string, crypto: string) {
  try {
    const buyResponse = await fetch('https://api2.bybit.com/fiat/otc/item/online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId: crypto,
        currencyId: fiat,
        side: '1', // Buy
        size: '10',
        page: '1'
      })
    });

    const buyData = await buyResponse.json();
    
    const sellResponse = await fetch('https://api2.bybit.com/fiat/otc/item/online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId: crypto,
        currencyId: fiat,
        side: '0', // Sell
        size: '10',
        page: '1'
      })
    });

    const sellData = await sellResponse.json();

    if (!buyData.result?.items || !sellData.result?.items) return null;

    const bestBuy = buyData.result.items[0];
    const bestSell = sellData.result.items[0];

    if (!bestBuy || !bestSell) return null;

    // Construct Bybit P2P URL
    const tradeUrl = `https://www.bybit.com/fiat/trade/otc?actionType=1&token=${crypto}&fiat=${fiat}&paymentMethod=`;

    return {
      exchange: 'Bybit',
      buyPrice: parseFloat(bestBuy.price),
      sellPrice: parseFloat(bestSell.price),
      available: parseFloat(bestBuy.lastQuantity || '0'),
      limit: `${bestBuy.minAmount} - ${bestBuy.maxAmount} ${fiat}`,
      paymentMethod: bestBuy.payments?.map((p: any) => p.name).join(', ') || 'Multiple',
      tradeUrl
    };
  } catch (error) {
    console.error('Bybit P2P error:', error);
    return null;
  }
}

// Fetch real Huobi/HTX P2P rates
async function fetchHuobiP2P(fiat: string, crypto: string) {
  try {
    const buyResponse = await fetch(`https://otc-api.trygofast.com/v1/data/trade-market?coinId=${crypto.toLowerCase()}&currency=${fiat.toLowerCase()}&tradeType=buy&currPage=1&payMethod=0&acceptOrder=0&country=&blockType=general&online=1&range=0&amount=`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const buyData = await buyResponse.json();
    console.log('Huobi buy response:', JSON.stringify(buyData));
    
    const sellResponse = await fetch(`https://otc-api.trygofast.com/v1/data/trade-market?coinId=${crypto.toLowerCase()}&currency=${fiat.toLowerCase()}&tradeType=sell&currPage=1&payMethod=0&acceptOrder=0&country=&blockType=general&online=1&range=0&amount=`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const sellData = await sellResponse.json();
    console.log('Huobi sell response:', JSON.stringify(sellData));

    if (!buyData.data?.length || !sellData.data?.length) {
      console.log('Huobi: No data available for', crypto, fiat);
      return null;
    }

    const bestBuy = buyData.data[0];
    const bestSell = sellData.data[0];

    // Construct Huobi/HTX P2P URL
    const tradeUrl = `https://www.htx.com/en-us/fiat-crypto/trade/buy-${crypto.toLowerCase()}`;

    return {
      exchange: 'Huobi',
      buyPrice: parseFloat(bestBuy.price),
      sellPrice: parseFloat(bestSell.price),
      available: parseFloat(bestBuy.tradeCount || bestBuy.stock || '0'),
      limit: `${bestBuy.minTradeLimit} - ${bestBuy.maxTradeLimit} ${fiat}`,
      paymentMethod: bestBuy.payMethod?.join(', ') || 'Multiple',
      tradeUrl
    };
  } catch (error) {
    console.error('Huobi P2P error:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Fetch real KuCoin P2P rates
async function fetchKuCoinP2P(fiat: string, crypto: string) {
  try {
    const buyResponse = await fetch(`https://www.kucoin.com/_api/otc/ad/list?currency=${crypto}&legal=${fiat}&side=buy&page=1&pageSize=10`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const buyData = await buyResponse.json();
    console.log('KuCoin buy response:', JSON.stringify(buyData));
    
    const sellResponse = await fetch(`https://www.kucoin.com/_api/otc/ad/list?currency=${crypto}&legal=${fiat}&side=sell&page=1&pageSize=10`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const sellData = await sellResponse.json();
    console.log('KuCoin sell response:', JSON.stringify(sellData));

    if (!buyData.items?.length || !sellData.items?.length) {
      console.log('KuCoin: No data available for', crypto, fiat);
      return null;
    }

    const bestBuy = buyData.items[0];
    const bestSell = sellData.items[0];

    // Construct KuCoin P2P URL
    const tradeUrl = `https://www.kucoin.com/fiat/${crypto}/${fiat}`;

    return {
      exchange: 'KuCoin',
      buyPrice: parseFloat(bestBuy.price),
      sellPrice: parseFloat(bestSell.price),
      available: parseFloat(bestBuy.availableAmount || '0'),
      limit: `${bestBuy.minAmount} - ${bestBuy.maxAmount} ${fiat}`,
      paymentMethod: bestBuy.payTypes?.join(', ') || 'Multiple',
      tradeUrl
    };
  } catch (error) {
    console.error('KuCoin P2P error:', error instanceof Error ? error.message : error);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      fiat, 
      crypto, 
      exchanges, 
      noVerificationRequired,
      onlyTradable,
      minAmount,
      paymentMethods 
    } = await req.json();
    
    const filters = {
      noVerificationRequired,
      onlyTradable,
      minAmount,
      paymentMethods
    };
    
    console.log(`Fetching P2P rates for ${crypto}/${fiat} on exchanges:`, exchanges);
    console.log('Applied filters:', filters);
    
    const rates = [];
    
    // Fetch real data from all exchanges in parallel
    const fetchPromises = exchanges.map(async (exchange: string) => {
      console.log(`Attempting to fetch ${exchange} for ${crypto}/${fiat}`);
      let result = null;
      
      switch (exchange) {
        case 'Binance':
          result = await fetchBinanceP2P(fiat, crypto, filters);
          break;
        case 'OKX':
          result = await fetchOKXP2P(fiat, crypto);
          break;
        case 'Bybit':
          result = await fetchBybitP2P(fiat, crypto);
          break;
        case 'Huobi':
          result = await fetchHuobiP2P(fiat, crypto);
          break;
        case 'KuCoin':
          result = await fetchKuCoinP2P(fiat, crypto);
          break;
      }
      
      if (result) {
        console.log(`${exchange} returned data successfully`);
      } else {
        console.log(`${exchange} returned null - no data available`);
      }
      
      return result;
    });
    
    const results = await Promise.all(fetchPromises);
    
    // Filter out null results and add to rates array
    for (const result of results) {
      if (result) {
        rates.push(result);
      }
    }
    
    return new Response(
      JSON.stringify({ rates }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in fetch-p2p-rates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});