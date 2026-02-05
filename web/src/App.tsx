import { useState, useEffect, useMemo, useRef } from 'react';
import './index.css';

interface TableRow {
  symbol: string;
  lighterFunding?: number;
  binanceFunding?: number;
  hyperliquidFunding?: number;
  edgexFunding?: number;
  grvtFunding?: number;
  asterFunding?: number;
  backpackFunding?: number;
  variationalFunding?: number;
  paradexFunding?: number;
  etherealFunding?: number;
  dydxFunding?: number;
  nadoFunding?: number;
  
  binanceSpread?: number;
  asterSpread?: number;
  paradexSpread?: number;
  variationalSpread?: number;
  grvtSpread?: number;
  etherealSpread?: number;
  nadoSpread?: number;

  maxArbSpread?: number;
  shortExchange?: string;
  longExchange?: string;
  shortExchangeSpread?: number;
  longExchangeSpread?: number;
  estimatedProfit?: number;
  netProfit?: number;
  bidAskSpread?: number;
  openCost?: number;
  closeCost?: number;
  marketPrices?: Record<string, { bid: number; ask: number }>;
  longBuyPrice?: number;
  shortSellPrice?: number;
  priceDiff?: number;
  shortBuyPrice?: number;
  longSellPrice?: number;
  closePriceDiff?: number;
  [key: string]: any;
}

const EXCHANGES = [
  { key: 'lighterFunding', label: 'Lighter' },
  { key: 'binanceFunding', label: 'Binance' },
  { key: 'hyperliquidFunding', label: 'Hyperliquid' },
  { key: 'edgexFunding', label: 'Edgex' },
  { key: 'grvtFunding', label: 'GRVT' },
  { key: 'asterFunding', label: 'Aster' },
  { key: 'backpackFunding', label: 'Backpack' },
  { key: 'variationalFunding', label: 'Variational' },
  { key: 'paradexFunding', label: 'Paradex' },
  { key: 'etherealFunding', label: 'Ethereal' },
  { key: 'dydxFunding', label: 'dYdX' },
  { key: 'nadoFunding', label: 'Nado' },
];

function formatRate(value: number | undefined | null) {
  if (value === undefined || value === null) return '-';
  const percent = value * 100;
  return percent.toFixed(4) + '%';
}

function getClass(value: number | undefined | null) {
  if (value === undefined || value === null) return 'neutral';
  return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
}

function getPercentile(value: number, history: number[]) {
  if (!history || history.length === 0) return 0;
  const sorted = [...history, value].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v === value);
  return Math.round((index / (sorted.length - 1)) * 100);
}

