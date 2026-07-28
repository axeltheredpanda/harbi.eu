export type Quote = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
};

const WATCHLIST = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
] as const;

async function fetchYahooQuote(symbol: string): Promise<Quote> {
  const meta = WATCHLIST.find((item) => item.symbol === symbol)!;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; harbi.eu/1.0)" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return { symbol, name: meta.name, price: null, changePercent: null };
  }

  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number };
      }>;
    };
  };

  const result = json.chart?.result?.[0]?.meta;
  const price = result?.regularMarketPrice ?? null;
  const previous = result?.previousClose ?? result?.chartPreviousClose ?? null;
  const changePercent =
    price != null && previous != null && previous !== 0
      ? ((price - previous) / previous) * 100
      : null;

  return { symbol, name: meta.name, price, changePercent };
}

export async function getWatchlistQuotes(): Promise<Quote[]> {
  return Promise.all(WATCHLIST.map((item) => fetchYahooQuote(item.symbol)));
}

export { WATCHLIST };
