/** Backend operation types. */
export type OperationType = "income" | "outcome";

/** Backend customer/business segments. */
export type BusinessType = "B2B" | "B2C";

/** Backend movement categories. */
export type Category =
  | "suppliers"
  | "sales"
  | "operational"
  | "administrative"
  | "others";

/** Supported aggregation periods. */
export type GroupBy = "day" | "week" | "month";

/** Response from GET /api/metrics/facets. */
export interface FacetsResponse {
  /** Available operation types: `income` and `outcome`. */
  operation_types: OperationType[];
  /** Available business segments: `B2B` and `B2C`. */
  business_types: BusinessType[];
  /** Available categories: `suppliers`, `sales`, `operational`, `administrative`, and `others`. */
  categories: Category[];
  /** Earliest available movement date in `YYYY-MM-DD` format. */
  min_date: string;
  /** Latest available movement date in `YYYY-MM-DD` format. */
  max_date: string;
}

/** One anomaly alert returned by GET /api/metrics/alerts. */
export interface AlertEntry {
  /**
   * Aggregation period formatted according to `group_by`: `day` is `YYYY-MM-DD`,
   * `week` is `YYYY-Www` (ISO year and two-digit ISO week, e.g. `2026-W03`),
   * and `month` is `YYYY-MM`. Confirmed where the backend constructs keys:
   * `backend/app/routes.py:169-175`.
   */
  period: string;
  /** Outcome total for this period. */
  outcome_total: number;
  /** Mean outcome across all preceding periods, not a rolling three-period mean; see `backend/app/routes.py:227`. */
  baseline_average: number;
  /** Relative increase ratio, not a percentage; `0.45` represents a 45% increase. */
  increase_ratio: number;
}

/** Response from GET /api/metrics/alerts. */
export type AlertsResponse = AlertEntry[];

/** One aggregated category returned by GET /api/metrics/categories/top. */
export interface CategoryEntry {
  /** Category name: `suppliers`, `sales`, `operational`, `administrative`, or `others`. */
  category: Category;
  /** Operation type used to aggregate this entry: `income` or `outcome`. */
  operation_type: OperationType;
  /** Sum of movement amounts for this category and operation type. */
  total_amount: number;
}

/** Response from GET /api/metrics/categories/top. */
export type TopCategoriesResponse = CategoryEntry[];