// ==========================================
// DARK MODE (NEXORA REFERENCE DATASET)
// ==========================================
export const dashboardMetrics = [
  {
    id: "total-revenue",
    title: "Total Revenue",
    value: "$48,250.75",
    rawNumber: 48250.75,
    change: "+12.5%",
    comparison: "vs May 11 - Jun 9",
    isPositive: true,
    icon: "dollar",
    sparklineColor: "#8b5cf6",
    sparklinePoints: [28, 35, 30, 42, 38, 55, 48, 62, 58, 75, 70, 85],
    iconBg: "rgba(139, 92, 246, 0.15)",
    iconColor: "#a78bfa"
  },
  {
    id: "orders",
    title: "Orders",
    value: "1,254",
    rawNumber: 1254,
    change: "+8.2%",
    comparison: "vs May 11 - Jun 9",
    isPositive: true,
    icon: "bag",
    sparklineColor: "#3b82f6",
    sparklinePoints: [30, 25, 40, 35, 50, 45, 60, 55, 68, 62, 75, 80],
    iconBg: "rgba(59, 130, 246, 0.15)",
    iconColor: "#60a5fa"
  },
  {
    id: "customers",
    title: "Customers",
    value: "842",
    rawNumber: 842,
    change: "+15.3%",
    comparison: "vs May 11 - Jun 9",
    isPositive: true,
    icon: "users",
    sparklineColor: "#8b5cf6",
    sparklinePoints: [20, 32, 28, 45, 40, 52, 48, 65, 60, 72, 78, 88],
    iconBg: "rgba(139, 92, 246, 0.15)",
    iconColor: "#a78bfa"
  },
  {
    id: "conversion-rate",
    title: "Conversion Rate",
    value: "3.24%",
    rawNumber: 3.24,
    change: "+6.7%",
    comparison: "vs May 11 - Jun 9",
    isPositive: true,
    icon: "trending",
    sparklineColor: "#3b82f6",
    sparklinePoints: [35, 30, 45, 40, 55, 50, 62, 58, 70, 68, 80, 84],
    iconBg: "rgba(59, 130, 246, 0.15)",
    iconColor: "#60a5fa"
  }
];

export const revenueOverviewData = {
  daily: [
    { label: "May 12", revenue: 16500, expenses: 10200 },
    { label: "May 14", revenue: 21000, expenses: 13500 },
    { label: "May 16", revenue: 19800, expenses: 12000 },
    { label: "May 19", revenue: 32400, expenses: 18600 },
    { label: "May 21", revenue: 27000, expenses: 16200 },
    { label: "May 23", revenue: 34500, expenses: 19800 },
    { label: "May 26", revenue: 28200, expenses: 17400 },
    { label: "May 29", revenue: 41000, expenses: 23100 },
    { label: "Jun 2", revenue: 35600, expenses: 21000 },
    { label: "Jun 5", revenue: 44200, expenses: 24800 },
    { label: "Jun 9", revenue: 48250, expenses: 27100 }
  ],
  weekly: [
    { label: "Week 1", revenue: 28400, expenses: 16200 },
    { label: "Week 2", revenue: 34100, expenses: 19800 },
    { label: "Week 3", revenue: 41200, expenses: 22900 },
    { label: "Week 4", revenue: 48250, expenses: 27100 }
  ],
  monthly: [
    { label: "Jan", revenue: 24000, expenses: 14000 },
    { label: "Feb", revenue: 28500, expenses: 16200 },
    { label: "Mar", revenue: 33800, expenses: 18900 },
    { label: "Apr", revenue: 39500, expenses: 22100 },
    { label: "May", revenue: 45100, expenses: 25400 },
    { label: "Jun", revenue: 48250, expenses: 27100 }
  ]
};

export const salesChannelData = {
  total: "$48,250.75",
  channels: [
    {
      name: "Online Store",
      subName: "1-on-1 Sessions",
      percentage: 52,
      amount: "$25,090.39",
      color: "#8b5cf6"
    },
    {
      name: "Marketplace",
      subName: "Service Packages",
      percentage: 24,
      amount: "$11,580.18",
      color: "#06b6d4"
    },
    {
      name: "Social Media",
      subName: "Advisory Retainers",
      percentage: 16,
      amount: "$7,720.12",
      color: "#f97316"
    },
    {
      name: "Other",
      subName: "AI Matchmaking",
      percentage: 8,
      amount: "$3,860.06",
      color: "#3b82f6"
    }
  ]
};

