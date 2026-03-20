/**
 * TypeScript ambient declarations for TradingView Charting Library.
 *
 * Covers both Advanced Charts (free, public) and Trading Platform (licensed).
 * The full .d.ts ships with the library package at:
 *   charting_library/charting_library.d.ts
 *   charting_library/datafeed-api.d.ts
 *
 * Docs: https://www.tradingview.com/charting-library-docs/latest/api/
 */

declare namespace Charting_Library {
  // ─── Primitive types ────────────────────────────────────────────────────
  type ResolutionString = string
  type Timezone = string

  // ─── Datafeed configuration ─────────────────────────────────────────────
  interface DatafeedConfiguration {
    supported_resolutions?: ResolutionString[]
    supports_group_request?: boolean
    /** Enable trade markers on the chart (requires getMarks implementation). */
    supports_marks?: boolean
    supports_search?: boolean
    supports_timescale_marks?: boolean
    currency_codes?: string[]
    exchanges?: Exchange[]
    symbols_types?: SymbolType[]
  }

  interface Exchange {
    value: string
    name: string
    desc: string
  }

  interface SymbolType {
    name: string
    value: string
  }

  // ─── Symbol info ──────────────────────────────────────────────────────
  interface LibrarySymbolInfo {
    name: string
    full_name: string
    description: string
    /** Symbol type: 'stock' | 'crypto' | 'forex' | 'index' | 'bond' | etc. */
    type: string
    /**
     * Trading session string.
     * Crypto: "24x7"
     * US Stocks: "0930-1600" (ET)
     * Forex: "0000-2400:23456" (Mon-Fri)
     */
    session: string
    session_display?: string
    session_holidays?: string
    ticker?: string
    exchange: string
    listed_exchange: string
    timezone: Timezone
    format: 'price' | 'volume'
    pricescale: number
    minmov: number
    minmov2?: number
    fractional?: boolean
    has_intraday: boolean
    intraday_multipliers?: string[]
    has_seconds?: boolean
    seconds_multipliers?: string[]
    has_daily: boolean
    has_weekly_and_monthly: boolean
    has_empty_bars?: boolean
    volume_precision: number
    supported_resolutions: ResolutionString[]
    data_status: 'ending' | 'pulsed' | 'delayed_streaming' | 'streaming'
    expired?: boolean
    expiration_date?: number
    sector?: string
    industry?: string
    currency_code?: string
    /** Trading Platform: build second bars from tick data. */
    build_seconds_from_ticks?: boolean
  }

  interface SearchSymbolResultItem {
    symbol: string
    full_name: string
    description: string
    exchange: string
    ticker?: string
    type: string
  }

  // ─── Bar (OHLCV) ──────────────────────────────────────────────────────
  interface Bar {
    /** Unix timestamp in **milliseconds**. */
    time: number
    open: number
    high: number
    low: number
    close: number
    volume?: number
  }

  interface HistoryMetadata {
    noData: boolean
    /** Unix timestamp in seconds of the next available bar (optional, helps skip gaps). */
    nextTime?: number
  }

  interface PeriodParams {
    /** Unix timestamp in **seconds** — start of the requested range. */
    from: number
    /** Unix timestamp in **seconds** — end of the requested range. */
    to: number
    firstDataRequest: boolean
    /** Number of bars the library wants to preload. */
    countBack: number
  }

  // ─── Marks ────────────────────────────────────────────────────────────
  type MarkColor = 'red' | 'green' | 'blue' | 'yellow' | { border: string; background: string }

  interface Mark {
    /** Unique mark identifier. */
    id: string | number
    /** Unix timestamp in **seconds**. */
    time: number
    color: MarkColor
    /** Tooltip content shown on hover. */
    text: string
    /** Single character label displayed inside the mark circle. */
    label: string
    labelFontColor?: string
    minSize?: number
  }

  interface TimescaleMark {
    id: string | number
    /** Unix timestamp in **seconds**. */
    time: number
    color: string
    tooltip: string[]
    label: string
    imageUrl?: string
    shape?: 'earningUp' | 'earningDown' | 'earning'
  }

  type GetMarksCallback<T> = (marks: T[]) => void

  // ─── Quotes (Trading Platform) ────────────────────────────────────────
  interface QuoteValues {
    ch?: number          // price change (absolute)
    chp?: number         // change percent
    short_name?: string
    exchange?: string
    description?: string
    lp?: number          // last price
    lp_time?: number     // timestamp of last price (seconds)
    ask?: number
    bid?: number
    spread?: number
    open_price?: number
    high_price?: number
    low_price?: number
    prev_close_price?: number
    volume?: number
    original_name?: string
    [key: string]: unknown
  }

