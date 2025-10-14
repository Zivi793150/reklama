const { useEffect, useState, useRef } = React;
const { Table, Card, Row, Col, DatePicker, Select, Input, Space, Statistic, ConfigProvider, theme, Button, Upload, Modal, Tabs, Typography, Divider, Tag, message, Progress, Badge } = antd;

function fetchJSON(url) {
  return axios.get(url).then(r => r.data);
}

function postJSON(url, data) {
  return axios.post(url, data).then(r => r.data);
}

function postFormData(url, formData) {
  return axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
}

function SummaryCards({ metrics }) {
  const conversionRate = metrics.total ? ((metrics.conversions || 0) / metrics.total * 100) : 0;
  const roi = metrics.spend ? ((metrics.amount || 0) / metrics.spend * 100) : 0;
  
  return (
    React.createElement(Row, { gutter: 16 }, [
      React.createElement(Col, { span: 6, key: 'total' },
        React.createElement(Card, { style: { background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' } },
          React.createElement(Statistic, { 
            title: 'Всего лидов', 
            value: metrics.total || 0,
            valueStyle: { color: '#fff' }
          })
        )
      ),
      React.createElement(Col, { span: 6, key: 'conv' },
        React.createElement(Card, { style: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' } },
          React.createElement(Statistic, { 
            title: 'Конверсии', 
            value: metrics.conversions || 0,
            valueStyle: { color: '#fff' }
          }),
          React.createElement('div', { style: { marginTop: 8, fontSize: '12px', color: 'rgba(255,255,255,0.8)' } }, 
            `Конверсия: ${conversionRate.toFixed(1)}%`
          )
        )
      ),
      React.createElement(Col, { span: 6, key: 'spend' },
        React.createElement(Card, { style: { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' } },
          React.createElement(Statistic, { 
            title: 'Расход', 
            value: metrics.spend || 0, 
            precision: 2,
            prefix: '₸',
            valueStyle: { color: '#fff' }
          })
        )
      ),
      React.createElement(Col, { span: 6, key: 'roi' },
        React.createElement(Card, { style: { background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' } },
          React.createElement(Statistic, { 
            title: 'ROI', 
            value: roi || 0, 
            precision: 1,
            suffix: '%',
            valueStyle: { color: '#fff' }
          }),
          React.createElement('div', { style: { marginTop: 8, fontSize: '12px', color: 'rgba(255,255,255,0.8)' } }, 
            `Доход: ₸${(metrics.amount || 0).toFixed(0)}`
          )
        )
      )
    ])
  );
}

function Filters({ filters, setFilters, reload }) {
  return (
    React.createElement(Card, { style: { marginBottom: 16 } },
      React.createElement(Space, { wrap: true, style: { width: '100%' } }, [
        React.createElement(DatePicker.RangePicker, {
          key: 'dates',
          placeholder: ['От', 'До'],
          onChange: (v) => setFilters(f => ({ ...f, from: v?.[0]?.toISOString(), to: v?.[1]?.toISOString() }))
        }),
        React.createElement(Input, { 
          key: 'source', 
          placeholder: 'Источник', 
          allowClear: true, 
          style: { width: 180 },
          onChange: e => setFilters(f => ({ ...f, source: e.target.value || undefined })) 
        }),
        React.createElement(Input, { 
          key: 'city', 
          placeholder: 'Город', 
          allowClear: true, 
          style: { width: 160 },
          onChange: e => setFilters(f => ({ ...f, city: e.target.value || undefined })) 
        }),
        React.createElement(Input, { 
          key: 'product', 
          placeholder: 'Продукт', 
          allowClear: true, 
          style: { width: 200 },
          onChange: e => setFilters(f => ({ ...f, product: e.target.value || undefined })) 
        }),
        React.createElement(Button, { type: 'primary', onClick: reload }, 'Обновить')
      ])
    )
  );
}

function CSVUpload({ onUpload }) {
  const [visible, setVisible] = useState(false);
  
  const uploadProps = {
    name: 'csv',
    accept: '.csv',
    beforeUpload: (file) => {
      const formData = new FormData();
      formData.append('csv', file);
      
      postFormData('/api/upload-csv', formData)
        .then(res => {
          message.success(`Импортировано ${res.imported} записей`);
          onUpload();
          setVisible(false);
        })
        .catch(err => {
          message.error('Ошибка импорта: ' + (err.response?.data?.error || err.message));
        });
      
      return false; // Prevent upload
    }
  };

  return (
    React.createElement('div', null, [
      React.createElement(Button, { 
        type: 'dashed', 
        onClick: () => setVisible(true),
        style: { marginBottom: 16 }
      }, '📁 Импорт CSV'),
      React.createElement(Modal, {
        title: 'Импорт данных из CSV',
        open: visible,
        onCancel: () => setVisible(false),
        footer: null
      },
        React.createElement('div', { style: { textAlign: 'center', padding: '20px' } }, [
          React.createElement(Upload.Dragger, uploadProps,
            React.createElement('p', { className: 'ant-upload-drag-icon' }, '📄'),
            React.createElement('p', { className: 'ant-upload-text' }, 'Перетащите CSV файл сюда'),
            React.createElement('p', { className: 'ant-upload-hint' }, 'или нажмите для выбора файла')
          ),
          React.createElement('div', { style: { marginTop: 16, fontSize: '12px', color: '#666' } }, [
            React.createElement('p', null, 'Поддерживаемые колонки:'),
            React.createElement('p', null, 'Время, Телефон, Имя, Источник, Компания, Группа, Ключевые слова, Конверсия, Микроконверсия, Город, Сумма, Расход')
          ])
        ])
      )
    ])
  );
}

function ChartsSection({ data }) {
  const chartRef = useRef(null);
  const pieChartRef = useRef(null);
  
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Prepare data for charts
    const sourceData = {};
    const cityData = {};
    const dailyData = {};
    
    data.forEach(lead => {
      // Source distribution
      const source = lead.source || 'Неизвестно';
      sourceData[source] = (sourceData[source] || 0) + 1;
      
      // City distribution
      const city = lead.city || 'Неизвестно';
      cityData[city] = (cityData[city] || 0) + 1;
      
      // Daily distribution
      const date = lead.created_at ? lead.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });
    
    // Line chart for daily leads
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      const sortedDates = Object.keys(dailyData).sort();
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            label: 'Лиды по дням',
            data: sortedDates.map(date => dailyData[date]),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }
    
    // Pie chart for sources
    if (pieChartRef.current) {
      const ctx = pieChartRef.current.getContext('2d');
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
      
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(sourceData),
          datasets: [{
            data: Object.values(sourceData),
            backgroundColor: colors.slice(0, Object.keys(sourceData).length),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
  }, [data]);
  
  return (
    React.createElement(Row, { gutter: 16, style: { marginBottom: 24 } }, [
      React.createElement(Col, { span: 12, key: 'line-chart' },
        React.createElement(Card, { 
          title: '📈 Динамика лидов',
          className: 'chart-container'
        },
          React.createElement('canvas', { 
            ref: chartRef,
            style: { maxHeight: '300px' }
          })
        )
      ),
      React.createElement(Col, { span: 12, key: 'pie-chart' },
        React.createElement(Card, { 
          title: '🎯 Источники трафика',
          className: 'chart-container'
        },
          React.createElement('canvas', { 
            ref: pieChartRef,
            style: { maxHeight: '300px' }
          })
        )
      )
    ])
  );
}

function UTMAnalytics({ data }) {
  const utmData = {};
  
  data.forEach(lead => {
    if (lead.raw && typeof lead.raw === 'string') {
      try {
        const raw = JSON.parse(lead.raw);
        const utmSource = raw.utm_source || 'Прямой трафик';
        const utmMedium = raw.utm_medium || 'Неизвестно';
        const utmCampaign = raw.utm_campaign || 'Неизвестно';
        
        const key = `${utmSource} / ${utmMedium}`;
        if (!utmData[key]) {
          utmData[key] = {
            source: utmSource,
            medium: utmMedium,
            campaign: utmCampaign,
            leads: 0,
            conversions: 0,
            spend: 0
          };
        }
        
        utmData[key].leads++;
        if (lead.conversion) utmData[key].conversions++;
        if (lead.spend) utmData[key].spend += lead.spend;
      } catch (e) {
        // Ignore parsing errors
      }
    }
  });
  
  const utmRows = Object.values(utmData).map((item, index) => ({
    key: index,
    source: item.source,
    medium: item.medium,
    campaign: item.campaign,
    leads: item.leads,
    conversions: item.conversions,
    conversionRate: item.leads ? ((item.conversions / item.leads) * 100).toFixed(1) : '0',
    spend: item.spend.toFixed(2),
    cpa: item.conversions ? (item.spend / item.conversions).toFixed(2) : '0'
  }));
  
  const utmColumns = [
    { title: 'Источник', dataIndex: 'source', key: 'source', width: 140 },
    { title: 'Канал', dataIndex: 'medium', key: 'medium', width: 120 },
    { title: 'Кампания', dataIndex: 'campaign', key: 'campaign', width: 180 },
    { title: 'Лиды', dataIndex: 'leads', key: 'leads', width: 80 },
    { title: 'Конверсии', dataIndex: 'conversions', key: 'conversions', width: 100 },
    { title: 'Конверсия %', dataIndex: 'conversionRate', key: 'conversionRate', width: 120 },
    { title: 'Расход ₸', dataIndex: 'spend', key: 'spend', width: 120 },
    { title: 'CPA ₸', dataIndex: 'cpa', key: 'cpa', width: 100 }
  ];
  
  return (
    React.createElement(Card, { 
      title: '🎯 UTM Аналитика',
      style: { marginBottom: 24 }
    },
      React.createElement(Table, {
        dataSource: utmRows,
        columns: utmColumns,
        pagination: { pageSize: 10 },
        size: 'small'
      })
    )
  );
}

function ConnectorsList({ connectors }) {
  const [visible, setVisible] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState(null);

  const showConnector = (connector) => {
    setSelectedConnector(connector);
    setVisible(true);
  };

  return (
    React.createElement('div', null, [
      React.createElement(Button, { 
        type: 'primary', 
        onClick: () => setVisible(true),
        style: { marginBottom: 16, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none' }
      }, '🔗 Подключить сайт'),
      React.createElement(Modal, {
        title: 'Подключение сайтов и CRM',
        open: visible,
        onCancel: () => setVisible(false),
        width: 800,
        footer: null
      },
        React.createElement(Tabs, { items: [
          {
            key: 'list',
            label: 'Доступные подключения',
            children: React.createElement(Row, { gutter: 16 },
              connectors.map(connector => 
                React.createElement(Col, { span: 12, key: connector.id, style: { marginBottom: 16 } },
                  React.createElement(Card, { 
                    hoverable: true,
                    onClick: () => showConnector(connector),
                    style: { height: '100%' }
                  }, [
                    React.createElement('h4', { key: 'title' }, connector.name),
                    React.createElement('p', { key: 'desc' }, connector.description),
                    React.createElement('div', { key: 'tags' },
                      connector.fields.map(field => 
                        React.createElement(Tag, { key: field, size: 'small' }, field)
                      )
                    )
                  ])
                )
              )
            )
          },
          {
            key: 'help',
            label: 'Как подключить',
            children: React.createElement('div', { style: { padding: '20px' } }, [
              React.createElement(Typography.Title, { level: 4 }, '1. CRM системы (Bitrix24, amoCRM)'),
              React.createElement('p', null, 'В настройках CRM найдите раздел "Вебхуки" или "Интеграции" и добавьте URL:'),
              React.createElement('code', { style: { background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' } }, 
                `${window.location.origin}/api/webhook/${selectedConnector?.id || 'bitrix24'}`
              ),
              React.createElement(Divider, null),
              React.createElement(Typography.Title, { level: 4 }, '2. Формы на сайте — самый простой способ'),
              React.createElement('p', null, 'Скопируйте одну строку ниже и вставьте перед закрывающим тегом </body> на вашем сайте:'),
              React.createElement('pre', { style: { background: '#f1f5f9', padding: '12px', borderRadius: '4px', overflow: 'auto' } }, 
                `<script src="${window.location.origin}/integrate.js" data-source="website_form" defer></script>`
              ),
              React.createElement('p', { style: { color: '#64748b', marginTop: 8 } }, 'Скрипт автоматически найдёт все формы, подхватит поля (имя, телефон, email), UTM-метки и будет отправлять заявки на дашборд.'),
              React.createElement(Divider, null),
              React.createElement(Typography.Title, { level: 4 }, '3. Google Ads / Яндекс.Директ'),
              React.createElement('p', null, 'Настройте отслеживание конверсий с отправкой данных на наш вебхук при совершении целевых действий.')
            ])
          }
        ]})
      )
    ])
  );
}

function App() {
  const [filters, setFilters] = useState({});
  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [connectors, setConnectors] = useState([]);

  const load = () => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v))).toString();
    fetchJSON(`/api/leads${q ? `?${q}` : ''}`).then(res => setData(res.data));
    fetchJSON(`/api/metrics${q ? `?${q}` : ''}`).then(setMetrics);
  };

  const loadConnectors = () => {
    fetchJSON('/api/connectors').then(res => setConnectors(res.connectors));
  };

  useEffect(() => { 
    load(); 
    loadConnectors();
  }, []);

  const getStatusBadge = (status) => {
    if (!status) return React.createElement('span', { className: 'status-pending' }, 'Ожидает');
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('оплач') || statusLower.includes('paid') || statusLower.includes('успеш')) {
      return React.createElement('span', { className: 'status-paid' }, 'Оплачено');
    } else if (statusLower.includes('отказ') || statusLower.includes('failed') || statusLower.includes('неудач')) {
      return React.createElement('span', { className: 'status-failed' }, 'Отказ');
    } else {
      return React.createElement('span', { className: 'status-pending' }, status);
    }
  };

  const columns = [
    { 
      title: 'Время', 
      dataIndex: 'created_at', 
      key: 'created_at', 
      width: 140,
      render: (date) => date ? new Date(date).toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : '-'
    },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: 'Имя', dataIndex: 'name', key: 'name', width: 120 },
    { 
      title: 'Источник', 
      dataIndex: 'source', 
      key: 'source', 
      width: 140,
      render: (source) => React.createElement(Badge, { 
        color: source === 'website_form' ? 'green' : source === 'google Ads' ? 'blue' : 'orange',
        text: source || 'Неизвестно'
      })
    },
    { title: 'Компания', dataIndex: 'company', key: 'company', width: 140 },
    { title: 'Группа', dataIndex: 'group_name', key: 'group_name', width: 180 },
    { title: 'Ключевые слова', dataIndex: 'keywords', key: 'keywords', width: 250 },
    { 
      title: 'Конверсия', 
      dataIndex: 'conversion', 
      key: 'conversion', 
      width: 140,
      render: (conversion) => conversion ? 
        React.createElement(Badge, { color: 'green', text: conversion }) : 
        React.createElement(Badge, { color: 'gray', text: 'Нет' })
    },
    { title: 'Микроконверсия', dataIndex: 'micro_conversion', key: 'micro_conversion', width: 140 },
    { title: 'Клики фильтра', dataIndex: 'micro_clicks', key: 'micro_clicks', width: 120 },
    { title: 'Город', dataIndex: 'city', key: 'city', width: 120 },
    { 
      title: 'Статус оплаты', 
      dataIndex: 'status', 
      key: 'status', 
      width: 140,
      render: (status) => getStatusBadge(status)
    },
    { 
      title: 'Сумма ₸', 
      dataIndex: 'amount', 
      key: 'amount', 
      width: 120,
      render: (amount) => amount ? `₸${amount.toFixed(0)}` : '-'
    },
    { 
      title: 'Расход ₸', 
      dataIndex: 'spend', 
      key: 'spend', 
      width: 120,
      render: (spend) => spend ? `₸${spend.toFixed(2)}` : '-'
    },
  ];

  return (
    React.createElement(ConfigProvider, { theme: { algorithm: theme.defaultAlgorithm } },
      React.createElement('div', { style: { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)' } },
        React.createElement('div', { style: { maxWidth: '1800px', margin: '0 auto', padding: '24px 16px' } }, [
          React.createElement('div', { 
            key: 'header',
            style: { 
              textAlign: 'center', 
              marginBottom: '32px',
              background: 'rgba(255,255,255,0.8)',
              padding: '24px',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            } 
          }, [
            React.createElement('h1', { 
              style: { 
                fontSize: '32px', 
                fontWeight: '700', 
                margin: '0 0 8px 0',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              } 
            }, '📊 Аналитика рекламных кампаний'),
            React.createElement('p', { 
              style: { 
                fontSize: '16px', 
                color: '#64748b', 
                margin: 0 
              } 
            }, 'Универсальная система аналитики для любых сайтов и CRM')
          ]),
          React.createElement(SummaryCards, { key: 'summary', metrics }),
          React.createElement('div', { key: 'actions', style: { display: 'flex', gap: '12px', marginBottom: '16px' } }, [
            React.createElement(CSVUpload, { key: 'csv', onUpload: load }),
            React.createElement(ConnectorsList, { key: 'connectors', connectors })
          ]),
          React.createElement(Filters, { key: 'filters', filters, setFilters, reload: load }),
          React.createElement(ChartsSection, { key: 'charts', data }),
          React.createElement(UTMAnalytics, { key: 'utm', data }),
          React.createElement(Card, { 
            key: 'table',
            title: '📋 Детальная таблица лидов',
            style: { 
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(226, 232, 240, 0.6)',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          },
            React.createElement(Table, { 
              rowKey: 'id', 
              dataSource: data, 
              columns, 
              pagination: { pageSize: 20 },
              size: 'small'
            })
          )
        ])
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