export const topProductsData = [
  {
    id: "p1",
    name: "Wireless Headphones",
    subtext: "2,350 sold",
    expertName: "Audio Engineering Lab",
    amount: "$12,580.50",
    growth: "+14.5%",
    icon: "headphones"
  },
  {
    id: "p2",
    name: "Smart Watch Series 5",
    subtext: "1,920 sold",
    expertName: "Hardware IoT Strategy",
    amount: "$10,230.00",
    growth: "+9.8%",
    icon: "watch"
  },
  {
    id: "p3",
    name: "Bluetooth Speaker",
    subtext: "1,450 sold",
    expertName: "Acoustic System Advisory",
    amount: "$6,870.00",
    growth: "+7.2%",
    icon: "speaker"
  },
  {
    id: "p4",
    name: "Portable Charger",
    subtext: "1,150 sold",
    expertName: "Battery & Energy Tech",
    amount: "$4,600.00",
    growth: "+5.6%",
    icon: "battery"
  }
];

export const recentOrdersData = [
  {
    id: "#ORD-00125",
    customer: "John Smith",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    date: "Jun 10, 2026",
    service: "AI Architecture Review",
    amount: "$249.99",
    status: "Completed",
    statusType: "success"
  },
  {
    id: "#ORD-00124",
    customer: "Sarah Johnson",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    date: "Jun 10, 2026",
    service: "SaaS Go-To-Market Strategy",
    amount: "$159.99",
    status: "Processing",
    statusType: "info"
  },
  {
    id: "#ORD-00123",
    customer: "Michael Brown",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    date: "Jun 9, 2026",
    service: "Smart Contract Audit",
    amount: "$89.99",
    status: "Shipped",
    statusType: "purple"
  },
  {
    id: "#ORD-00122",
    customer: "Emily Davis",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80",
    date: "Jun 9, 2026",
    service: "Kubernetes Migration Sprint",
    amount: "$199.99",
    status: "Completed",
    statusType: "success"
  }
];

export const customerGrowthData = [
  { month: "Jan", count: 210, heightPct: 28 },
  { month: "Feb", count: 340, heightPct: 45 },
  { month: "Mar", count: 480, heightPct: 62 },
  { month: "Apr", count: 610, heightPct: 78 },
  { month: "May", count: 720, heightPct: 88 },
  { month: "Jun", count: 842, heightPct: 100 }
];

// ==========================================
// WHITE MODE (METRICFLOW REFERENCE DATASET)
// ==========================================
export const lightMetrics = [
  {
    id: "light-rev",
    title: "Total Revenue",
    value: "$248,400",
    change: "12.5%",
    comparison: "vs Apr 1 – Apr 30",
    icon: "dollar",
    iconBg: "#e0f2fe",
    iconColor: "#0284c7",
    sparklineColor: "#38bdf8",
    sparklinePoints: [20, 26, 24, 34, 30, 48, 42, 58, 52, 68, 62, 75]
  },
  {
    id: "light-orders",
    title: "Orders",
    value: "1,842",
    change: "8.3%",
    comparison: "vs Apr 1 – Apr 30",
    icon: "cart",
    iconBg: "#f3e8ff",
    iconColor: "#9333ea",
    sparklineColor: "#a855f7",
    sparklinePoints: [30, 24, 38, 32, 45, 40, 52, 48, 62, 56, 70, 78]
  },
  {
    id: "light-cust",
    title: "New Customers",
    value: "324",
    change: "15.7%",
    comparison: "vs Apr 1 – Apr 30",
    icon: "users",
    iconBg: "#dcfce7",
    iconColor: "#16a34a",
    sparklineColor: "#22c55e",
    sparklinePoints: [18, 28, 25, 38, 34, 46, 42, 55, 50, 64, 60, 72]
  },
  {
    id: "light-aov",
    title: "Average Order Value",
    value: "$134.87",
    change: "6.2%",
    comparison: "vs Apr 1 – Apr 30",
    icon: "trend",
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    sparklineColor: "#f59e0b",
    sparklinePoints: [28, 32, 30, 40, 36, 48, 44, 56, 52, 65, 60, 74]
  },
  {
    id: "light-conv",
    title: "Conversion Rate",
    value: "3.62%",
    change: "9.1%",
    comparison: "vs Apr 1 – Apr 30",
    icon: "percent",
    iconBg: "#e0e7ff",
    iconColor: "#4f46e5",
    sparklineColor: "#6366f1",
    sparklinePoints: [22, 28, 25, 36, 32, 44, 40, 54, 50, 62, 58, 76]
  }
];