  interface QuoteData {
    /** Symbol name. */
    n: string
    s: 'ok' | 'error'
    v: QuoteValues | { error: string }
  }

  type QuotesCallback      = (data: QuoteData[]) => void
  type QuotesErrorCallback = (reason: string) => void
  type ServerTimeCallback  = (unixTimeSeconds: number) => void

  // ─── Datafeed callbacks ───────────────────────────────────────────────
  type ResolveCallback     = (symbolInfo: LibrarySymbolInfo) => void
  type ErrorCallback       = (reason: string) => void
  type SearchSymbolsCallback = (items: SearchSymbolResultItem[]) => void
  type HistoryCallback     = (bars: Bar[], meta: HistoryMetadata) => void
  type SubscribeBarsCallback = (bar: Bar) => void

  // ─── Datafeed interface ───────────────────────────────────────────────
  /**
   * Core datafeed interface for Advanced Charts.
   * Optional methods unlock additional features:
   * - getServerTime      → time sync
   * - calculateHistoryDepth → depth hints
   * - getMarks           → trade markers on bars
   * - getTimescaleMarks  → markers on the time axis
   * - getQuotes / subscribeQuotes / unsubscribeQuotes → Trading Platform widgets
   *
   * Docs: https://www.tradingview.com/charting-library-docs/latest/connecting_data/datafeed-api/
   */
  interface IExternalDatafeed {
    // ── Required ──────────────────────────────────────────────────────
    onReady(callback: (configuration: DatafeedConfiguration) => void): void
    searchSymbols(
      userInput: string,
      exchange: string,
      symbolType: string,
      onResult: SearchSymbolsCallback,
    ): void
    resolveSymbol(
      symbolName: string,
      onResolve: ResolveCallback,
      onError: ErrorCallback,
    ): void
    /**
     * Fetch historical bars.
     * NOTE: PeriodParams.from/to are in **seconds**.
     *       Returned Bar.time must be in **milliseconds**.
     * Callbacks MUST be invoked asynchronously (e.g. inside setTimeout/Promise).
     */
    getBars(
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      periodParams: PeriodParams,
      onResult: HistoryCallback,
      onError: ErrorCallback,
    ): void
    subscribeBars(
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      onTick: SubscribeBarsCallback,
      listenerGuid: string,
      onResetCacheNeededCallback: () => void,
    ): void
    unsubscribeBars(listenerGuid: string): void

    // ── Additional (optional) ─────────────────────────────────────────
    /** Returns current server time in Unix seconds. */
    getServerTime?(callback: ServerTimeCallback): void
    /**
     * Returns history depth hint per resolution.
     * Return undefined to let TV use default paging.
     */
    calculateHistoryDepth?(
      resolution: ResolutionString,
      resolutionBack: string,
      intervalBack: number,
    ): { resolutionBack: string; intervalBack: number } | undefined
    /** Provide colored trade markers displayed on bars. */
    getMarks?(
      symbolInfo: LibrarySymbolInfo,
      from: number,
      to: number,
      onDataCallback: GetMarksCallback<Mark>,
      resolution: ResolutionString,
    ): void
    /** Provide markers displayed on the time axis. */
    getTimescaleMarks?(
      symbolInfo: LibrarySymbolInfo,
      from: number,
      to: number,
      onDataCallback: GetMarksCallback<TimescaleMark>,
      resolution: ResolutionString,
    ): void
    /** Trading Platform: fetch snapshot quotes for given symbols. */
    getQuotes?(
      symbols: string[],
      onDataCallback: QuotesCallback,
      onErrorCallback: QuotesErrorCallback,
    ): void
    /** Trading Platform: subscribe to real-time quote updates. */
    subscribeQuotes?(
      symbols: string[],
      fastSymbols: string[],
      onRealtimeCallback: QuotesCallback,
      listenerGUID: string,
    ): void
    /** Trading Platform: unsubscribe from quote updates. */
    unsubscribeQuotes?(listenerGUID: string): void
  }

  // ─── Broker API (Trading Platform) ───────────────────────────────────
  /** TV order status codes. */
  const enum OrderStatus {
    Placing         = 1,
    Inactive        = 2,
    CancelRequested = 3,
    Cancelled       = 4,
    Rejected        = 5,
    Filled          = 6,
    PartiallyFilled = 7,
    Working         = 8,
  }

  /** TV order type codes. */
  const enum OrderType {
    Market      = 1,
    Limit       = 2,
    Stop        = 3,
    StopLimit   = 4,
    TrailingStop = 5,
  }

