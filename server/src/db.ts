import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data.sqlite');
export const db = new Database(dbPath);

export function runMigrations(): void {
  db.exec(`
    create table if not exists leads (
      id integer primary key autoincrement,
      created_at text not null,
      time text,
      phone text,
      name text,
      source text,
      company text,
      group_name text,
      keywords text,
      conversion text,
      micro_conversion text,
      micro_clicks integer,
      city text,
      status text,
      amount real,
      spend real,
      product text,
      raw json,
      utm_source text,
      utm_medium text,
      utm_campaign text,
      utm_term text,
      utm_content text,
      email text,
      page text
    );

    create index if not exists idx_leads_created_at on leads(created_at);
    create index if not exists idx_leads_source on leads(source);
    create index if not exists idx_leads_city on leads(city);
    create index if not exists idx_leads_product on leads(product);
    create index if not exists idx_leads_utm_source on leads(utm_source);
    create index if not exists idx_leads_status on leads(status);
  `);
}

export type LeadInput = {
  created_at?: string;
  time?: string;
  phone?: string;
  name?: string;
  source?: string;
  company?: string;
  group_name?: string;
  keywords?: string;
  conversion?: string;
  micro_conversion?: string;
  micro_clicks?: number;
  city?: string;
  status?: string;
  amount?: number;
  spend?: number;
  product?: string;
  raw?: unknown;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  email?: string;
  page?: string;
};

export function checkDuplicateLead(phone?: string, email?: string): any | null {
  if (!phone && !email) return null;
  
  const conditions: string[] = [];
  const values: Record<string, string> = {};
  
  if (phone) {
    conditions.push('phone = @phone');
    values.phone = phone;
  }
  if (email) {
    conditions.push('email = @email');
    values.email = email;
  }
  
  const where = conditions.join(' OR ');
  const stmt = db.prepare(`SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT 1`);
  return stmt.get(values) || null;
}

export function insertLead(lead: LeadInput): void {
  const stmt = db.prepare(`
    insert into leads (
      created_at, time, phone, name, source, company, group_name, keywords,
      conversion, micro_conversion, micro_clicks, city, status, amount, spend, product, raw,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content, email, page
    ) values (
      @created_at, @time, @phone, @name, @source, @company, @group_name, @keywords,
      @conversion, @micro_conversion, @micro_clicks, @city, @status, @amount, @spend, @product, json(@raw),
      @utm_source, @utm_medium, @utm_campaign, @utm_term, @utm_content, @email, @page
    )
  `);
  stmt.run({
    created_at: lead.created_at ?? new Date().toISOString(),
    time: lead.time ?? null,
    phone: lead.phone ?? null,
    name: lead.name ?? null,
    source: lead.source ?? null,
    company: lead.company ?? null,
    group_name: lead.group_name ?? null,
    keywords: lead.keywords ?? null,
    conversion: lead.conversion ?? null,
    micro_conversion: lead.micro_conversion ?? null,
    micro_clicks: lead.micro_clicks ?? null,
    city: lead.city ?? null,
    status: lead.status ?? null,
    amount: lead.amount ?? null,
    spend: lead.spend ?? null,
    product: lead.product ?? null,
    raw: lead.raw ? JSON.stringify(lead.raw) : null,
    utm_source: lead.utm_source ?? null,
    utm_medium: lead.utm_medium ?? null,
    utm_campaign: lead.utm_campaign ?? null,
    utm_term: lead.utm_term ?? null,
    utm_content: lead.utm_content ?? null,
    email: lead.email ?? null,
    page: lead.page ?? null,
  });
}

export function listLeads(params: {
  from?: string;
  to?: string;
  source?: string;
  city?: string;
  product?: string;
} = {}): any[] {
  const filters: string[] = [];
  const values: Record<string, unknown> = {};
  if (params.from) { filters.push('created_at >= @from'); values.from = params.from; }
  if (params.to) { filters.push('created_at <= @to'); values.to = params.to; }
  if (params.source) { filters.push('source = @source'); values.source = params.source; }
  if (params.city) { filters.push('city = @city'); values.city = params.city; }
  if (params.product) { filters.push('product = @product'); values.product = params.product; }
  const where = filters.length ? `where ${filters.join(' and ')}` : '';
  return db.prepare(`select * from leads ${where} order by created_at desc limit 1000`).all(values);
}

export function getMetrics(params: { from?: string; to?: string; } = {}) {
  const filters: string[] = [];
  const values: Record<string, unknown> = {};
  if (params.from) { filters.push('created_at >= @from'); values.from = params.from; }
  if (params.to) { filters.push('created_at <= @to'); values.to = params.to; }
  const where = filters.length ? `where ${filters.join(' and ')}` : '';
  const row = db.prepare(`
    select 
      count(*) as total,
      sum(case when conversion is not null and conversion <> '' then 1 else 0 end) as conversions,
      sum(spend) as spend,
      sum(amount) as amount
    from leads ${where}
  `).get(values) as { total: number; conversions: number; spend: number; amount: number };
  const avgCpa = row.conversions ? (row.spend || 0) / row.conversions : null;
  return { ...row, avg_cpa: avgCpa };
}