export const lightSalesOverview = [
  { month: "Jan", rev2023: 130000, rev2024: 170000 },
  { month: "Feb", rev2023: 145000, rev2024: 195000 },
  { month: "Mar", rev2023: 165000, rev2024: 200000 },
  { month: "Apr", rev2023: 160000, rev2024: 205000 },
  { month: "May", rev2023: 180400, rev2024: 248400, isHighlighted: true },
  { month: "Jun", rev2023: 170000, rev2024: 198000 },
  { month: "Jul", rev2023: 175000, rev2024: 205000 },
  { month: "Aug", rev2023: 165000, rev2024: 195000 },
  { month: "Sep", rev2023: 170000, rev2024: 215000 },
  { month: "Oct", rev2023: 175000, rev2024: 220000 },
  { month: "Nov", rev2023: 180000, rev2024: 235000 },
  { month: "Dec", rev2023: 190000, rev2024: 250000 }
];

export const lightTrafficOverview = [
  { month: "Jan", website: 48000, unique: 28000 },
  { month: "Feb", website: 58000, unique: 38000 },
  { month: "Mar", website: 72000, unique: 52000 },
  { month: "Apr", website: 88000, unique: 60000 },
  { month: "May", website: 86400, unique: 54200, isHighlighted: true },
  { month: "Jun", website: 78000, unique: 46000 },
  { month: "Jul", website: 82000, unique: 56000 },
  { month: "Aug", website: 80000, unique: 55000 },
  { month: "Sep", website: 82000, unique: 58000 },
  { month: "Oct", website: 86000, unique: 61000 },
  { month: "Nov", website: 90000, unique: 63000 },
  { month: "Dec", website: 94000, unique: 66000 }
];

export const lightTopProducts = [
  {
    id: "lp-1",
    name: "Wireless Earbuds Pro",
    revenue: "$45,880",
    orders: 320,
    conversion: "4.28%",
    icon: "headphones",
    sparkline: [25, 30, 28, 38, 35, 45, 42, 50, 48, 60]
  },
  {
    id: "lp-2",
    name: "Smartwatch Series 5",
    revenue: "$37,650",
    orders: 289,
    conversion: "3.91%",
    icon: "watch",
    sparkline: [22, 28, 26, 36, 33, 42, 38, 48, 45, 55]
  },
  {
    id: "lp-3",
    name: "Portable Bluetooth Speaker",
    revenue: "$28,340",
    orders: 210,
    conversion: "3.48%",
    icon: "speaker",
    sparkline: [20, 25, 23, 32, 29, 38, 35, 44, 40, 50]
  },
  {
    id: "lp-4",
    name: "Fast Wireless Charger",
    revenue: "$18,920",
    orders: 164,
    conversion: "2.95%",
    icon: "battery",
    sparkline: [18, 22, 20, 28, 25, 34, 30, 38, 36, 44]
  }
];

export const lightChannelData = {
  total: "$248,400",
  growth: "11.2%",
  channels: [
    { name: "Online Store", percentage: 40, amount: "$99,360", growth: "12.4%", color: "#0f172a" }, // Navy
    { name: "Marketplace", percentage: 30, amount: "$74,520", growth: "8.7%", color: "#2563eb" },  // Blue
    { name: "Retail", percentage: 20, amount: "$49,680", growth: "15.3%", color: "#7c3aed" },       // Purple
    { name: "Wholesale", percentage: 10, amount: "$24,840", growth: "6.1%", color: "#38bdf8" }     // Sky
  ]
};

// ==========================================
// ANALYTICS PAGE DATA
// ==========================================

export const analyticsKPIs = [
  {
    id: "mrr",
    label: "Monthly Recurring Revenue",
    value: "$48,250",
    change: "+12.5%",
    isPositive: true,
    sub: "vs last month",
    color: "#8b5cf6",
    sparkline: [28000, 31000, 29500, 35000, 33000, 40000, 38000, 43000, 41500, 46000, 44000, 48250]
  },
  {
    id: "arr",
    label: "Annual Run Rate",
    value: "$579,000",
    change: "+14.1%",
    isPositive: true,
    sub: "projected 12-month",
    color: "#3b82f6",
    sparkline: [430000, 448000, 462000, 475000, 488000, 499000, 510000, 521000, 535000, 550000, 565000, 579000]
  },
  {
    id: "arpu",
    label: "Avg Revenue / Expert",
    value: "$1,847",
    change: "+6.3%",
    isPositive: true,
    sub: "per active expert/mo",
    color: "#10b981",
    sparkline: [1400, 1480, 1520, 1600, 1580, 1650, 1700, 1730, 1760, 1800, 1825, 1847]
  },
  {
    id: "gmv",
    label: "Gross Marketplace Volume",
    value: "$284,800",
    change: "+18.2%",
    isPositive: true,
    sub: "total session value",
    color: "#f97316",
    sparkline: [180000, 195000, 188000, 210000, 205000, 225000, 220000, 242000, 238000, 258000, 272000, 284800]
  }
];