  /** TV side (Buy = 1, Sell = 2). */
  const enum Side {
    Buy  = 1,
    Sell = 2,
  }

  interface BrokerOrder {
    id: string
    symbol: string
    brokerSymbol?: string
    type: OrderType
    side: Side
    qty: number
    status: OrderStatus
    limitPrice?: number
    stopPrice?: number
    avgPrice?: number
    filledQty?: number
    parentId?: string
    parentType?: number
    comment?: string
    updateTime?: number
    duration?: { type: string }
    customFields?: Record<string, string | number>
  }

  interface BrokerPosition {
    id: string
    symbol: string
    brokerSymbol?: string
    qty: number
    side: Side
    avgPrice: number
    unrealizedPL?: number
    currency?: string
    message?: string
  }

  interface Execution {
    id: string
    symbol: string
    brokerSymbol?: string
    brokerTime: string
    side: Side
    qty: number
    price: number
    /** Unix timestamp in milliseconds. */
    time: number
    commission?: number
    fee?: number
    netAmount?: number
  }

  interface AccountInfo {
    id: string
    name: string
    currency?: string
    currencySign?: string
    balance: number
    equity?: number
    unrealizedPL?: number
    [key: string]: unknown
  }

  /** Minimal delegate used by Account Manager tables to signal data refreshes. */
  interface SimpleDelegate {
    subscribe(guid: string, handler: (value: unknown) => void): void
    unsubscribe(guid: string): void
  }

  interface AccountManagerColumn {
    id: string
    title: string
    alignment?: 'left' | 'right' | 'center'
    dataFields?: string[]
    formatter?: string
  }

  interface AccountManagerTable {
    id: string
    title?: string
    columns: AccountManagerColumn[]
    getData(): Promise<unknown[]>
    changeDelegate: SimpleDelegate
    errorDelegate: SimpleDelegate
  }

  interface AccountManagerPage {
    id: string
    title: string
    tables: AccountManagerTable[]
  }

  interface AccountManagerInfo {
    accountTitle: string
    pages: AccountManagerPage[]
  }

  interface PreOrder {
    symbol: string
    brokerSymbol?: string
    side: Side
    type: OrderType
    qty: number
    limitPrice?: number
    stopPrice?: number
    trailingStopPips?: number
    duration?: { type: string }
    customFields?: Record<string, unknown>
  }

  /**
   * Host provided by TV to the broker adapter.
   * Call these to push live updates to the Trading Platform UI.
   */
  interface IBrokerConnectionAdapterHost {
    orderUpdate(order: BrokerOrder, source?: string): void
    positionUpdate(position: BrokerPosition, isAdded?: boolean, isRemoved?: boolean): void
    executionUpdate(execution: Execution): void
    /** Tells TV to re-fetch all orders and positions from scratch. */
    fullUpdate(): void
    realtimeUpdate(symbol: string, data: unknown): void
    setProgressBar(visible: boolean): void
    connectionStatusUpdate(status: number): void
  }

  /**
   * Implement this interface to enable chart trading in Trading Platform.
   * Docs: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/#broker-api
   */
  interface IBrokerTerminal {
    onReady(host: IBrokerConnectionAdapterHost): void
    subscribeRealtime(symbol: string): void
    unsubscribeRealtime(symbol: string): void
    orders(): Promise<BrokerOrder[]>
    positions(): Promise<BrokerPosition[]>
    executions(symbol: string): Promise<Execution[]>
    placeOrder(preOrder: PreOrder, confirmCallback: (order: BrokerOrder) => void): Promise<void>
    cancelOrder(orderId: string, confirmCallback: () => void): Promise<void>
    modifyOrder(order: BrokerOrder, confirmCallback: (order: BrokerOrder) => void): Promise<void>
    accountInfo(): Promise<AccountInfo>
    accountManagerInfo(): AccountManagerInfo
    isTradable?(symbol: string): Promise<boolean>
    chartContextMenuActions?(
      context: object,
    ): Promise<Array<{
      text?: string
      separator?: boolean
      checkable?: boolean
      checked?: boolean
      action?: () => void
    }>>
  }

