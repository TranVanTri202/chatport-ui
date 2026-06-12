"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { usePreferences } from "@/hooks/usePreferences";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";

interface BotStatItem {
  id: number;
  name: string | null;
  channel: string;
  status: string;
  conversations: number;
  tokensUsed: number;
}

interface DayVolume {
  date: string;
  inbound: number;
  outbound: number;
}

interface TypeBreakdown {
  type: string;
  count: number;
}

interface TopContact {
  id: number;
  name: string;
  avatar: string | null;
  uid: string;
  messageCount: number;
}

interface TopDocument {
  id: number;
  title: string;
  queryCount: number;
}

interface TopUserToken {
  id: number;
  name: string;
  avatar: string | null;
  uid: string;
  tokens: number;
}

interface TopBotToken {
  id: number;
  name: string;
  channel: string;
  tokens: number;
}

interface AnalyticsData {
  overview: {
    totalBots: number;
    totalConversations: number;
    totalMessages: number;
    inbound: number;
    outbound: number;
    totalAiReplies: number;
    totalTokens: number;
    totalAgentReplies: number;
    newContactsCount: number;
    avgResponseTimeSec: number;
  };
  bots: BotStatItem[];
  recentDays: DayVolume[];
  typeBreakdown: TypeBreakdown[];
  threadTypeBreakdown: {
    direct: number;
    group: number;
  };
  genderBreakdown: {
    male: number;
    female: number;
    unknown: number;
  };
  topContacts: TopContact[];
  topDocuments: TopDocument[];
  topUsersByTokens: TopUserToken[];
  topBotsByTokens: TopBotToken[];
}

