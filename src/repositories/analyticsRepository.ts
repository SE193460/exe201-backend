import { pool } from "../config/db";

export type AnalyticsEventInput = {
  userId?: string | null;
  eventName: string;
  eventType?: string | null;
  listingId?: string | null;
  district?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createAnalyticsEvent(params: AnalyticsEventInput) {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO analytics_events (user_id, event_name, event_type, listing_id, district, source, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      params.userId ?? null,
      params.eventName,
      params.eventType ?? "interaction",
      params.listingId ?? null,
      params.district ?? null,
      params.source ?? null,
      params.metadata ?? {},
    ]
  );

  return result.rows[0];
}

export async function getAnalyticsOverview() {
  const [monthlyResult, listingResult, areaResult, totalsResult, recommendationResult, updateResult] = await Promise.all([
    pool.query<{ month: string; active_users: string }>(`
      WITH months AS (
        SELECT DATE_TRUNC('month', MAKE_DATE(2026, n, 1)) AS month
        FROM generate_series(1, 12) AS g(n)
      )
      SELECT TO_CHAR(m.month, 'MM') AS month,
             COUNT(DISTINCT e.user_id) AS active_users
      FROM months m
      LEFT JOIN analytics_events e
        ON e.user_id IS NOT NULL
       AND DATE_TRUNC('month', e.created_at) = m.month
      GROUP BY m.month
      ORDER BY m.month ASC
    `),
    pool.query<{ id: string; title: string; district: string | null; listing_views: string; phone_clicks: string; zalo_clicks: string; card_clicks: string }>(`
      SELECT l.id,
             l.title,
             l.district,
             COUNT(*) FILTER (WHERE e.event_name = 'listing_view') AS listing_views,
             COUNT(*) FILTER (WHERE e.event_name = 'listing_phone_click') AS phone_clicks,
             COUNT(*) FILTER (WHERE e.event_name = 'listing_zalo_click') AS zalo_clicks,
             COUNT(*) FILTER (WHERE e.event_name = 'listing_card_click') AS card_clicks
      FROM analytics_events e
      LEFT JOIN listings l ON l.id = e.listing_id
      WHERE e.listing_id IS NOT NULL
      GROUP BY l.id, l.title, l.district
      ORDER BY (
        COUNT(*) FILTER (WHERE e.event_name = 'listing_view') +
        COUNT(*) FILTER (WHERE e.event_name = 'listing_phone_click') +
        COUNT(*) FILTER (WHERE e.event_name = 'listing_zalo_click')
      ) DESC, l.title
      LIMIT 20
    `),
    pool.query<{ district: string; filter_count: string; detail_click_count: string }>(`
      SELECT COALESCE(e.district, l.district) AS district,
             COUNT(*) FILTER (WHERE e.event_name = 'listing_filter_applied') AS filter_count,
             COUNT(*) FILTER (WHERE e.event_name = 'listing_card_click') AS detail_click_count
      FROM analytics_events e
      LEFT JOIN listings l ON l.id = e.listing_id
      WHERE (
        e.event_name = 'listing_filter_applied' OR
        e.event_name = 'listing_card_click'
      )
        AND COALESCE(e.district, l.district) IS NOT NULL
      GROUP BY COALESCE(e.district, l.district)
      ORDER BY filter_count DESC, detail_click_count DESC
    `),
    pool.query<{ listing_views: string; phone_clicks: string; zalo_clicks: string }>(`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'listing_view') AS listing_views,
        COUNT(*) FILTER (WHERE event_name = 'listing_phone_click') AS phone_clicks,
        COUNT(*) FILTER (WHERE event_name = 'listing_zalo_click') AS zalo_clicks
      FROM analytics_events
    `),
    pool.query<{ recommended_clicks: string; normal_clicks: string }>(`
      SELECT
        COUNT(*) FILTER (WHERE source = 'recommended') AS recommended_clicks,
        COUNT(*) FILTER (WHERE source = 'normal') AS normal_clicks
      FROM analytics_events
      WHERE event_name = 'listing_card_click'
    `),
    pool.query<{ lifestyle_updates: string; soft_filter_updates: string }>(`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'lifestyle_profile_updated') AS lifestyle_updates,
        COUNT(*) FILTER (WHERE event_name = 'soft_filter_updated') AS soft_filter_updates
      FROM analytics_events
    `),
  ]);

  const listingCountResult = await pool.query<{ district: string; listing_count: string }>(`
    SELECT district, COUNT(*) AS listing_count
    FROM listings
    WHERE status = 'APPROVED' AND district IS NOT NULL
    GROUP BY district
  `);

  const listingCounts = Object.fromEntries(
    listingCountResult.rows.map((row) => [row.district, Number(row.listing_count)])
  );

  const areaStats = areaResult.rows.map((row) => ({
    district: row.district,
    filterCount: Number(row.filter_count),
    detailClickCount: Number(row.detail_click_count),
    listingCount: listingCounts[row.district] || 0,
  }));

  const recommendationRow = recommendationResult.rows[0] || { recommended_clicks: "0", normal_clicks: "0" };
  const totalRecommendationClicks = Number(recommendationRow.recommended_clicks) + Number(recommendationRow.normal_clicks);

  return {
    activeUsersByMonth: monthlyResult.rows.map((row) => ({
      month: row.month,
      activeUsers: Number(row.active_users),
    })),
    topListings: listingResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      district: row.district,
      detailViewCount: Number(row.listing_views),
      phoneClickCount: Number(row.phone_clicks),
      zaloClickCount: Number(row.zalo_clicks),
      cardClickCount: Number(row.card_clicks),
    })),
    areaStats,
    totals: {
      detailViewCount: Number(totalsResult.rows[0]?.listing_views || 0),
      phoneClickCount: Number(totalsResult.rows[0]?.phone_clicks || 0),
      zaloClickCount: Number(totalsResult.rows[0]?.zalo_clicks || 0),
    },
    recommendationStats: {
      recommendedClicks: Number(recommendationRow.recommended_clicks),
      normalClicks: Number(recommendationRow.normal_clicks),
      totalClicks: totalRecommendationClicks,
      recommendedRate: totalRecommendationClicks > 0 ? Number(recommendationRow.recommended_clicks) / totalRecommendationClicks : 0,
    },
    updates: {
      lifestyleProfileUpdates: Number(updateResult.rows[0]?.lifestyle_updates || 0),
      softFilterUpdates: Number(updateResult.rows[0]?.soft_filter_updates || 0),
    },
  };
}
