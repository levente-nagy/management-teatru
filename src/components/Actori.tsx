import React, { useEffect, useState } from 'react';
import { Button, Modal, Table, Form, Input, Space, DatePicker, InputNumber, Select, message } from 'antd';
import type { TableProps } from 'antd';
import { db } from '../Firebase';
import { collection, addDoc, getDocs, where, query } from 'firebase/firestore';
import moment from 'moment';

interface ActorType {
  key: string;
  nume: string;
  prenume: string;
  CNP: string;
  carte_identitate: string;
  profesie: string;
  functie: string;
  tip_contract: string;
  salariu_brut?: string | number;
  salariu_net?: string | number;
  impozite?: string | number;
  data_inceput_contract: string;
  perioada_contract?: string | number;
}


const Actori: React.FC = () => {
  const [data, setData] = useState<ActorType[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [contractType, setContractType] = useState<string | undefined>(undefined);
  const [selectedDates, setSelectedDates] = useState<any>(null); 

  const fetchActorData = async (startDate?: string, endDate?: string) => {
    try {
      let querySnapshot;
      if (startDate && endDate) {
        const q = query(
          collection(db, 'actori'),
          where('data_inceput_contract', '>=', startDate),
          where('data_inceput_contract', '<=', endDate)
        );
        querySnapshot = await getDocs(q);
      } else {
        querySnapshot = await getDocs(collection(db, 'actori'));
      }
      const fetchedData = querySnapshot.docs.map((doc) => {
        return {
          key: doc.id,
          ...doc.data(),
        };
      });
      setData(fetchedData as ActorType[]);
    } catch (error) {
      console.error('Error fetching actors:', error);
    }
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    form.resetFields();
    setContractType(undefined);
    setIsModalVisible(false);
  };

  const saveActor = async () => {
    try {
      const values = await form.validateFields();
      const formattedData: Omit<ActorType, 'key'> = {
        nume: values.nume,
        prenume: values.prenume,
        CNP: values.CNP,
        carte_identitate: values.carte_identitate,
        profesie: values.profesie,
        functie: values.functie,
        tip_contract: values.tip_contract,
        salariu_brut: values.tip_contract === 'Angajat' ? values.salariu_brut : "-",
        salariu_net: values.tip_contract === 'Angajat' ? values.salariu_brut * 0.75 : "-",
        impozite: values.tip_contract === 'Angajat' ? values.salariu_brut * 0.25 : "-",
        data_inceput_contract: values.tip_contract === 'Angajat' ? values.data_inceput_contract.format('DD-MM-YYYY'): "-",
        perioada_contract: values.tip_contract === 'Angajat' ? values.perioada_contract : "-",
      };

      await addDoc(collection(db, 'actori'), formattedData);
      message.success('Actor adăugat cu succes!');
      form.resetFields();
      setContractType(undefined);
      setIsModalVisible(false);
      fetchActorData(); 
    } catch (error) {
      console.error('Error saving actor:', error);
    }
  };

  const handleSearch = () => {
    if (selectedDates) {
      const [startDate, endDate] = selectedDates;
      fetchActorData(startDate.format('DD-MM-YYYY'), endDate.format('DD-MM-YYYY'));
    }
  };

  const handleResetFilters = () => {
    setSelectedDates(null); 
    form.resetFields(); 
    fetchActorData(); 
  };

  useEffect(() => {
    fetchActorData();
    const cells = document.querySelectorAll('.custom-cell');
    cells.forEach(cell => {
      cell.classList.remove('ant-table-column-sort', 'ant-table-column-has-sorters');
    });
  }, []);

  const onValuesChange = (changedValues: any) => {
    if ('tip_contract' in changedValues) {
      setContractType(changedValues.tip_contract);
    }
  };

  const columns: TableProps<ActorType>['columns'] = [
    { title: 'Nume', dataIndex: 'nume', key: 'nume', align: 'center', width: 200, sorter: (a, b) => a.nume.localeCompare(b.nume), sortOrder: 'ascend', className: 'custom-cell' },
    { title: 'Prenume', dataIndex: 'prenume', key: 'prenume', align: 'center', width: 200 },
    { title: 'CNP', dataIndex: 'CNP', key: 'CNP', align: 'center', width: 200 },
    { title: 'Carte de identitate', dataIndex: 'carte_identitate', key: 'carte_identitate', align: 'center', width: 200 },
    { title: 'Profesia', dataIndex: 'profesie', key: 'profesie', align: 'center', width: 200 },
    { title: 'Funcția', dataIndex: 'functie', key: 'functie', align: 'center', width: 200 },
    { title: 'Tip contract', dataIndex: 'tip_contract', key: 'tip_contract', align: 'center', width: 150 },
    { title: 'Salariu brut (lei)', dataIndex: 'salariu_brut', key: 'salariu_brut', align: 'center', width: 150 },
    { title: 'Impozite (lei)', dataIndex: 'impozite', key: 'impozite', align: 'center', width: 150 },
    { title: 'Salariu net (lei)', dataIndex: 'salariu_net', key: 'salariu_net', align: 'center', width: 150 },
    { title: 'Data început', dataIndex: 'data_inceput_contract', key: 'data_inceput_contract', align: 'center', width: 200 },
    { title: 'Perioadă contract (luni)', dataIndex: 'perioada_contract', key: 'perioada_contract', align: 'center', width: 200 },
  ];

  return (
    <>
      <br />
      <Button type="primary" shape="round" onClick={showModal}>
        Adăugare actor
      </Button>
      <br />
      <br />
      <Space direction="horizontal" size={15}>
        <DatePicker.RangePicker
          format="DD-MM-YYYY"
          onChange={(dates) => setSelectedDates(dates)}
          value={selectedDates}
          
        />
        <Button  onClick={handleSearch}>
          Căutare
        </Button>
        <Button  onClick={handleResetFilters}>
          Resetare
        </Button>
      </Space>
      <br />
      <br />
      <Table<ActorType>
        columns={columns}
        dataSource={data}
        size="small"
        pagination={{ hideOnSinglePage: true }}
        rowKey="key"
      />
      <Modal
        title="Adăugare actor"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <br />
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          onValuesChange={onValuesChange}
        >
          <Space direction="horizontal" size={15}>
            <Form.Item label="Nume" name="nume" rules={[{ required: true, message: 'Introduceți numele!' }]}>
              <Input style={{ width: 200 }}/>
            </Form.Item>
            <Form.Item label="Prenume" name="prenume" rules={[{ required: true, message: 'Introduceți prenumele!' }]}>
              <Input style={{ width: 200 }}/>
            </Form.Item>
          </Space>
          <Space direction="horizontal" size={15}>
          <Form.Item
            label="CNP"
            name="CNP"
            rules={[{ required: true, message: 'Introduceți CNP-ul!' }]}
          >
            <InputNumber
              maxLength={13}
              style={{ width: 200 }}
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
              label="Carte de identitate"
              name="carte_identitate"
              rules={[
                { required: true, message: 'Introduceți datele cărții de identitate!' },
                {
                  pattern: /^[A-Z]{2}\d{6}$/,
                  message: 'Introduceți un format valid!',
                },
              ]}
            >
          <Input maxLength={8} style={{ width: 200 }} />
          </Form.Item>

          </Space>
          <Space direction="horizontal" size={15}>
            <Form.Item label="Profesia" name="profesie" rules={[{ required: true, message: 'Introduceți profesia!' }]}>
              <Input style={{ width: 200 }}/>
            </Form.Item>
            <Form.Item label="Funcția" name="functie" rules={[{ required: true, message: 'Introduceți funcția!' }]}>
              <Input style={{ width: 200 }}/>
            </Form.Item>
          </Space>
          
            <Form.Item
              label="Tip contract"
              name="tip_contract"
              rules={[{ required: true, message: 'Selectați tipul contractului!' }]}
            >
              <Select style={{ width: 415 }}>
                <Select.Option value="Angajat">Angajat</Select.Option>
                <Select.Option value="Colaborator">Colaborator</Select.Option>
              </Select>
            </Form.Item>
          
          {contractType === 'Angajat' && (
            <>
              <Form.Item
                label="Salariu brut"
                name="salariu_brut"
                rules={[{ required: true, message: 'Introduceți salariul brut!' }]}
              >
                <InputNumber maxLength={10} min="1" style={{ width: 150 }} addonAfter="lei" 
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
              label="Data început contract"
              name="data_inceput_contract"
              rules={[{ required: true, message: 'Selectați data de început!' }]}
            >
              <DatePicker format="DD-MM-YYYY" style={{ width: 150 }} placement="bottomRight"
                  disabledDate={(current) => current && current < moment().startOf('day')}/>
            </Form.Item>
            <Form.Item
                label="Perioadă contract"
                name="perioada_contract"
                rules={[{ required: true, message: 'Introduceți perioada contractuală!' }]}
              >
                <InputNumber maxLength={3} min="1" style={{ width: 150 }} addonAfter="luni" 
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
            </>
          )}
          <Form.Item>
            <br />
            <Button type="primary" shape="round" onClick={saveActor}>
              Adăugare
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
export default Actori;