export function ReportsView(): JSX.Element {
  const { preferences } = usePreferences();
  const vi = preferences.lang === "vi";
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; val1: number; val2: number } | null>(null);

  // Filter states
  const initStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0] || "";
  }, []);

  const initEndDate = useMemo(() => {
    return new Date().toISOString().split("T")[0] || "";
  }, []);

  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(initStartDate);
  const [endDate, setEndDate] = useState<string>(initEndDate);
  const [botList, setBotList] = useState<BotStatItem[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        let url = "/bots/analytics";
        const params: string[] = [];
        if (selectedBotId) params.push(`botId=${selectedBotId}`);
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length > 0) {
          url += `?${params.join("&")}`;
        }

        const res = await api.get<AnalyticsData>(url);
        setData(res);
        
        // Save bot list on initial query to populate select dropdown
        if (!selectedBotId && botList.length === 0) {
          setBotList(res.bots);
        }
        setError(null);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError(vi ? "Không thể tải báo cáo dữ liệu." : "Failed to load reports data.");
      } finally {
        setLoading(false);
      }
    }
    void loadAnalytics();
  }, [selectedBotId, startDate, endDate, vi]);

  // Calculations for Automation rate
  const botReplyRate = useMemo(() => {
    if (!data) return 0;
    const totalOut = data.overview.outbound;
    if (totalOut === 0) return 0;
    return Math.round((data.overview.totalAiReplies / totalOut) * 100);
  }, [data]);

  // Calculations for Channel count breakdown
  const channelData = useMemo(() => {
    if (!data?.bots) return { zalo: 0, telegram: 0 };
    // If a specific bot is filtered, we look at the bot list config or the single bot channel
    const targetBots = selectedBotId ? botList.filter(b => b.id === Number(selectedBotId)) : data.bots;
    const zalo = targetBots.filter(b => b.channel === "zalo").length;
    const telegram = targetBots.filter(b => b.channel === "telegram").length;
    return { zalo, telegram };
  }, [data, selectedBotId, botList]);

  // Format response time
  const responseTimeText = useMemo(() => {
    if (!data) return "–";
    const sec = data.overview.avgResponseTimeSec;
    if (sec === 0) return vi ? "Tức thì" : "Instant";
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const remainSec = sec % 60;
    return `${min}m ${remainSec}s`;
  }, [data, vi]);

  // Line Chart computations (Message volume by day)
  const lineChartParams = useMemo(() => {
    if (!data?.recentDays || data.recentDays.length === 0) return null;
    const width = 640;
    const height = 240;
    const padding = 40;

    const maxVal = Math.max(
      ...data.recentDays.map((d) => Math.max(d.inbound, d.outbound)),
      10
    );

    const pointsCount = data.recentDays.length;
    const stepX = (width - padding * 2) / (pointsCount - 1 || 1);

    const inboundPoints = data.recentDays.map((d, index) => {
      const x = padding + index * stepX;
      const y = height - padding - (d.inbound / maxVal) * (height - padding * 2);
      return { x, y, val: d.inbound, date: d.date };
    });

    const outboundPoints = data.recentDays.map((d, index) => {
      const x = padding + index * stepX;
      const y = height - padding - (d.outbound / maxVal) * (height - padding * 2);
      return { x, y, val: d.outbound, date: d.date };
    });

    const formatPolyPoints = (pts: { x: number; y: number }[]) =>
      pts.map((p) => `${p.x},${p.y}`).join(" ");

    return {
      width,
      height,
      padding,
      maxVal,
      inboundPoints,
      outboundPoints,
      inboundPath: formatPolyPoints(inboundPoints),
      outboundPath: formatPolyPoints(outboundPoints),
    };
  }, [data]);

  // Bar Chart computations (Tokens per Bot, or Tokens per Top Contact if single bot selected)
  const barChartParams = useMemo(() => {
    if (!data) return null;

    const isSingleBot = selectedBotId !== "";
    const items = isSingleBot ? data.topUsersByTokens : data.bots;
    if (!items || items.length === 0) return null;

    const width = 640;
    const height = 240;
    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 40;

    const values = items.map(x => isSingleBot ? (x as any).tokens : (x as any).tokensUsed);
    const maxVal = Math.max(...values, 100);
    const barsCount = items.length;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    const barWidth = Math.min(45, chartWidth / (barsCount * 1.5));
    const stepX = chartWidth / (barsCount || 1);

    const bars = items.map((item: any, index) => {
      const x = paddingLeft + index * stepX + (stepX - barWidth) / 2;
      const val = isSingleBot ? item.tokens : item.tokensUsed;
      const barHeight = (val / maxVal) * chartHeight;
      const y = height - paddingBottom - barHeight;
      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        value: val,
        name: item.name || `Item ${item.id}`,
        channel: isSingleBot ? "zalo" : item.channel,
      };
    });

    return {
      width,
      height,
      paddingLeft,
      paddingTop,
      paddingBottom,
      maxVal,
      bars,
    };
  }, [data, selectedBotId]);

  if (loading && !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-chat select-none">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="text-[13.5px] font-semibold text-muted">
          {vi ? "Đang xử lý dữ liệu báo cáo..." : "Analyzing report data..."}
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-chat p-6 text-center select-none">
        <Icon name="alert" size={40} className="text-danger" />
        <div className="text-[15px] font-bold text-text">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-accent p-[8px_18px] text-[13px] font-semibold text-[#0a1f16] hover:brightness-95 transition"
        >
          {vi ? "Tải lại trang" : "Retry"}
        </button>
      </div>
    );
  }

  const { overview, genderBreakdown, threadTypeBreakdown, topContacts, topDocuments, topUsersByTokens, topBotsByTokens } = data;

  return (
    <div className="h-full overflow-y-auto bg-chat pb-10">
      <div className="mx-auto max-w-[1320px] p-[28px_34px_40px]">
        
        {/* Header and Filters Row */}
        <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-[27px] font-semibold tracking-tight">
              {vi ? "Báo cáo thống kê" : "Analytics & Reports"}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {vi ? "Đánh giá chi tiết lưu lượng, hiệu suất tự động hóa và khách hàng" : "Detailed report on message traffic, AI performance, and contact growth"}
            </p>
          </div>
          
          {/* Dynamic Filters */}
          <div className="flex flex-wrap items-center gap-3.5 mt-2 md:mt-0">
            {/* Select Bot */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{vi ? "Chọn Bot" : "Select Bot"}</span>
              <select
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 p-[6px_12px] text-xs font-semibold text-text focus:outline-none focus:border-accent min-w-[160px] cursor-pointer hover:bg-surface-3 transition"
              >
                <option value="">{vi ? "Tất cả các Bot" : "All Bots"}</option>
                {botList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || `Bot #${b.id}`} ({b.channel.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{vi ? "Từ ngày" : "Start Date"}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 p-[5px_12px] text-xs font-semibold text-text focus:outline-none focus:border-accent cursor-pointer hover:bg-surface-3 transition"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{vi ? "Đến ngày" : "End Date"}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 p-[5px_12px] text-xs font-semibold text-text focus:outline-none focus:border-accent cursor-pointer hover:bg-surface-3 transition"
              />
            </div>

            {/* Quick Reset */}
            <div className="flex flex-col gap-1 self-end">
              <button
                onClick={() => {
                  setSelectedBotId("");
                  setStartDate(initStartDate);
                  setEndDate(initEndDate);
                }}
                className="rounded-lg border border-border bg-surface-2 p-[6.5px_14px] text-xs font-bold text-muted hover:text-text hover:bg-surface-3 transition"
              >
                {vi ? "Đặt lại" : "Reset"}
              </button>
            </div>
          </div>
        </header>

        {/* Section 1: KPI Cards */}
        <section className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-[16px_18px] shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted truncate">{vi ? "TỔNG TIN NHẮN" : "TOTAL MESSAGES"}</span>
              <span className="text-[#3b82f6]"><Icon name="chat" size={15} /></span>
            </div>
            <div className="mt-1.5 flex flex-col">
              <span className="font-sans text-[28px] font-bold tracking-tight text-text">
                {overview.totalMessages.toLocaleString()}
              </span>
              <span className="text-[10.5px] text-muted mt-0.5 truncate">
                {vi ? `Đến: ${overview.inbound} | Đi: ${overview.outbound}` : `In: ${overview.inbound} | Out: ${overview.outbound}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-[16px_18px] shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted truncate">{vi ? "LIÊN HỆ MỚI" : "NEW CONTACTS"}</span>
              <span className="text-[#8b5cf6]"><Icon name="userPlus" size={15} /></span>
            </div>
            <div className="mt-1.5 flex flex-col">
              <span className="font-sans text-[28px] font-bold tracking-tight text-text">
                {overview.newContactsCount.toLocaleString()}
              </span>
              <span className="text-[10.5px] text-muted mt-0.5 truncate">
                {vi ? "Thêm mới trong khoảng lọc" : "New contacts in selected range"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-[16px_18px] shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted truncate">{vi ? "TỶ LỆ BOT TRẢ LỜI" : "BOT REPLY RATE"}</span>
              <span className="text-[#10b981]"><Icon name="bot" size={15} /></span>
            </div>
            <div className="mt-1.5 flex flex-col">
              <span className="font-sans text-[28px] font-bold tracking-tight text-text">
                {botReplyRate}%
              </span>
              <span className="text-[10.5px] text-muted mt-0.5 truncate">
                {vi ? `${overview.totalAiReplies} tin nhắn tự động` : `${overview.totalAiReplies} automated replies`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-[16px_18px] shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted truncate">{vi ? "TOKEN ĐÃ DÙNG" : "TOKENS USED"}</span>
              <span className="text-[#f59e0b]"><Icon name="sparkle" size={15} /></span>
            </div>
            <div className="mt-1.5 flex flex-col">
              <span className="font-sans text-[28px] font-bold tracking-tight text-text truncate">
                {overview.totalTokens ? overview.totalTokens.toLocaleString() : "0"}
              </span>
              <span className="text-[10.5px] text-muted mt-0.5 truncate">
                {vi ? "Tổng số token tiêu thụ" : "Total token usage"}
              </span>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 flex flex-col gap-2 rounded-card border border-border bg-surface p-[16px_18px] shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted truncate">{vi ? "TỐC ĐỘ PHẢN HỒI" : "RESPONSE TIME"}</span>
              <span className="text-[#06b6d4]"><Icon name="clock" size={15} /></span>
            </div>
            <div className="mt-1.5 flex flex-col">
              <span className="font-sans text-[28px] font-bold tracking-tight text-text">
                {responseTimeText}
              </span>
              <span className="text-[10.5px] text-muted mt-0.5 truncate">
                {vi ? "Thời gian phản hồi TB" : "Average response interval"}
              </span>
            </div>
          </div>
        </section>

        {/* Section 2: Main Charts */}
        <section className="mb-6 grid gap-6 grid-cols-1 xl:grid-cols-2">
          {/* Line Chart */}
          <div className="relative rounded-card border border-border bg-surface p-[20px_24px] shadow-card">
            <h3 className="mb-4 text-[15px] font-bold tracking-tight text-text">
              {vi ? "Lưu lượng tin nhắn nhận & gửi theo thời gian" : "Message Traffic Volume over Time"}
            </h3>
            
            {lineChartParams ? (
              <div className="relative w-full">
                <svg
                  viewBox={`0 0 ${lineChartParams.width} ${lineChartParams.height}`}
                  className="w-full h-auto select-none"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                    const y = lineChartParams.padding + r * (lineChartParams.height - lineChartParams.padding * 2);
                    const labelVal = Math.round(lineChartParams.maxVal * (1 - r));
                    return (
                      <g key={i} className="opacity-40">
                        <line
                           x1={lineChartParams.padding}
                           y1={y}
                           x2={lineChartParams.width - lineChartParams.padding}
                           y2={y}
                           stroke="var(--border)"
                           strokeWidth={1}
                           strokeDasharray="4 4"
                        />
                        <text
                          x={lineChartParams.padding - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-muted font-sans text-[10px]"
                        >
                          {labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* X Axis Labels */}
                  {lineChartParams.inboundPoints.map((p, i) => {
                    if (lineChartParams.inboundPoints.length > 10 && i % 2 !== 0) return null; // reduce label clutter on large ranges
                    const dateObj = new Date(p.date);
                    const label = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
                    return (
                      <text
                        key={i}
                        x={p.x}
                        y={lineChartParams.height - lineChartParams.padding + 18}
                        textAnchor="middle"
                        className="fill-muted font-sans text-[10px] opacity-80"
                      >
                        {label}
                      </text>
                    );
                  })}

                  {/* Paths */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    points={lineChartParams.inboundPath}
                    className="transition-all"
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    points={lineChartParams.outboundPath}
                    className="transition-all"
                  />

                  {/* Interaction Nodes */}
                  {lineChartParams.inboundPoints.map((p, i) => (
                    <circle
                      key={`in-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint?.label === p.date ? 6 : 4}
                      className="cursor-pointer fill-[#3b82f6] stroke-surface stroke-[2px] transition-all hover:r-6"
                      onMouseEnter={() => {
                        setHoveredPoint({
                          x: p.x,
                          y: p.y - 12,
                          label: p.date,
                          val1: p.val,
                          val2: lineChartParams.outboundPoints[i]?.val ?? 0,
                        });
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}

                  {lineChartParams.outboundPoints.map((p, i) => (
                    <circle
                      key={`out-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint?.label === p.date ? 6 : 4}
                      className="cursor-pointer fill-[#10b981] stroke-surface stroke-[2px] transition-all hover:r-6"
                      onMouseEnter={() => {
                        setHoveredPoint({
                          x: p.x,
                          y: p.y - 12,
                          label: p.date,
                          val1: lineChartParams.inboundPoints[i]?.val ?? 0,
                          val2: p.val,
                        });
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </svg>

                {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-6 text-[11.5px] select-none">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#3b82f6]" />
                    <span className="font-semibold text-muted">{vi ? "Khách gửi (Inbound)" : "Inbound messages"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#10b981]" />
                    <span className="font-semibold text-muted">{vi ? "Bot/Agent gửi (Outbound)" : "Outbound messages"}</span>
                  </div>
                </div>

                {/* Tooltip */}
                {hoveredPoint && (
                  <div
                    className="absolute z-15 rounded-xl border border-border bg-surface p-2.5 shadow-2xl animate-fade-in pointer-events-none text-xs min-w-[120px]"
                    style={{
                      left: `${(hoveredPoint.x / lineChartParams.width) * 100}%`,
                      top: `${(hoveredPoint.y / lineChartParams.height) * 100 - 15}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="font-semibold text-text mb-1 select-none">
                      {new Date(hoveredPoint.label).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-muted">
                      <span>{vi ? "Nhận:" : "Inbound:"}</span>
                      <span className="font-bold text-[#3b82f6]">{hoveredPoint.val1}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-muted">
                      <span>{vi ? "Gửi:" : "Outbound:"}</span>
                      <span className="font-bold text-[#10b981]">{hoveredPoint.val2}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-muted italic">
                {vi ? "Không đủ dữ liệu vẽ biểu đồ." : "Insufficient data for line chart."}
              </div>
            )}
          </div>

          {/* Bar Chart (Tokens per Bot or Top Contacts of Bot) */}
          <div className="relative rounded-card border border-border bg-surface p-[20px_24px] shadow-card">
            <h3 className="mb-4 text-[15px] font-bold tracking-tight text-text">
              {selectedBotId 
                ? (vi ? "Lượng Token tiêu thụ theo Khách hàng (Top)" : "Token Usage per Contact (Top)")
                : (vi ? "Lượng Token tiêu thụ phân bổ theo từng Bot" : "Token Usage Distribution per Bot")}
            </h3>

            {barChartParams ? (
              <div className="relative w-full">
                <svg
                  viewBox={`0 0 ${barChartParams.width} ${barChartParams.height}`}
                  className="w-full h-auto select-none"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                    const y = barChartParams.paddingTop + r * (barChartParams.height - barChartParams.paddingTop - barChartParams.paddingBottom);
                    const labelVal = Math.round(barChartParams.maxVal * (1 - r));
                    return (
                      <g key={i} className="opacity-40">
                        <line
                          x1={barChartParams.paddingLeft}
                          y1={y}
                          x2={barChartParams.width - 30}
                          y2={y}
                          stroke="var(--border)"
                          strokeWidth={1}
                        />
                        <text
                          x={barChartParams.paddingLeft - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-muted font-sans text-[10px]"
                        >
                          {labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Render Bars */}
                  {barChartParams.bars.map((bar, i) => {
                    const barColor = bar.channel === "zalo" ? "#0068ff" : "#229ed9";
                    return (
                      <g key={i} className="group">
                        <rect
                          x={bar.x}
                          y={bar.y}
                          width={bar.width}
                          height={bar.height}
                          rx={3}
                          fill={barColor}
                          className="transition-all hover:brightness-90 cursor-pointer"
                        />
                        {/* Value top label */}
                        <text
                          x={bar.x + bar.width / 2}
                          y={bar.y - 6}
                          textAnchor="middle"
                          className="fill-text font-sans text-[9.5px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {bar.value.toLocaleString()}
                        </text>
                        {/* X Axis Name */}
                        <text
                          x={bar.x + bar.width / 2}
                          y={bar.y + bar.height + 18}
                          textAnchor="middle"
                          className="fill-muted font-sans text-[10px] max-w-[70px] truncate"
                        >
                          {bar.name.length > 10 ? `${bar.name.slice(0, 8)}…` : bar.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-6 text-[11.5px] select-none">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#0068ff]" />
                    <span className="font-semibold text-muted">
                      {selectedBotId ? (vi ? "Khách hàng" : "Contact") : "Zalo Bot"}
                    </span>
                  </div>
                  {!selectedBotId && (
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#229ed9]" />
                      <span className="font-semibold text-muted">Telegram Bot</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-muted italic">
                {vi ? "Không đủ dữ liệu vẽ biểu đồ cột." : "Insufficient data for bar chart."}
              </div>
            )}
          </div>
        </section>

        {/* Additional Breakdowns Grid (Channels, Thread Type, Demographics) */}
        <section className="mb-6 grid gap-6 grid-cols-1 md:grid-cols-3 select-none">
          {/* Channel breakdown */}
          <div className="rounded-card border border-border bg-surface p-[20px_24px] shadow-card">
            <h4 className="mb-4.5 text-[14px] font-bold tracking-tight text-text uppercase">
              {vi ? "Kênh liên kết" : "Connection Channels"}
            </h4>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted">Zalo</span>
                  <span className="font-bold text-text">{channelData.zalo} bots</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0068ff] transition-all"
                    style={{ width: `${(channelData.zalo / (Math.max(1, channelData.zalo + channelData.telegram))) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted">Telegram</span>
                  <span className="font-bold text-text">{channelData.telegram} bots</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#229ed9] transition-all"
                    style={{ width: `${(channelData.telegram / (Math.max(1, channelData.zalo + channelData.telegram))) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Conversation Type breakdown */}
          <div className="rounded-card border border-border bg-surface p-[20px_24px] shadow-card">
            <h4 className="mb-4.5 text-[14px] font-bold tracking-tight text-text uppercase">
              {vi ? "Loại hội thoại" : "Conversation Types"}
            </h4>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted">{vi ? "Chat Cá nhân (Direct)" : "Direct Messages"}</span>
                  <span className="font-bold text-text">{threadTypeBreakdown.direct}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#8b5cf6] transition-all"
                    style={{ width: `${(threadTypeBreakdown.direct / (overview.totalConversations || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted">{vi ? "Chat Nhóm (Group)" : "Group Chats"}</span>
                  <span className="font-bold text-text">{threadTypeBreakdown.group}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ec4899] transition-all"
                    style={{ width: `${(threadTypeBreakdown.group / (overview.totalConversations || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Demographics (Gender) */}
          <div className="rounded-card border border-border bg-surface p-[20px_24px] shadow-card">
            <h4 className="mb-4.5 text-[14px] font-bold tracking-tight text-text uppercase">
              {vi ? "Nhân khẩu học (Giới tính)" : "Demographics (Gender)"}
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                  <span className="font-semibold text-muted">{vi ? "Nam" : "Male"}</span>
                </div>
                <span className="font-bold text-text">
                  {genderBreakdown.male} ({Math.round((genderBreakdown.male / (genderBreakdown.male + genderBreakdown.female + genderBreakdown.unknown || 1)) * 100)}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ec4899]" />
                  <span className="font-semibold text-muted">{vi ? "Nữ" : "Female"}</span>
                </div>
                <span className="font-bold text-text">
                  {genderBreakdown.female} ({Math.round((genderBreakdown.female / (genderBreakdown.male + genderBreakdown.female + genderBreakdown.unknown || 1)) * 100)}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#9ca3af]" />
                  <span className="font-semibold text-muted">{vi ? "Chưa xác định" : "Unknown"}</span>
                </div>
                <span className="font-bold text-text">
                  {genderBreakdown.unknown} ({Math.round((genderBreakdown.unknown / (genderBreakdown.male + genderBreakdown.female + genderBreakdown.unknown || 1)) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Detailed Tables (Top Contacts by messages vs token usage) */}
        <section className="mb-6 grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Top Contacts by Messages */}
          <div className="rounded-card border border-border bg-surface p-[20px_24px] shadow-card flex flex-col">
            <h3 className="mb-4.5 text-[15px] font-bold tracking-tight text-text">
              {vi ? "Khách hàng tương tác nhiều nhất" : "Top Active Contacts"}
            </h3>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted uppercase font-bold">
                    <th className="py-2.5 font-bold">{vi ? "Khách hàng" : "Contact"}</th>
                    <th className="py-2.5 font-bold">{vi ? "Số điện thoại / UID" : "UID / Phone"}</th>
                    <th className="py-2.5 font-bold text-right">{vi ? "Lượng tương tác" : "Message count"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {topContacts.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2/40 transition">
                      <td className="py-3 flex items-center gap-2.5">
                        <Avatar spec={{ initials: c.name.slice(0,2), img: c.avatar || undefined, hue: (c.id * 33) % 360 }} size={28} />
                        <span className="font-semibold text-text">{c.name}</span>
                      </td>
                      <td className="py-3 text-muted font-medium">{c.uid}</td>
                      <td className="py-3 text-right font-bold text-text">{c.messageCount}</td>
                    </tr>
                  ))}
                  {topContacts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted italic">
                        {vi ? "Không có dữ liệu tương tác." : "No interaction data available."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Contacts by Token Usage */}
          <div className="rounded-card border border-border bg-surface p-[20px_24px] shadow-card flex flex-col">
            <h3 className="mb-4.5 text-[15px] font-bold tracking-tight text-text">
              {vi ? "Khách hàng tiêu thụ nhiều Token nhất" : "Top Users by Token Usage"}
            </h3>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted uppercase font-bold">
                    <th className="py-2.5 font-bold">{vi ? "Khách hàng" : "Contact"}</th>
                    <th className="py-2.5 font-bold">{vi ? "Số điện thoại / UID" : "UID / Phone"}</th>
                    <th className="py-2.5 font-bold text-right">{vi ? "Token tiêu thụ" : "Tokens used"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {topUsersByTokens?.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2/40 transition">
                      <td className="py-3 flex items-center gap-2.5">
                        <Avatar spec={{ initials: c.name.slice(0,2), img: c.avatar || undefined, hue: (c.id * 77) % 360 }} size={28} />
                        <span className="font-semibold text-text">{c.name}</span>
                      </td>
                      <td className="py-3 text-muted font-medium">{c.uid}</td>
                      <td className="py-3 text-right font-bold text-text">{c.tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!topUsersByTokens || topUsersByTokens.length === 0) && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted italic">
                        {vi ? "Không có dữ liệu sử dụng token." : "No token usage data available."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 4: Detailed Tables (Popular RAG Documents & Top Bots) */}
        <section className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Popular Documents */}
          <div className="rounded-card border border-border bg-surface p-[20px_24px] shadow-card flex flex-col">
            <h3 className="mb-4.5 text-[15px] font-bold tracking-tight text-text">
              {vi ? "Tài liệu RAG được Bot tra cứu nhiều nhất" : "Most Queried RAG Documents"}
            </h3>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted uppercase font-bold">
                    <th className="py-2.5 font-bold">{vi ? "Tên tài liệu" : "Document Title"}</th>
                    <th className="py-2.5 font-bold text-right">{vi ? "Số lượt Bot tra cứu" : "Query matches"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {topDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-2/40 transition">
                      <td className="py-3 font-semibold text-text truncate max-w-[280px]" title={doc.title}>
                        {doc.title}
                      </td>
                      <td className="py-3 text-right font-bold text-text">{doc.queryCount}</td>
                    </tr>
                  ))}
                  {topDocuments.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-muted italic">
                        {vi ? "Không có tài liệu nào được dùng." : "No documents queried by AI."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Bots by Token Usage */}
          {!selectedBotId ? (
            <div className="rounded-card border border-border bg-surface p-[20px_24px] shadow-card flex flex-col">
              <h3 className="mb-4.5 text-[15px] font-bold tracking-tight text-text">
                {vi ? "Bot tiêu thụ nhiều Token nhất" : "Top Bots by Token Usage"}
              </h3>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase font-bold">
                      <th className="py-2.5 font-bold">{vi ? "Tên Bot" : "Bot Name"}</th>
                      <th className="py-2.5 font-bold">{vi ? "Kênh" : "Channel"}</th>
                      <th className="py-2.5 font-bold text-right">{vi ? "Token tiêu thụ" : "Tokens used"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {topBotsByTokens?.map((b) => (
                      <tr key={b.id} className="hover:bg-surface-2/40 transition">
                        <td className="py-3 font-semibold text-text">{b.name}</td>
                        <td className="py-3 text-muted font-medium capitalize">{b.channel}</td>
                        <td className="py-3 text-right font-bold text-text">{b.tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!topBotsByTokens || topBotsByTokens.length === 0) && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-muted italic">
                          {vi ? "Không có dữ liệu xếp hạng Bot." : "No bots token data available."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-border bg-surface/40 p-[20px_24px] shadow-card flex flex-col items-center justify-center text-center py-12">
              <Icon name="info" size={26} className="text-muted mb-2 opacity-60" />
              <div className="text-xs font-bold text-muted max-w-[320px]">
                {vi 
                  ? "Bảng xếp hạng Bot đã ẩn do bạn đang lọc hiển thị theo một Bot duy nhất."
                  : "Bot rankings table is hidden since you are currently filtering by a single Bot."}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