const HistogramModal = ({ data, title, onClose }: { data: number[], title: string, onClose: () => void }) => {
  const buckets = 20;
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.0001; // Avoid divide by zero
  const bucketSize = range / buckets;

  const histogram = new Array(buckets).fill(0);
  data.forEach(val => {
    const bucketIndex = Math.min(Math.floor((val - min) / bucketSize), buckets - 1);
    histogram[bucketIndex]++;
  });

  const maxCount = Math.max(...histogram);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#2a2a2a', padding: '20px', borderRadius: '8px', minWidth: '400px', maxWidth: '90%'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{marginTop: 0, color: '#e0e0e0'}}>{title} Distribution (Last ~10m)</h3>
        <div style={{display: 'flex', alignItems: 'flex-end', height: '200px', gap: '2px', padding: '10px 0'}}>
          {histogram.map((count, i) => (
            <div key={i} style={{
              flex: 1,
              background: '#4caf50',
              height: `${(count / maxCount) * 100}%`,
              position: 'relative',
              minHeight: '1px'
            }} title={`Range: ${formatRate(min + i * bucketSize)} - ${formatRate(min + (i + 1) * bucketSize)}\nCount: ${count}`}>
            </div>
          ))}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', color: '#888', marginTop: '5px'}}>
          <span>{formatRate(min)}</span>
          <span>{formatRate(max)}</span>
        </div>
        <div style={{textAlign: 'right', marginTop: '15px'}}>
           <button onClick={onClose} style={{
             background: '#333', color: '#fff', border: '1px solid #555',
             padding: '5px 15px', borderRadius: '4px', cursor: 'pointer'
           }}>Close</button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [visibleExchanges, setVisibleExchanges] = useState<Record<string, boolean>>(
    EXCHANGES.reduce((acc, ex) => ({ ...acc, [ex.key]: true }), {})
  );
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'netProfit',
    direction: 'desc',
  });
  const [loading, setLoading] = useState(true);
  const [capital, setCapital] = useState<number>(1000);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [filterProfitable, setFilterProfitable] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<{ data: number[], title: string } | null>(null);
  const historyRef = useRef<Record<string, { openCosts: number[], closeCosts: number[] }>>({});



  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/rates');
        const data = await res.json();
        setRows(data.rows);
        setLastUpdated(data.lastUpdated);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch rates", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const toggleExchange = (key: string) => {
    setVisibleExchanges((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const processedRows = useMemo(() => {
    return rows.map(row => {
      let maxRate = -Infinity;
      let minRate = Infinity;
      let maxExchange = '';
      let minExchange = '';
      
      EXCHANGES.forEach(ex => {
          if (!visibleExchanges[ex.key]) return;

          const rate = row[ex.key] as number | undefined | null;
          if (rate !== undefined && rate !== null) {
              if (rate > maxRate) {
                  maxRate = rate;
                  maxExchange = ex.label;
              }
              if (rate < minRate) {
                  minRate = rate;
                  minExchange = ex.label;
              }
          }
      });

      if (maxExchange && minExchange && maxExchange !== minExchange) {
          const spread = maxRate - minRate;
          const getSpread = (exKey: string) => {
              if (exKey === 'binanceFunding') return row.binanceSpread ?? 0.0002;
              if (exKey === 'asterFunding') return row.asterSpread ?? 0.0005;
              if (exKey === 'paradexFunding') return row.paradexSpread ?? 0.0005;
              if (exKey === 'variationalFunding') return row.variationalSpread ?? 0.001;
              if (exKey === 'grvtFunding') return row.grvtSpread ?? 0.0005;
              if (exKey === 'etherealFunding') return row.etherealSpread ?? 0.0005;
              if (exKey === 'nadoFunding') return row.nadoSpread ?? 0.0005;
              return 0.0005;
          };

          const shortExchangeKey = EXCHANGES.find(e => e.label === maxExchange)?.key || '';
          const longExchangeKey = EXCHANGES.find(e => e.label === minExchange)?.key || '';

          const shortSpread = getSpread(shortExchangeKey);
          const longSpread = getSpread(longExchangeKey);

          let openCost: number | null = null;
          let closeCost: number | null = null;
          let longBuyPrice = 0;
          let shortSellPrice = 0;
          let priceDiff = 0;
          let shortBuyPrice = 0;
          let longSellPrice = 0;
          let closePriceDiff = 0;

          if (row.marketPrices) {
              const getSource = (key: string) => key.replace('Funding', '').toLowerCase();
              const shortSource = getSource(shortExchangeKey);
              const longSource = getSource(longExchangeKey);

              const shortPrices = row.marketPrices[shortSource];
              const longPrices = row.marketPrices[longSource];

              if (shortPrices && longPrices) {
                  const sellPriceOpen = shortPrices.bid;
                  const buyPriceOpen = longPrices.ask;
                  longBuyPrice = buyPriceOpen;
                  shortSellPrice = sellPriceOpen;
                  priceDiff = buyPriceOpen - sellPriceOpen;

                  if (sellPriceOpen > 0) {
                      openCost = (buyPriceOpen - sellPriceOpen) / sellPriceOpen;
                  }

                  const buyPriceClose = shortPrices.ask;
                  const sellPriceClose = longPrices.bid;
                  shortBuyPrice = buyPriceClose;
                  longSellPrice = sellPriceClose;
                  closePriceDiff = buyPriceClose - sellPriceClose;

                  if (buyPriceClose > 0) {
                      closeCost = (buyPriceClose - sellPriceClose) / buyPriceClose;
                  }
              }
          }

          if (openCost === null || closeCost === null) {
              const totalEstimatedSpread = getSpread(shortExchangeKey) + getSpread(longExchangeKey);
              openCost = totalEstimatedSpread / 2;
              closeCost = totalEstimatedSpread / 2;
          }

          const grossProfit = capital * spread * 3;
          const totalCostRate = (openCost || 0) + (closeCost || 0);
          const totalCostAmount = totalCostRate * capital;
          const netProfit = grossProfit - totalCostAmount;

          return {
              ...row,
              maxArbSpread: spread,
              shortExchange: maxExchange,
              longExchange: minExchange,
              shortExchangeSpread: shortSpread,
              longExchangeSpread: longSpread,
              estimatedProfit: grossProfit,
              openCost: openCost,
              closeCost: closeCost,
              netProfit: netProfit,
              longBuyPrice,
              shortSellPrice,
              priceDiff,
              shortBuyPrice,
              longSellPrice,
              closePriceDiff
          };
      }

      return {
          ...row,
          maxArbSpread: 0,
          shortExchange: undefined,
          longExchange: undefined,
          shortExchangeSpread: 0,
          longExchangeSpread: 0,
          estimatedProfit: 0,
          openCost: 0,
          closeCost: 0,
          netProfit: -Infinity,
          longBuyPrice: 0,
          shortSellPrice: 0,
          priceDiff: 0,
          shortBuyPrice: 0,
          longSellPrice: 0,
          closePriceDiff: 0
      };
    });
  }, [rows, visibleExchanges, capital]);

  useEffect(() => {
    processedRows.forEach(row => {
        if (!historyRef.current[row.symbol]) {
            historyRef.current[row.symbol] = { openCosts: [], closeCosts: [] };
        }
        const h = historyRef.current[row.symbol];
        if (!h) return;
        
        if (typeof row.openCost === 'number') {
            h.openCosts.push(row.openCost);
            if (h.openCosts.length > 120) h.openCosts.shift();
        }
        if (typeof row.closeCost === 'number') {
            h.closeCosts.push(row.closeCost);
            if (h.closeCosts.length > 120) h.closeCosts.shift();
        }
    });
  }, [processedRows]);

  const sortedRows = useMemo(() => {
    const filtered = processedRows.filter(row => {
      const matchesSymbol = row.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      if (!matchesSymbol) return false;

      if (filterProfitable) {
        return (row.netProfit || 0) > 0;
      }
      return true;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const numA = Number(aVal);
      const numB = Number(bVal);
      return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
    });
    return sorted;
  }, [processedRows, sortConfig, symbolFilter, filterProfitable]);

  const topOpportunities = useMemo(() => {
    return [...processedRows]
      .sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0))
      .slice(0, 3);
  }, [processedRows]);

  return (
    <div className="container">
      <h1>Ritmex Funding Monitor</h1>

      <div style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
        {topOpportunities.map((opp, idx) => (
          <div key={opp.symbol} style={{flex: 1, background: '#2a2a2a', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${idx === 0 ? '#ffd700' : '#aaa'}`}}>
            <div style={{fontSize: '0.9em', color: '#888', marginBottom: '5px'}}>TOP {idx + 1} OPPORTUNITY</div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <strong style={{fontSize: '1.4em'}}>{opp.symbol}</strong>
              <span style={{fontSize: '1.2em', color: '#ffd700', fontWeight: 'bold'}}>{formatRate(opp.maxArbSpread)}</span>
            </div>
            <div style={{marginTop: '10px', fontSize: '0.9em'}}>
              <span className="badge badge-short">↓</span> {opp.shortExchange} 
              <span style={{margin: '0 10px'}}>→</span>
              <span className="badge badge-long">↑</span> {opp.longExchange}
            </div>
            <div style={{marginTop: '5px', display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#4caf50', fontWeight: 'bold'}}>Net Profit: ${opp.netProfit?.toFixed(2)}/d</span>
              <span style={{color: '#f44336', fontSize: '0.8em'}}>Cost: ${((opp.openCost || 0) + (opp.closeCost || 0)) * capital < 1 ? '<1' : (((opp.openCost || 0) + (opp.closeCost || 0)) * capital).toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="controls">
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px', paddingRight: '20px', borderRight: '1px solid #444'}}>
          <strong>Position ($/Side):</strong>
          <input 
            type="number" 
            value={capital} 
            onChange={(e) => setCapital(Number(e.target.value))}
            style={{background: '#333', color: '#fff', border: '1px solid #555', padding: '5px', borderRadius: '4px', width: '100px'}}
          />
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px', paddingRight: '20px', borderRight: '1px solid #444'}}>
          <strong>Filter Symbol:</strong>
          <input 
            type="text" 
            placeholder="e.g. BTC"
            value={symbolFilter} 
            onChange={(e) => setSymbolFilter(e.target.value)}
            style={{background: '#333', color: '#fff', border: '1px solid #555', padding: '5px', borderRadius: '4px', width: '120px'}}
          />
        </div>
        <button
          onClick={() => setFilterProfitable(!filterProfitable)}
          style={{
            background: filterProfitable ? '#4caf50' : '#333',
            color: '#fff',
            border: '1px solid #555',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: filterProfitable ? 'bold' : 'normal',
            marginRight: '20px'
          }}
        >
          {filterProfitable ? 'Show Profitable Only (24h)' : 'Filter Profitable'}
        </button>
        <strong>Show Exchanges:</strong>
        {EXCHANGES.map((ex) => (
          <label key={ex.key} className="exchange-toggle">
            <input
              type="checkbox"
              checked={visibleExchanges[ex.key]}
              onChange={() => toggleExchange(ex.key)}
            />
            {ex.label}
          </label>
        ))}
      </div>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('symbol')}>
                Symbol {sortConfig.key === 'symbol' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('maxArbSpread')} style={{minWidth: '100px'}}>
                 Max Arb {sortConfig.key === 'maxArbSpread' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('estimatedProfit')} style={{minWidth: '100px'}}>
                 Est. 24h Profit {sortConfig.key === 'estimatedProfit' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('netProfit')} style={{minWidth: '100px'}}>
                 Net Profit (24h) {sortConfig.key === 'netProfit' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('openCost')} style={{minWidth: '100px'}}>
                 Open Cost {sortConfig.key === 'openCost' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('closeCost')} style={{minWidth: '100px'}}>
                 Close Cost {sortConfig.key === 'closeCost' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th>Strategy (Short / Long)</th>
              {EXCHANGES.map((ex) => (
                visibleExchanges[ex.key] && (
                  <th key={ex.key} onClick={() => handleSort(ex.key)}>
                    {ex.label} {sortConfig.key === ex.key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                )
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.symbol}>
                <td>{row.symbol}</td>
                <td style={{fontWeight: 'bold', color: '#ffd700'}}>{formatRate(row.maxArbSpread)}</td>
                <td style={{fontWeight: 'bold', color: '#4caf50'}}>${row.estimatedProfit?.toFixed(2)}</td>
                <td style={{fontWeight: 'bold', color: row.netProfit && row.netProfit > 0 ? '#4caf50' : '#f44336'}}>
                  {row.netProfit !== -Infinity && row.netProfit !== undefined ? `$${row.netProfit.toFixed(2)}` : '-'}
                </td>
                <td 
                  style={{color: '#f44336', cursor: 'pointer'}} 
                  onClick={() => setSelectedHistory({
                    data: historyRef.current[row.symbol]?.openCosts || [],
                    title: `${row.symbol} Open Cost`
                  })}
                >
                  <div>{formatRate(row.openCost)}</div>
                  <div style={{fontSize: '0.8em', color: '#aaa'}}>
                    (P{getPercentile(row.openCost, historyRef.current[row.symbol]?.openCosts || [])})
                  </div>
                  {row.longBuyPrice > 0 && (
                    <div style={{fontSize: '0.75em', marginTop: '4px', color: '#ccc', textAlign: 'right'}}>
                       <div title="Buy Price (Long)">B: {row.longBuyPrice}</div>
                       <div title="Sell Price (Short)">S: {row.shortSellPrice}</div>
                       <div title="Spread Diff" style={{color: '#ffd700'}}>D: {row.priceDiff?.toFixed(4)}</div>
                    </div>
                  )}
                </td>
                <td 
                  style={{color: '#f44336', cursor: 'pointer'}}
                  onClick={() => setSelectedHistory({
                    data: historyRef.current[row.symbol]?.closeCosts || [],
                    title: `${row.symbol} Close Cost`
                  })}
                >
                  <div>{formatRate(row.closeCost)}</div>
                  <div style={{fontSize: '0.8em', color: '#aaa'}}>
                    (P{getPercentile(row.closeCost, historyRef.current[row.symbol]?.closeCosts || [])})
                  </div>
                  {row.shortBuyPrice > 0 && (
                    <div style={{fontSize: '0.75em', marginTop: '4px', color: '#ccc', textAlign: 'right'}}>
                       <div title="Buy Price (Short)">B: {row.shortBuyPrice}</div>
                       <div title="Sell Price (Long)">S: {row.longSellPrice}</div>
                       <div title="Spread Diff" style={{color: '#ffd700'}}>D: {row.closePriceDiff?.toFixed(4)}</div>
                    </div>
                  )}
                </td>
                <td>
                  {row.shortExchange ? (
                    <div className="strategy-cell">
                      <span>
                        <span className="badge badge-short">↓</span>
                        {row.shortExchange} 
                        <small style={{color: '#888', marginLeft: '4px'}}>({formatRate(row.shortExchangeSpread)})</small>
                      </span>
                      <span style={{color: '#444'}}>|</span>
                      <span>
                        <span className="badge badge-long">↑</span>
                        {row.longExchange}
                        <small style={{color: '#888', marginLeft: '4px'}}>({formatRate(row.longExchangeSpread)})</small>
                      </span>
                    </div>
                  ) : '-'}
                </td>
                {EXCHANGES.map((ex) => (
                  visibleExchanges[ex.key] && (
                    <td key={ex.key} className={getClass(row[ex.key] as number)}>
                      {formatRate(row[ex.key] as number)}
                    </td>
                  )
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{textAlign: 'center', color: '#666', marginTop: '20px'}}>
        Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '-'}
      </p>
      {selectedHistory && (
        <HistogramModal 
          data={selectedHistory.data} 
          title={selectedHistory.title} 
          onClose={() => setSelectedHistory(null)} 
        />
      )}
    </div>
  );
}

export default App;