export const revenueTimelineData = [
  { month: "Jan", revenue: 28400, sessions: 312, experts: 18 },
  { month: "Feb", revenue: 31200, sessions: 348, experts: 21 },
  { month: "Mar", revenue: 29800, sessions: 328, experts: 20 },
  { month: "Apr", revenue: 35600, sessions: 402, experts: 24 },
  { month: "May", revenue: 33100, sessions: 374, experts: 22 },
  { month: "Jun", revenue: 40200, sessions: 458, experts: 27 },
  { month: "Jul", revenue: 38500, sessions: 436, experts: 26 },
  { month: "Aug", revenue: 43800, sessions: 496, experts: 29 },
  { month: "Sep", revenue: 41900, sessions: 474, experts: 28 },
  { month: "Oct", revenue: 46200, sessions: 524, experts: 31 },
  { month: "Nov", revenue: 44600, sessions: 508, experts: 30 },
  { month: "Dec", revenue: 48250, sessions: 548, experts: 32 }
];

export const funnelData = [
  { step: "Expert Profile Impressions", count: 142500, pct: 100, color: "#8b5cf6" },
  { step: "Profile Deep-Dive Views", count: 38400, pct: 26.9, color: "#6366f1" },
  { step: "Booking Initiated", count: 9200, pct: 23.9, color: "#3b82f6" },
  { step: "Checkout Completed", count: 4620, pct: 50.2, color: "#06b6d4" },
  { step: "Sessions Completed", count: 1254, pct: 27.1, color: "#10b981" }
];

export const topExpertLeaderboard = [
  { rank: 1, name: "Dr. Aris Thorne", category: "AI & ML", sessions: 48, revenue: "$14,400", rating: 4.98, growth: "+22%", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80" },
  { rank: 2, name: "Sophia Chen", category: "Cloud & DevOps", sessions: 41, revenue: "$10,660", rating: 4.97, growth: "+18%", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=60&auto=format&fit=crop&q=80" },
  { rank: 3, name: "Marcus Reid", category: "Security", sessions: 36, revenue: "$12,240", rating: 4.95, growth: "+14%", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=60&auto=format&fit=crop&q=80" },
  { rank: 4, name: "Elena Vasquez", category: "Design & UX", sessions: 33, revenue: "$7,260", rating: 4.93, growth: "+11%", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&auto=format&fit=crop&q=80" },
  { rank: 5, name: "James Okonkwo", category: "Finance", sessions: 29, revenue: "$8,700", rating: 4.91, growth: "+9%", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&auto=format&fit=crop&q=80" }
];

export const utilizationHeatmap = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  hours: ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm"],
  data: [
    [2, 5, 8, 6, 4, 1, 0],
    [4, 9, 12, 10, 7, 2, 1],
    [6, 11, 15, 13, 9, 3, 1],
    [3, 8, 10, 11, 8, 4, 2],
    [5, 10, 14, 12, 10, 5, 2],
    [7, 12, 16, 14, 11, 6, 3],
    [6, 11, 15, 13, 10, 5, 2],
    [5, 9, 13, 11, 8, 4, 2],
    [4, 7, 10, 9, 6, 3, 1],
    [2, 4, 6, 5, 3, 1, 0]
  ]
};

export const geoData = [
  { region: "North America", revenue: "$189,200", sessions: 724, pct: 66.4, color: "#8b5cf6" },
  { region: "Europe", revenue: "$57,600", sessions: 220, pct: 20.2, color: "#3b82f6" },
  { region: "Asia Pacific", revenue: "$28,800", sessions: 110, pct: 10.1, color: "#10b981" },
  { region: "Middle East", revenue: "$6,400", sessions: 24, pct: 2.2, color: "#f97316" },
  { region: "Other", revenue: "$2,800", sessions: 11, pct: 1.0, color: "#64748b" }
];

export const unitEconomics = {
  cac: { value: "$124", label: "Customer Acq. Cost", trend: "-8%", good: true },
  ltv: { value: "$2,840", label: "Lifetime Value (LTV)", trend: "+14%", good: true },
  ltvCacRatio: { value: "22.9x", label: "LTV : CAC Ratio", trend: "+24%", good: true },
  payback: { value: "3.2 mo", label: "CAC Payback Period", trend: "-0.4 mo", good: true },
  nrr: { value: "118%", label: "Net Revenue Retention", trend: "+6pp", good: true },
  churn: { value: "1.8%", label: "Monthly Churn Rate", trend: "-0.3pp", good: true }
};

