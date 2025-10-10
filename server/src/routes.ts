import { Router } from 'express';
import { insertLead, listLeads, getMetrics, LeadInput } from './db';
import multer from 'multer';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.post('/leads', (req, res) => {
  const body = req.body as LeadInput | LeadInput[];
  const leads = Array.isArray(body) ? body : [body];
  leads.forEach(insertLead);
  res.status(201).json({ inserted: leads.length });
});

// Generic webhook endpoint to accept payloads from various sources
router.post('/webhook/:source', (req, res) => {
  const { source } = req.params;
  const payload = req.body as Record<string, any>;
  const mapped: LeadInput = {
    created_at: new Date().toISOString(),
    phone: payload.phone || payload.tel || payload.contact_phone,
    name: payload.name || payload.fullname || payload.contact_name,
    source,
    company: payload.company || payload.account || undefined,
    group_name: payload.group || payload.campaign || undefined,
    keywords: payload.keywords || payload.keyword || undefined,
    conversion: payload.conversion || payload.event || undefined,
    micro_conversion: payload.micro_conversion || payload.micro || undefined,
    micro_clicks: payload.micro_clicks || undefined,
    city: payload.city || payload.location || undefined,
    status: payload.status || undefined,
    amount: payload.amount || payload.revenue || undefined,
    spend: payload.spend || payload.cost || undefined,
    product: payload.product || payload.item || undefined,
    utm_source: payload.utm_source || undefined,
    utm_medium: payload.utm_medium || undefined,
    utm_campaign: payload.utm_campaign || undefined,
    utm_term: payload.utm_term || undefined,
    utm_content: payload.utm_content || undefined,
    email: payload.email || payload.mail || undefined,
    page: payload.page || undefined,
    raw: payload,
  };
  insertLead(mapped);
  res.status(201).json({ ok: true });
});

router.get('/leads', (req, res) => {
  const params: { from?: string; to?: string; source?: string; city?: string; product?: string } = {};
  if (req.query.from) params.from = String(req.query.from);
  if (req.query.to) params.to = String(req.query.to);
  if (req.query.source) params.source = String(req.query.source);
  if (req.query.city) params.city = String(req.query.city);
  if (req.query.product) params.product = String(req.query.product);
  const data = listLeads(params);
  res.json({ data });
});

router.get('/metrics', (req, res) => {
  const params: { from?: string; to?: string } = {};
  if (req.query.from) params.from = String(req.query.from);
  if (req.query.to) params.to = String(req.query.to);
  const metrics = getMetrics(params);
  res.json(metrics);
});

// CSV upload endpoint
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-csv', upload.single('csv'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  try {
    const csvText = req.file.buffer.toString('utf-8');
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return res.status(400).json({ error: 'CSV is empty' });
    }
    const headerLine = lines[0] ?? '';
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    const leads: LeadInput[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i] ?? '';
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      const lead: LeadInput = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        if (value) {
          switch (header.toLowerCase()) {
            case 'время': case 'time': lead.time = value; break;
            case 'телефон': case 'phone': lead.phone = value; break;
            case 'имя': case 'name': lead.name = value; break;
            case 'источник': case 'source': lead.source = value; break;
            case 'компания': case 'company': lead.company = value; break;
            case 'группа': case 'group': lead.group_name = value; break;
            case 'ключевые слова': case 'keywords': lead.keywords = value; break;
            case 'конверсия': case 'conversion': lead.conversion = value; break;
            case 'микроконверсия': case 'micro_conversion': lead.micro_conversion = value; break;
            case 'кол-во наж фильтар': case 'micro_clicks': lead.micro_clicks = parseInt(value) || 0; break;
            case 'город': case 'city': lead.city = value; break;
            case 'статус': case 'status': lead.status = value; break;
            case 'сумма': case 'amount': lead.amount = parseFloat(value) || 0; break;
            case 'расход': case 'spend': lead.spend = parseFloat(value) || 0; break;
            case 'utm_source': case 'utm source': lead.utm_source = value; break;
            case 'utm_medium': case 'utm medium': lead.utm_medium = value; break;
            case 'utm_campaign': case 'utm campaign': lead.utm_campaign = value; break;
            case 'utm_term': case 'utm term': lead.utm_term = value; break;
            case 'utm_content': case 'utm content': lead.utm_content = value; break;
            case 'email': case 'почта': lead.email = value; break;
            case 'страница': case 'page': lead.page = value; break;
          }
        }
      });
      
      if (lead.source || lead.name || lead.phone) {
        leads.push(lead);
      }
    }
    
    leads.forEach(insertLead);
    res.json({ success: true, imported: leads.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Failed to process CSV', details: message });
  }
});

// Get available connectors/integrations
router.get('/connectors', (req, res) => {
  res.json({
    connectors: [
      {
        id: 'bitrix24',
        name: 'Bitrix24 CRM',
        description: 'Подключение через вебхук Bitrix24',
        webhookUrl: '/api/webhook/bitrix24',
        fields: ['name', 'phone', 'email', 'company', 'source', 'utm_source', 'utm_medium']
      },
      {
        id: 'amocrm',
        name: 'amoCRM',
        description: 'Подключение через вебхук amoCRM',
        webhookUrl: '/api/webhook/amocrm',
        fields: ['name', 'phone', 'email', 'company', 'source', 'utm_source', 'utm_medium']
      },
      {
        id: 'google-ads',
        name: 'Google Ads',
        description: 'Импорт конверсий из Google Ads',
        webhookUrl: '/api/webhook/google-ads',
        fields: ['conversion', 'source', 'campaign', 'keyword', 'cost', 'value']
      },
      {
        id: 'yandex-direct',
        name: 'Яндекс.Директ',
        description: 'Импорт конверсий из Яндекс.Директ',
        webhookUrl: '/api/webhook/yandex-direct',
        fields: ['conversion', 'source', 'campaign', 'keyword', 'cost', 'value']
      },
      {
        id: 'forms',
        name: 'Формы сайта',
        description: 'JavaScript код для форм на сайте',
        webhookUrl: '/api/webhook/forms',
        fields: ['name', 'phone', 'email', 'message', 'page', 'source']
      }
    ]
  });
});


