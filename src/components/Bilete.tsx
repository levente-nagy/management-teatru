import React, { useState, useEffect } from 'react';
import { Button, Modal, Table, Form, Space, InputNumber, Select, message } from 'antd';
import type { TableProps } from 'antd';
import { db } from '../Firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const { Option } = Select;

interface SpectacolType {
  key: string;
  titlu: string;
  data: string;
  ora: string;
}

interface BiletType {
  key: string;
  spectacol_id: string;
  categorie_bilet: string;
  nr_bilete: number;
  pret: number;
}

const Bilete: React.FC = () => {
  const [spectacole, setSpectacole] = useState<SpectacolType[]>([]);
  const [bilete, setBilete] = useState<BiletType[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchSpectacoleData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'spectacole'));
      const fetchedData = querySnapshot.docs.map((doc) => ({
        key: doc.id,
        ...doc.data(),
      })) as SpectacolType[];
      setSpectacole(fetchedData.sort((a, b) => a.titlu.localeCompare(b.titlu))); 
    } catch (error) {
      console.error('Error fetching spectacole:', error);
    }
  };

  const fetchBileteData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'bilete'));
      const fetchedData = querySnapshot.docs.map((doc) => ({
        key: doc.id,
        ...doc.data(),
      })) as BiletType[];
      setBilete(fetchedData);
    } catch (error) {
      console.error('Error fetching bilete:', error);
    }
  };

  useEffect(() => {
    fetchSpectacoleData();
    fetchBileteData();
    const cells = document.querySelectorAll('.custom-cell');
    cells.forEach(cell => {
      cell.classList.remove('ant-table-column-sort', 'ant-table-column-has-sorters');
    });
  }, []);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    form.resetFields();
    setIsModalVisible(false);
  };

  const saveBilet = async () => {
    try {
      const values = await form.validateFields();
      const formattedData = {
        spectacol_id: values.spectacol,
        categorie_bilet: values.categorie_bilet,
        nr_bilete: values.nr_bilete,
        pret: values.pret,
      };

      await addDoc(collection(db, 'bilete'), formattedData);
      message.success('Bilet adăugat cu succes!');
      form.resetFields();
      setIsModalVisible(false);
      fetchBileteData(); 
    } catch (error) {
      console.error('Error saving bilet:', error);
    }
  };

  const columns: TableProps<BiletType>['columns'] = [
    {
      title: 'Spectacol',
      dataIndex: 'spectacol_id',
      key: 'spectacol_id',
      align: 'center',
      className: 'custom-cell',
      sorter: (a, b) => {
        const spectacolA = spectacole.find((s) => s.key === a.spectacol_id)?.titlu || '';
        const spectacolB = spectacole.find((s) => s.key === b.spectacol_id)?.titlu || '';
        return spectacolA.localeCompare(spectacolB);
      },
      sortOrder: 'ascend', 
      render: (spectacolId) => {
        const spectacol = spectacole.find((s) => s.key === spectacolId);
        return spectacol?.titlu || 'Necunoscut';
      },
    },
    { title: 'Data', dataIndex: 'spectacol_id', key: 'spectacol_id', align: 'center', 
      render: (spectacolId) => {
      const spectacol = spectacole.find((s) => s.key === spectacolId);
      return spectacol?.data || 'Necunoscut';
    }, 
    },
      
    { title: 'Ora', dataIndex: 'spectacol_id', key: 'spectacol_id', align: 'center', 
      render: (spectacolId) => {
      const spectacol = spectacole.find((s) => s.key === spectacolId);
      return spectacol?.ora || 'Necunoscut';
    }, 
    },
    { title: 'Tip bilet', dataIndex: 'categorie_bilet', key: 'categorie_bilet', align: 'center' },
    { title: 'Total bilete', dataIndex: 'nr_bilete', key: 'nr_bilete', align: 'center', width: 120},
    { title: 'Bilete vândute', dataIndex: 'bilete_vandute', key: 'bilete_vandute', align: 'center', width: 120, render: (value) => value || 0 },
    { title: 'Bilete rămase', dataIndex: 'bilete_ramase', key: 'bilete_ramase', align: 'center', width: 120, render: (value, record) => value || record.nr_bilete },
    { title: 'Preț bilet (lei)', dataIndex: 'pret', key: 'pret', align: 'center', width: 100},
  ];

  return (
    <>
      <br />
      <Button type="primary" shape="round" onClick={showModal}>
        Adăugare bilete
      </Button>
      <br />
      <br />
      <Table<BiletType>
        columns={columns}
        dataSource={bilete}
        size="small"
        pagination={{ hideOnSinglePage: true }}
        rowKey="key"
      />
      <Modal
        title="Adăugare bilete"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <br />
        <Form form={form} layout="vertical" autoComplete="off">
          <Space direction="horizontal" size={15}>
            <Form.Item
              label="Spectacol"
              name="spectacol"
              rules={[{ required: true, message: 'Selectați spectacolul!' }]}>
              <Select style={{ width: 350 }} placeholder="Selectați spectacol">
                {spectacole.map((spectacol) => (
                  <Option key={spectacol.key} value={spectacol.key}>
                    {spectacol.titlu + ' - ' + spectacol.data + ' - ' + spectacol.ora}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>
          <br />
          <Space direction="horizontal" size={15}>
            <Form.Item
              label="Categorie"
              name="categorie_bilet"
              rules={[{ required: true, message: 'Introduceți tipul biletului!' }]}>
              <Select style={{ width: 350 }} placeholder="Selectați tipul biletului">
                <Option value="Balcon">Balcon</Option>
                <Option value="Parter">Parter</Option>
                <Option value="Loje">Loje</Option>
              </Select>
            </Form.Item>
          </Space>
          <br />

          <Form.Item
            label="Număr bilete"
            name="nr_bilete"
            rules={[{ required: true, message: 'Introduceți numărul de bilete!' }]}>
            <InputNumber
              style={{ width: 150 }}
              min="1"
              parser={(value) => value?.replace(/\D/g, '') || ''} 
              onKeyDown={(event) => {
                if (!/^\d$/.test(event.key) && event.key !== 'Backspace' && event.key !== 'Delete' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                  event.preventDefault(); 
                }
              }}
              onPaste={(event) => {
                const pasteData = event.clipboardData.getData('text');
                if (!/^\d+$/.test(pasteData)) {
                  event.preventDefault(); 
                }
              }}
            />

          </Form.Item>

          <Form.Item
            label="Preț"
            name="pret"
            rules={[{ required: true, message: 'Introduceți prețul biletului!' }]}>
            <InputNumber style={{ width: 150 }}  addonAfter="lei" 
              min="1"
              parser={(value) => value?.replace(/\D/g, '') || ''} 
              onKeyDown={(event) => {
                if (!/^\d$/.test(event.key) && event.key !== 'Backspace' && event.key !== 'Delete' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                  event.preventDefault(); 
                }
              }}
              onPaste={(event) => {
                const pasteData = event.clipboardData.getData('text');
                if (!/^\d+$/.test(pasteData)) {
                  event.preventDefault(); 
                }
              }}
            />
          </Form.Item>

          <Form.Item>
            <br />
            <Button type="primary" shape="round" onClick={saveBilet}>
              Adăugare
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Bilete;
