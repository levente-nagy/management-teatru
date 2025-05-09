import React, { useEffect, useState } from 'react';
import { Button, Modal, Table, Form, Input, Space, DatePicker, InputNumber, Select, message, Popconfirm, Tooltip, Descriptions } from 'antd';
import type { TableProps } from 'antd';
import { db } from '../Firebase';
import { collection, addDoc, getDocs, where, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { EditOutlined, DeleteOutlined, QuestionCircleOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

interface ActorType {
  key: string;
  nume: string;
  prenume: string;
  email?: string;
  CNP?: string;
  carte_identitate?: string;
  profesie: string;
  functie: string;
  tip_contract?: string;
  salariu_brut?: number;
  salariu_net?: number;
  impozite?: number;
  data_inceput_contract?: string;
  perioada_contract?: number;
}

interface ActoriProps {
  userId: string;
  userRole: string;
}

const Artisti: React.FC<ActoriProps> = ({ userId, userRole }) => {
  const [data, setData] = useState<ActorType[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingActor, setEditingActor] = useState<ActorType | null>(null);
  const [form] = Form.useForm();
  const [contractType, setContractType] = useState<string | undefined>(undefined);
  const [selectedDates, setSelectedDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedActorForDetails, setSelectedActorForDetails] = useState<ActorType | null>(null);

  const canAddEditDelete = userRole === 'Administrator' || userRole === 'Resurse umane';
  const canViewSensitiveData = userRole === 'Administrator' || userRole === 'Resurse umane';
  const canViewFullDetails = userRole === 'Administrator' || userRole === 'Resurse umane' || userRole === 'Coordonator';

  const fetchActorData = async (startDate?: string, endDate?: string, activeSearchTerm?: string) => {
    if (!userId || !canViewFullDetails) {
        setData([]);
        return;
    };
    setLoading(true);
    try {
      const userActoriCollection = collection(db, 'artisti');
      let q;

      if (startDate && endDate && canViewSensitiveData) {
        q = query(userActoriCollection,
                  where('data_inceput_contract', '>=', startDate),
                  where('data_inceput_contract', '<=', endDate));
      } else {
        q = query(userActoriCollection);
      }

      const querySnapshot = await getDocs(q);
      let fetchedData = querySnapshot.docs.map((doc) => ({
        key: doc.id,
        ...(doc.data() as Omit<ActorType, 'key'>),
      }));

      const termToFilter = activeSearchTerm !== undefined ? activeSearchTerm : searchTerm;
      if (termToFilter) {
        fetchedData = fetchedData.filter(actor =>
          actor.nume.toLowerCase().includes(termToFilter.toLowerCase()) ||
          actor.prenume.toLowerCase().includes(termToFilter.toLowerCase())
        );
      }

      setData(fetchedData);
    } catch (error) {
      console.error('Error fetching actors:', error);
      if ((error as any).code === 'failed-precondition') {
         message.error('Eroare la preluare: Este posibil să fie necesar un index Firestore. Verificați consola.');
      } else {
         message.error('Eroare la preluarea actorilor.');
      }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchActorData(undefined, undefined, '');
  }, [userId, userRole]);

  const showModal = (actor: ActorType | null = null) => {
    if (!canAddEditDelete) return;

    if (actor) {
      setEditingActor(actor);
      form.setFieldsValue({
        ...actor,
        data_inceput_contract: actor.data_inceput_contract && actor.data_inceput_contract !== '-' ? dayjs(actor.data_inceput_contract, 'DD-MM-YYYY') : null,
      });
      setContractType(actor.tip_contract);
    } else {
      setEditingActor(null);
      form.resetFields();
      setContractType(undefined);
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingActor(null);
    form.resetFields();
    setContractType(undefined);
  };

  const showDetailsModal = (actor: ActorType) => {
    setSelectedActorForDetails(actor);
    setIsDetailsModalVisible(true);
  };

  const handleDetailsModalCancel = () => {
    setIsDetailsModalVisible(false);
    setSelectedActorForDetails(null);
  };

  const saveActor = async () => {
    if (!userId || !canAddEditDelete) {
      message.error("Operație nepermisă.");
      return;
    }
    setSaving(true);
    try {
      const values = await form.validateFields();
      const salariuBrutNum = values.tip_contract === 'Angajat' ? Number(values.salariu_brut) : undefined;
      const perioadaContractNum = values.tip_contract === 'Angajat' ? Number(values.perioada_contract) : undefined;

      const actorData: Omit<ActorType, 'key'> = {
        nume: values.nume,
        prenume: values.prenume,
        email: values.email,
        CNP: values.CNP,
        carte_identitate: values.carte_identitate,
        profesie: values.profesie,
        functie: values.functie,
        tip_contract: values.tip_contract,
        salariu_brut: salariuBrutNum,
        salariu_net: salariuBrutNum !== undefined ? Math.round(salariuBrutNum * 0.585) : undefined,
        impozite: salariuBrutNum !== undefined ? Math.round(salariuBrutNum * 0.415) : undefined,
        data_inceput_contract: values.tip_contract === 'Angajat' && values.data_inceput_contract ? values.data_inceput_contract.format('DD-MM-YYYY') : "-",
        perioada_contract: perioadaContractNum,
      };

      Object.keys(actorData).forEach(key => {
        const typedKey = key as keyof typeof actorData;

        if (typedKey !== 'email' && (actorData[typedKey] === undefined || actorData[typedKey] === null || actorData[typedKey] === '')) {
          delete actorData[typedKey];
        }

        if (typedKey === 'email' && typeof actorData.email !== 'string') {
            delete actorData.email;
        }
      });


      if (actorData.tip_contract !== 'Angajat') {
          delete actorData.salariu_brut;
          delete actorData.salariu_net;
          delete actorData.impozite;
          delete actorData.perioada_contract;
          actorData.data_inceput_contract = "-";
      } else {
          if (!values.data_inceput_contract) {
              actorData.data_inceput_contract = "-";
          }
      }

      const userActoriCollection = collection(db, 'artisti');


      if (values.email) {
          const emailQuery = query(userActoriCollection, where("email", "==", values.email));
          const emailSnapshot = await getDocs(emailQuery);
          if (!emailSnapshot.empty) {

              const existingDoc = emailSnapshot.docs[0];
              if (!editingActor || existingDoc.id !== editingActor.key) {
                  message.error(`Adresa de email ${values.email} este deja folosită.`);
                  setSaving(false);
                  return;
              }
          }
      }


      if (editingActor) {
        const actorDocRef = doc(db, 'artisti', editingActor.key);
        await updateDoc(actorDocRef, actorData);
        message.success('Artist actualizat cu succes!');
      } else {
        await addDoc(userActoriCollection, actorData);
        message.success('Artist adăugat cu succes!');
      }

      handleCancel();
      fetchActorData(selectedDates?.[0]?.format('DD-MM-YYYY'), selectedDates?.[1]?.format('DD-MM-YYYY'), searchTerm);

    } catch (error: any) {

        if (error.errorFields) {
            console.log('Validation Failed:', error);
        } else {
            console.error('Error saving actor:', error);
            message.error('Eroare la salvarea artistului.');
        }
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!userId || !canAddEditDelete) {
      message.error("Operație nepermisă.");
      return;
    }
    setLoading(true);
    try {
      const actorDocRef = doc(db, 'artisti', key);
      await deleteDoc(actorDocRef);
      message.success('Artist șters cu succes!');
      fetchActorData(selectedDates?.[0]?.format('DD-MM-YYYY'), selectedDates?.[1]?.format('DD-MM-YYYY'), searchTerm);
    } catch (error) {
      console.error('Error deleting actor:', error);
      message.error('Eroare la ștergerea artistului.');
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (selectedDates || searchTerm) {
      const start = selectedDates ? selectedDates[0].format('DD-MM-YYYY') : undefined;
      const end = selectedDates ? selectedDates[1].format('DD-MM-YYYY') : undefined;
      fetchActorData(start, end, searchTerm);
    } else {
      message.info('Introduceți un nume sau selectați un interval de date pentru căutare.');
    }
  };

  const handleResetFilters = () => {
    setSelectedDates(null);
    setSearchTerm('');
    fetchActorData(undefined, undefined, '');
  };

  const handleExportExcel = () => {
    if (!data.length) {
      message.info('Nu există date de exportat.');
      return;
    }
    const sortedData = [...data].sort((a, b) => a.nume.localeCompare(b.nume));

    const dataToExport = sortedData.map(actor => {
      const row: any = {
        'Nume': actor.nume,
        'Prenume': actor.prenume,
        'Email': actor.email || '-',
        'Profesia': actor.profesie,
        'Funcția': actor.functie,
      };
      if (canViewSensitiveData) {
        row['CNP'] = actor.CNP || '-';
        row['Carte identitate'] = actor.carte_identitate || '-';
        row['Tip contract'] = actor.tip_contract || '-';
        row['Salariu brut (lei)'] = actor.salariu_brut !== undefined ? actor.salariu_brut : '-';
        row['Impozite (lei)'] = actor.impozite !== undefined ? actor.impozite : '-';
        row['Salariu net (lei)'] = actor.salariu_net !== undefined ? actor.salariu_net : '-';
        row['Data început'] = actor.data_inceput_contract || '-';
        row['Perioadă (luni)'] = actor.perioada_contract !== undefined ? actor.perioada_contract : '-';
      }
      return row;
    });

    try {
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Artisti');
        XLSX.writeFile(workbook, 'Artisti.xlsx');
        message.success('Datele au fost exportate cu succes în Artisti.xlsx!');
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        message.error("Eroare la exportul datelor în Excel.");
    }
  };

  const onValuesChange = (changedValues: any) => {
    if ('tip_contract' in changedValues) {
      setContractType(changedValues.tip_contract);
    }
  };

  const baseColumns: TableProps<ActorType>['columns'] = [
    { title: 'Nume', dataIndex: 'nume', key: 'nume',  width: 150, sorter: (a, b) => a.nume.localeCompare(b.nume), defaultSortOrder: 'ascend' },
    { title: 'Prenume', dataIndex: 'prenume', key: 'prenume',  width: 150 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200, render: (email) => email || '-' },
    { title: 'Profesia', dataIndex: 'profesie', key: 'profesie',  width: 150 },
    { title: 'Funcția', dataIndex: 'functie', key: 'functie',  width: 150 },
    { title: 'Tip contract', dataIndex: 'tip_contract', key: 'tip_contract',  width: 150, render: (tip_contract) => tip_contract || '-' },
  ];

  const actionColumn: TableProps<ActorType>['columns'] = [
    {
      title: 'Acțiuni',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Vizualizare detalii">
            <Button type="link" style={{ color: 'black' }} icon={<EyeOutlined />} onClick={() => showDetailsModal(record)}/>
          </Tooltip>
          {canAddEditDelete && (
            <>
              <Tooltip title="Editare">
                <Button type="link" style={{ color: 'black' }} icon={<EditOutlined />} onClick={() => showModal(record)} />
              </Tooltip>
              <Popconfirm
                title="Sigur doriți să ștergeți acest artist?"
                onConfirm={() => handleDelete(record.key)}
                icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                okText="Da"
                cancelText="Nu"
              >
                <Tooltip title="Ștergere">
                  <Button type="link" style={{ color: 'black' }} icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const columns = [...baseColumns, ...actionColumn];

  return (
    <>
      

        {canAddEditDelete && (
          <Button type="primary" shape="round" onClick={() => showModal()}>
            Adăugare artist
          </Button>
        )}

      <br/><br /><br />
      {canViewSensitiveData && (
        <Space direction="vertical" size={15} style={{ marginBottom: 16, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space direction="horizontal">
          <Input.Search
            placeholder="Căutare după nume/prenume"
            value={searchTerm}
            onChange={(e) => {
              const currentSearchTermValue = e.target.value;
              setSearchTerm(currentSearchTermValue);
              if (currentSearchTermValue === '') {
                fetchActorData(selectedDates ? selectedDates[0].format('DD-MM-YYYY') : undefined, selectedDates ? selectedDates[1].format('DD-MM-YYYY') : undefined, '');
              }
            }}
            onSearch={() => handleSearch()}
            style={{ width: 300 }}
            allowClear
          />
        </Space>
        

        <Space direction="horizontal" size={15}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 8 }}>Filtare după dată:</span>
          </div>
          <DatePicker.RangePicker
            format="DD-MM-YYYY"
            value={selectedDates}
            onChange={(dates) => setSelectedDates(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
          />
          <Button onClick={handleSearch} disabled={!selectedDates && !searchTerm}>
            Filtrare
          </Button>
          <Button  onClick={handleResetFilters}>
            Resetare filtre
          </Button>
        </Space>
        </div>

      </Space>
        
      )}
    
          <Space direction="horizontal" size={10} style={{ marginLeft: 16, display: 'flex', float: 'right' }}>
          
          <Button   onClick={handleExportExcel} icon={<DownloadOutlined />} >
            Export Excel
          </Button>
          </Space>

      <br/><br/><br /><br />
      <Table<ActorType>
        columns={columns}
        dataSource={data}
        size="small"
        pagination={{ hideOnSinglePage: true, pageSize: 10 }}
        rowKey="key"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />
      <Modal
        title={editingActor ? "Editare artist" : "Adăugare artist"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
            <Button key="back" onClick={handleCancel}>
              Anulare
            </Button>,
            <Button key="submit" type="primary" loading={saving} onClick={saveActor}>
              {editingActor ? "Salvare modificări" : "Adăugare"}
            </Button>,
          ]}
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
      
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Introduceți adresa de email!' },
              { type: 'email', message: 'Adresa de email nu este validă!' }
            ]}
          >
            <Input
              style={{ width: 415 }}
              placeholder="exemplu@domeniu.com"
              onChange={(e) => {
                const { value } = e.target;
                form.setFieldsValue({ email: value.toLowerCase() });
              }}
            />
          </Form.Item>
          {canViewSensitiveData && (
            <Space direction="horizontal" size={15}>
            <Form.Item
              label="CNP"
              name="CNP"
              rules={[{ required: true, message: 'Introduceți CNP-ul!' }, { pattern: /^[1-9]\d{12}$/, message: 'CNP invalid!' }]}
            >
              <Input
                maxLength={13}
                style={{ width: 200 }}
                onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) e.preventDefault(); }}
              />
            </Form.Item>
              <Form.Item
                label="Carte de identitate"
                name="carte_identitate"
                rules={[
                  { required: true, message: 'Introduceți datele cărții de identitate!' },
                  { pattern: /^[A-Z]{2}\d{6}$/, message: 'Format invalid (ex: AB123456)!' },
                ]}
              >
            <Input maxLength={8} style={{ width: 200 }} />
            </Form.Item>
            </Space>
          )}
          <Space direction="horizontal" size={15}>
            <Form.Item label="Profesia" name="profesie" rules={[{ required: true, message: 'Introduceți profesia!' }]}>
              <Input style={{ width: 200 }}/>
            </Form.Item>
            <Form.Item label="Funcția" name="functie" rules={[{ required: true, message: 'Introduceți funcția!' }]}>
              <Input style={{ width: 200 }}/>
            </Form.Item>
          </Space>

          {canViewSensitiveData && (
            <>
<Form.Item
                label="Tip contract"
                name="tip_contract"
                rules={[{ required: true, message: 'Selectați tipul contractului!' }]}
              >
                <Select
                  style={{ width: 415 }}
                  placeholder="Selectați tipul"
                  disabled={!!editingActor}
                >
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
                    <InputNumber min={1} style={{ width: 150 }} addonAfter="lei"
                      parser={(value) => parseInt(value?.replace(/\D/g, '') || '0', 10) || 1}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Data început contract"
                    name="data_inceput_contract"
                    rules={[{ required: true, message: 'Selectați data de început!' }]}
                  >
                    <DatePicker format="DD-MM-YYYY" style={{ width: 150 }} placement="bottomRight"
                        disabledDate={(current) => current && current > dayjs().endOf('day')}/>
                  </Form.Item>
                  <Form.Item
                      label="Perioadă contract"
                      name="perioada_contract"
                      rules={[{ required: true, message: 'Introduceți perioada contractuală!' }]}
                    >
                      <InputNumber min={1} style={{ width: 150 }} addonAfter="luni"
                        parser={(value) => parseInt(value?.replace(/\D/g, '') || '1', 10)}
                      />
                  </Form.Item>
                </>
              )}
            </>
          )}
        </Form>
      </Modal>

    {selectedActorForDetails && (
        <Modal
        title="Detalii artist"
        open={isDetailsModalVisible}
        onCancel={handleDetailsModalCancel}
        footer={[
          <Button key="back" onClick={handleDetailsModalCancel}>
            Închidere
          </Button>,
        ]}
        width={500}
      >
        <br />
        <Descriptions bordered column={1} size="small" labelStyle={{ fontWeight: '600' }}>
          <Descriptions.Item label="Nume">{selectedActorForDetails.nume}</Descriptions.Item>
          <Descriptions.Item label="Prenume">{selectedActorForDetails.prenume}</Descriptions.Item>
          <Descriptions.Item label="Email">{selectedActorForDetails.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Profesia">{selectedActorForDetails.profesie}</Descriptions.Item>
          <Descriptions.Item label="Funcția">{selectedActorForDetails.functie}</Descriptions.Item>
          <Descriptions.Item label="Tip contract">{selectedActorForDetails.tip_contract || '-'}</Descriptions.Item>
          {canViewSensitiveData && (
            <>
              <Descriptions.Item label="CNP">{selectedActorForDetails.CNP || '-'}</Descriptions.Item>
              <Descriptions.Item label="Carte identitate">{selectedActorForDetails.carte_identitate || '-'}</Descriptions.Item>
              
              {selectedActorForDetails.tip_contract === 'Angajat' && (
                <>
              <Descriptions.Item label="Salariu brut (lei)">{selectedActorForDetails.salariu_brut !== undefined ? selectedActorForDetails.salariu_brut : '-'}</Descriptions.Item>
              <Descriptions.Item label="Impozite (lei)">{selectedActorForDetails.impozite !== undefined ? selectedActorForDetails.impozite : '-'}</Descriptions.Item>
              <Descriptions.Item label="Salariu net (lei)">{selectedActorForDetails.salariu_net !== undefined ? selectedActorForDetails.salariu_net : '-'}</Descriptions.Item>
              <Descriptions.Item label="Data început contract">{selectedActorForDetails.data_inceput_contract || '-'}</Descriptions.Item>
              <Descriptions.Item label="Perioadă contract (luni)">{selectedActorForDetails.perioada_contract !== undefined ? selectedActorForDetails.perioada_contract : '-'}</Descriptions.Item>
              </>
              )}
              </>
          )}
        </Descriptions>
      </Modal>
      )}
    </>
  );
};
export default Artisti;