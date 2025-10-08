const { useEffect, useState } = React;
const { Table, Card, Row, Col, DatePicker, Select, Input, Space, Statistic, ConfigProvider, theme, Button, Upload, Modal, Tabs, Typography, Divider, Tag, message } = antd;

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
  return (
    React.createElement(Row, { gutter: 16 }, [
      React.createElement(Col, { span: 6, key: 'total' },
        React.createElement(Card, { style: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } },
          React.createElement(Statistic, { 
            title: 'Всего лидов', 
            value: metrics.total || 0,
            valueStyle: { color: '#fff' }
          })
        )
      ),
      React.createElement(Col, { span: 6, key: 'conv' },
        React.createElement(Card, { style: { background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' } },
          React.createElement(Statistic, { 
            title: 'Конверсии', 
            value: metrics.conversions || 0,
            valueStyle: { color: '#fff' }
          })
        )
      ),
      React.createElement(Col, { span: 6, key: 'spend' },
        React.createElement(Card, { style: { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' } },
          React.createElement(Statistic, { 
            title: 'Расход', 
            value: metrics.spend || 0, 
            precision: 2,
            valueStyle: { color: '#fff' }
          })
        )
      ),
      React.createElement(Col, { span: 6, key: 'cpa' },
        React.createElement(Card, { style: { background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' } },
          React.createElement(Statistic, { 
            title: 'Средняя цена конверсии', 
            value: metrics.avg_cpa || 0, 
            precision: 2,
            valueStyle: { color: '#fff' }
          })
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
        style: { marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }
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
              React.createElement('code', { style: { background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' } }, 
                `${window.location.origin}/api/webhook/${selectedConnector?.id || 'bitrix24'}`
              ),
              React.createElement(Divider, null),
              React.createElement(Typography.Title, { level: 4 }, '2. Формы на сайте — самый простой способ'),
              React.createElement('p', null, 'Скопируйте одну строку ниже и вставьте перед закрывающим тегом </body> на вашем сайте:'),
              React.createElement('pre', { style: { background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' } }, 
                `<script src="${window.location.origin}/integrate.js" data-source="website_form" defer></script>`
              ),
              React.createElement('p', { style: { color: '#888', marginTop: 8 } }, 'Скрипт автоматически найдёт все формы, подхватит поля (имя, телефон, email), UTM-метки и будет отправлять заявки на дашборд.'),
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

  const columns = [
    { title: 'Время', dataIndex: 'time', key: 'time', width: 100 },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: 'Имя', dataIndex: 'name', key: 'name', width: 100 },
    { title: 'Источник', dataIndex: 'source', key: 'source', width: 120 },
    { title: 'Компания', dataIndex: 'company', key: 'company', width: 120 },
    { title: 'Группа', dataIndex: 'group_name', key: 'group_name', width: 150 },
    { title: 'Ключевые слова', dataIndex: 'keywords', key: 'keywords', width: 200 },
    { title: 'Конверсия', dataIndex: 'conversion', key: 'conversion', width: 120 },
    { title: 'Микроконверсия', dataIndex: 'micro_conversion', key: 'micro_conversion', width: 120 },
    { title: 'Клики фильтра', dataIndex: 'micro_clicks', key: 'micro_clicks', width: 100 },
    { title: 'Город', dataIndex: 'city', key: 'city', width: 100 },
    { title: 'Статус', dataIndex: 'status', key: 'status', width: 100 },
    { title: 'Сумма', dataIndex: 'amount', key: 'amount', width: 100 },
    { title: 'Расход', dataIndex: 'spend', key: 'spend', width: 100 },
  ];

  return (
    React.createElement(ConfigProvider, { theme: { algorithm: theme.darkAlgorithm } },
      React.createElement('div', { style: { minHeight: '100vh', background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)' } },
        React.createElement('div', { style: { maxWidth: '1400px', margin: '0 auto', padding: '24px 16px' } }, [
          React.createElement('div', { 
            key: 'header',
            style: { 
              textAlign: 'center', 
              marginBottom: '32px',
              background: 'rgba(255,255,255,0.05)',
              padding: '24px',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            } 
          }, [
            React.createElement('h1', { 
              style: { 
                fontSize: '32px', 
                fontWeight: '700', 
                margin: '0 0 8px 0',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              } 
            }, '📊 Аналитика рекламных кампаний'),
            React.createElement('p', { 
              style: { 
                fontSize: '16px', 
                color: '#a0a0a0', 
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
          React.createElement(Card, { 
            key: 'table',
            style: { 
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          },
            React.createElement(Table, { 
              rowKey: 'id', 
              dataSource: data, 
              columns, 
              pagination: { pageSize: 20 },
              scroll: { x: 1500 },
              size: 'small'
            })
          )
        ])
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
