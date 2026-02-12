export type MoneyValue = {
  units?: string | number;
  nano?: number;
  currency?: string;
};

export type PortfolioPosition = {
  figi?: string;
  instrument_uid?: string;
  position_uid?: string;
  instrument_type?: string;
  quantity?: MoneyValue;
  average_position_price?: MoneyValue;
  current_price?: MoneyValue;
  expected_yield?: MoneyValue;
};

export type PortfolioResponse = {
  positions?: PortfolioPosition[];
  total_amount_portfolio?: MoneyValue;
};

export type AccountInfo = {
  id?: string;
  name?: string;
  type?: string;
  status?: string;
  access_level?: string;
  opened_date?: { seconds?: string | number };
};

export type AccountsResponse = {
  accounts?: AccountInfo[];
};
