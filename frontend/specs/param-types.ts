import type { BusinessType, GroupBy, OperationType } from "./api-types";

/** Optional inclusive date range filters used by metrics endpoints. */
export interface DateRangeFilter {
  /** Optional inclusive lower bound in `YYYY-MM-DD` format; omitted means no lower date bound. */
  start_date?: string;
  /** Optional inclusive upper bound in `YYYY-MM-DD` format; omitted means no upper date bound. */
  end_date?: string;
}

/** Optional query parameters for GET /api/metrics/alerts. */
export interface AlertsParams extends DateRangeFilter {
  /** Minimum accepted by the API is `0` with no maximum; the PM-requested UI range is `0.01`–`1.0`, and the API default is `0.3`. */
  threshold?: number;
  /** Aggregation period: `day`, `week`, or `month`; API default is `month`. */
  group_by?: GroupBy;
  /** Optional segment filter: `B2B` or `B2C`; omitted means both segments. */
  business_type?: BusinessType;
}

/** Optional query parameters for GET /api/metrics/categories/top. */
export interface TopCategoriesParams extends DateRangeFilter {
  /** Operation to aggregate: `income` or `outcome`; API default is `outcome`. */
  operation_type?: OperationType;
  /** Integer maximum number of returned categories; OpenAPI type is integer, API default is `5`, minimum `1`, maximum `20`. */
  limit?: number;
  /** Optional segment filter: `B2B` or `B2C`; omitted means both segments. */
  business_type?: BusinessType;
}