  // ─── Widget options ───────────────────────────────────────────────────
  interface ChartingLibraryWidgetOptions {
    container: HTMLElement | string
    datafeed: IExternalDatafeed
    library_path: string
    locale: string
    symbol: string
    interval: ResolutionString
    fullscreen?: boolean
    autosize?: boolean
    theme?: 'light' | 'dark'
    timezone?: Timezone
    debug?: boolean
    disabled_features?: string[]
    enabled_features?: string[]
    overrides?: Record<string, string | number | boolean>
    studies_overrides?: Record<string, string | number | boolean>
    loading_screen?: { backgroundColor?: string; foregroundColor?: string }
    toolbar_bg?: string
    time_frames?: Array<{
      text: string
      resolution: ResolutionString
      description?: string
      title?: string
    }>
    charts_storage_url?: string
    charts_storage_api_version?: string
    client_id?: string
    user_id?: string
    favorites?: {
      intervals?: ResolutionString[]
      chartTypes?: string[]
      drawingTools?: string[]
    }
    saved_data?: object
    custom_css_url?: string
    custom_font_family?: string
    numeric_formatting?: { decimal_sign?: string }
    snapshot_url?: string
    header_widget_buttons_mode?: 'compact' | 'fullsize' | 'adaptive'
    studies_access?: {
      type: 'black' | 'white'
      tools: Array<{ name: string; grayed?: boolean }>
    }
    drawings_access?: {
      type: 'black' | 'white'
      tools: Array<{ name: string }>
    }
  }

  /** Sidebar panels available in Trading Platform. */
  interface WidgetBarParams {
    details?: boolean
    watchlist?: boolean
    news?: boolean
    datawindow?: boolean
    watchlist_settings?: {
      default_symbols?: string[]
      readonly?: boolean
    }
  }

  /**
   * Trading Platform widget constructor options.
   * Extends Advanced Charts options with broker + widget bar.
   * Docs: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/
   */
  interface TradingTerminalWidgetOptions extends ChartingLibraryWidgetOptions {
    /** Factory that creates an IBrokerTerminal instance, enabling chart trading. */
    broker_factory?: (host: IBrokerConnectionAdapterHost) => IBrokerTerminal
    /** Configure the right-side widget panel (Watchlist, Details, News, DOM). */
    widgetbar?: WidgetBarParams
    rss_news_feed?: {
      default?: { url: string; name: string }
      [symbolType: string]: { url: string; name: string } | undefined
    }
  }

  // ─── Chart & widget API ───────────────────────────────────────────────
  interface IChartWidgetApi {
    setSymbol(symbol: string, resolution: ResolutionString, callback?: () => void): void
    symbol(): string
    resolution(): ResolutionString
    getVisibleRange(): { from: number; to: number }
    setVisibleRange(range: { from: number; to: number }, options?: { percentRightMargin?: number }): void
    createStudy(name: string, forceOverlay?: boolean, lock?: boolean, inputs?: unknown[]): Promise<string>
    removeEntity(entityId: string): void
    refreshMarks(): void
    clearMarks(): void
    /** Draw a position line on the chart (Trading Platform). */
    createPositionLine(options?: object): unknown
    /** Draw an order line on the chart (Trading Platform). */
    createOrderLine(options?: object): unknown
    /** Draw an execution dot on the chart (Trading Platform). */
    createExecutionShape(options?: object): unknown
    /** Enable or disable scrolling (panning) of the chart. */
    setScrollEnabled(enabled: boolean): void
    /** Enable or disable zooming of the chart. */
    setZoomEnabled(enabled: boolean): void
    /** Zoom out one level (same as clicking the Zoom Out button). */
    zoomOut(): void
    /** Returns true if the chart can be zoomed out further. */
    canZoomOut(): boolean
    /** Apply overrides to this chart instance without reloading. */
    applyOverrides(props: Record<string, string | number | boolean>): void
    /** Returns the current resolution (interval) string. */
    setResolution(resolution: ResolutionString, options?: object): Promise<boolean>
    /** Subscribe to interval-change events. */
    onIntervalChanged(): { subscribe(guid: null, cb: (interval: ResolutionString) => void): void }
    /** Subscribe to symbol-change events. */
    onSymbolChanged(): { subscribe(guid: null, cb: () => void): void }
  }

  interface IChartingLibraryWidget {
    onChartReady(callback: () => void): void
    chart(index?: number): IChartWidgetApi
    activeChart(): IChartWidgetApi
    remove(): void
    setTheme(theme: 'light' | 'dark'): Promise<void>
    changeTheme(themeName: 'light' | 'dark', options?: object): Promise<void>
    subscribe(event: string, callback: () => void): void
    unsubscribe(event: string, callback: () => void): void
    save(callback: (state: object) => void): void
    load(state: object): void
    getSavedCharts(callback: (charts: unknown[]) => void): void
  }

  const widget: new (
    options: ChartingLibraryWidgetOptions | TradingTerminalWidgetOptions,
  ) => IChartingLibraryWidget
}

interface Window {
  TradingView: typeof Charting_Library
}
