import React, { useState, useEffect } from 'react';
import { Button, Modal, Table, Form, Space, InputNumber, Select, message, Popconfirm, Tooltip, Input } from 'antd';
import type { TableProps } from 'antd';
import { db } from '../Firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore'; 
import { EditOutlined, DeleteOutlined, QuestionCircleOutlined, DownloadOutlined } from '@ant-design/icons'; 
import * as XLSX from 'xlsx';

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
  bilete_vandute: number; 
  bilete_ramase: number; 
}

interface BileteProps {
  userId: string;
  userRole: string; 
}

const Bilete: React.FC<BileteProps> = ({ userId, userRole }) => {
  const [spectacole, setSpectacole] = useState<SpectacolType[]>([]);
  const [bilete, setBilete] = useState<(BiletType & { spectacolTitlu: string })[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBilet, setEditingBilet] = useState<BiletType | null>(null); 
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false); 
  const [saving, setSaving] = useState(false);
  const [searchTermBileteSpectacol, setSearchTermBileteSpectacol] = useState('');



  const canView = userRole === 'Administrator' || userRole === 'Casier' || userRole === 'Coordonator';
  const canAddEdit = userRole === 'Administrator' || userRole === 'Casier';
  const canDelete = userRole === 'Administrator'; 
  const canSell = userRole === 'Administrator' || userRole === 'Casier';


  const fetchSpectacoleData = async () => {
    if (!userId || !canView) return; 
    try {
      const userSpectacoleCollection = collection(db, 'spectacole');
      const q = query(userSpectacoleCollection);
      const querySnapshot = await getDocs(q);
      const fetchedData = querySnapshot.docs.map((doc) => ({
        key: doc.id,
        ...(doc.data() as Omit<SpectacolType, 'key'>),
      })) as SpectacolType[];

      setSpectacole(fetchedData.sort((a, b) => {
        const titleComparison = a.titlu.localeCompare(b.titlu);
        if (titleComparison !== 0) return titleComparison;
        const dateComparison = (a.data || '').localeCompare(b.data || '');
        if (dateComparison !== 0) return dateComparison;
        return (a.ora || '').localeCompare(b.ora || '');
      }));
    } catch (error) {
      console.error('Error fetching spectacole:', error);
      message.error('Eroare la preluarea spectacolelor.');
    }
  };

  const fetchBileteData = async (searchTitleOpt?: string) => {
    if (!userId || !canView) {
        setBilete([]);
        return;
    }
    setLoading(true);
    try {
      const userBileteCollection = collection(db, 'bilete');
      const q = query(userBileteCollection);
      const querySnapshot = await getDocs(q);
      let fetchedData = querySnapshot.docs.map(doc => {
        const raw = doc.data() as Omit<BiletType, 'key'>;
        const titlu = spectacole.find(s => s.key === raw.spectacol_id)?.titlu || 'Necunoscut';
        return {
          key: doc.id,
          ...raw,
          bilete_vandute: raw.bilete_vandute ?? 0,
          bilete_ramase: raw.bilete_ramase ?? raw.nr_bilete ?? 0,
          spectacolTitlu: titlu,
        };
      }) as Array<BiletType & { spectacolTitlu: string }>;

      const currentSearchTitle = searchTitleOpt !== undefined ? searchTitleOpt.trim().toLowerCase() : searchTermBileteSpectacol.trim().toLowerCase();

      if (currentSearchTitle) {
        fetchedData = fetchedData.filter(bilet =>
          bilet.spectacolTitlu.toLowerCase().includes(currentSearchTitle)
        );
      }

      setBilete(fetchedData.sort((a, b) =>
        a.spectacolTitlu.localeCompare(b.spectacolTitlu)
      ));
    } catch (error) {
      console.error('Error fetching bilete:', error);
      message.error('Eroare la preluarea biletelor.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && canView) {
      fetchSpectacoleData();
    } else {
      setSpectacole([]);
    }
  }, [userId, canView]);
  
  useEffect(() => {
    if (userId && canView && spectacole.length > 0) {
      fetchBileteData();
    } else {
      setBilete([]);
    }
  }, [userId, canView, spectacole]); 

  const showModal = (bilet: BiletType | null = null) => {
    if (!canAddEdit) return; 

    if (bilet) {
      setEditingBilet(bilet);
      form.setFieldsValue({
        spectacol: bilet.spectacol_id,
        categorie_bilet: bilet.categorie_bilet,
        nr_bilete: bilet.nr_bilete,
        pret: bilet.pret,
      });
    } else {
      setEditingBilet(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingBilet(null);
    form.resetFields();
  };

  const saveBilet = async () => {
    if (!userId || !canAddEdit) {
      message.error("Operație nepermisă.");
      return;
    }
    setSaving(true);
    try {
      const values = await form.validateFields();
      const nrBileteNum = Number(values.nr_bilete);
  
      const biletData: Partial<BiletType> = { 
        spectacol_id: values.spectacol,
        categorie_bilet: values.categorie_bilet,
        nr_bilete: nrBileteNum,
        pret: Number(values.pret),
      };
  
      const userBileteCollection = collection(db, 'bilete');

      if (editingBilet) {
        const biletDocRef = doc(db,  'bilete', editingBilet.key);

        if (nrBileteNum < editingBilet.bilete_vandute) {
            message.error(`Numărul total de bilete (${nrBileteNum}) nu poate fi mai mic decât numărul de bilete deja vândute (${editingBilet.bilete_vandute}).`);
            setSaving(false);
            return;
        }

        const newSpectacolId = values.spectacol;
        const newCategorie = values.categorie_bilet;
        const newPret = Number(values.pret);

        const identityChanged = newSpectacolId !== editingBilet.spectacol_id ||
                                newCategorie !== editingBilet.categorie_bilet ||
                                newPret !== editingBilet.pret;

        if (identityChanged) {
            
            const qCollision = query(
                userBileteCollection,
                where('spectacol_id', '==', newSpectacolId),
                where('categorie_bilet', '==', newCategorie),
                where('pret', '==', newPret)
            );
            const collisionSnap = await getDocs(qCollision);

            if (!collisionSnap.empty) {
                const collidingDoc = collisionSnap.docs[0];
               
                if (collidingDoc.id !== editingBilet.key) {
                    
                    const collidingData = collidingDoc.data() as BiletType;

                    await updateDoc(collidingDoc.ref, {
                        nr_bilete: collidingData.nr_bilete + nrBileteNum,
                        bilete_vandute: (collidingData.bilete_vandute || 0) + editingBilet.bilete_vandute,
                        bilete_ramase: (collidingData.bilete_ramase ?? 0) + (nrBileteNum - editingBilet.bilete_vandute)
                    });

                    await deleteDoc(biletDocRef); 
                    message.success('Biletele au fost contopite cu o categorie existentă datorită modificării specificațiilor!');
                    
                    handleCancel();
                    fetchBileteData();
                    setSaving(false);
                    return; 
                }
            }
        }

        biletData.bilete_ramase = nrBileteNum - editingBilet.bilete_vandute;
        biletData.bilete_vandute = editingBilet.bilete_vandute; 
        await updateDoc(biletDocRef, biletData);
        message.success('Categorie bilete actualizată!');

      } else {

        const q = query(
          userBileteCollection,
          where('spectacol_id', '==', values.spectacol),
          where('categorie_bilet', '==', values.categorie_bilet),
          where('pret', '==', Number(values.pret)) 
        );
        const querySnap = await getDocs(q);
  
        if (!querySnap.empty) {
          const docRef = querySnap.docs[0].ref;
          const existing = querySnap.docs[0].data() as BiletType;
          await updateDoc(docRef, {
            nr_bilete: existing.nr_bilete + nrBileteNum,
            bilete_ramase: (existing.bilete_ramase ?? 0) + nrBileteNum
          });
          message.success('Numărul de bilete actualizat pentru categoria și prețul existent!');
        } else {
          biletData.bilete_vandute = 0;
          biletData.bilete_ramase = nrBileteNum;
          await addDoc(userBileteCollection, biletData as Omit<BiletType, 'key'>);
          message.success('Categorie bilete adăugată!');
        }
      }
  
      handleCancel();
      fetchBileteData();
  
    } catch (error) {
      console.error('Error saving bilet:', error);
      message.error('Eroare la salvarea categoriei de bilete.');
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async (bilet: BiletType) => {
    if (!userId || !canDelete) {
      message.error("Operație nepermisă.");
      return;
    }

    if (bilet.bilete_vandute > 0) {
        message.warning(`Nu puteți șterge această categorie deoarece s-au vândut deja ${bilet.bilete_vandute} bilete.`);
        return;
    }

    setLoading(true);
    try {
      const biletDocRef = doc(db, 'bilete', bilet.key);
      await deleteDoc(biletDocRef);
      message.success('Categorie bilete ștearsă!');
      fetchBileteData();
    } catch (error) {
      console.error('Error deleting bilet:', error);
      message.error('Eroare la ștergerea categoriei de bilete.');
      setLoading(false);
    }
  };

  
  const handleExportExcel = () => {
    if (!bilete.length) {
      message.info('Nu există date de exportat.');
      return;
    }

    const sortedData = [...bilete].sort((a, b) => {
      const titleComparison = a.spectacolTitlu.localeCompare(b.spectacolTitlu);
      if (titleComparison !== 0) return titleComparison;
      const spectacolA = spectacole.find(s => s.key === a.spectacol_id);
      const spectacolB = spectacole.find(s => s.key === b.spectacol_id);
      const dateComparison = (spectacolA?.data || '').localeCompare(spectacolB?.data || '');
      if (dateComparison !== 0) return dateComparison;
      return (spectacolA?.ora || '').localeCompare(spectacolB?.ora || '');
    });

    const dataToExport = sortedData.map(bilet => {
      const spectacol = spectacole.find(s => s.key === bilet.spectacol_id);
      return {
        'Spectacol': bilet.spectacolTitlu,
        'Data': spectacol?.data || '-',
        'Ora': spectacol?.ora || '-',
        'Tip bilet': bilet.categorie_bilet,
        'Preț (lei)': bilet.pret,
        'Total bilete': bilet.nr_bilete,
        'Bilete vândute': bilet.bilete_vandute,
        'Bilete rămase': bilet.bilete_ramase,
       
      };
    });

    try {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bilete');
      XLSX.writeFile(workbook, 'Bilete.xlsx');
      message.success('Datele au fost exportate cu succes în Bilete.xlsx!');
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      message.error("Eroare la exportul datelor în Excel.");
    }
  };

  const onBileteSpectacolSearch = (searchValue: string) => {
    fetchBileteData(searchValue);
  };


  const columns: TableProps<BiletType & { spectacolTitlu: string }>['columns'] = [
    {
      title: 'Spectacol',
      dataIndex: 'spectacolTitlu',
      key: 'spectacol',
      sorter: (a, b) => a.spectacolTitlu.localeCompare(b.spectacolTitlu),
      defaultSortOrder: 'ascend',
    },
    { title: 'Data', dataIndex: 'spectacol_id', key: 'data', align: 'center', render: (spectacolId) => spectacole.find((s) => s.key === spectacolId)?.data || 'Necunoscută' },
    { title: 'Ora', dataIndex: 'spectacol_id', key: 'ora', align: 'center', render: (spectacolId) => spectacole.find((s) => s.key === spectacolId)?.ora || 'Necunoscută' },
    { title: 'Categorie', dataIndex: 'categorie_bilet', key: 'categorie_bilet', align: 'center' },
    ...(canAddEdit ? [{ title: 'Preț (lei)', dataIndex: 'pret', key: 'pret', width: 100 }] : []),
    { title: 'Total bilete', dataIndex: 'nr_bilete', key: 'nr_bilete', align: 'center', width: 100 },
    { title: 'Bilete vândute', dataIndex: 'bilete_vandute', key: 'bilete_vandute', align: 'center', width: 100 },
    { title: 'Bilete rămase', dataIndex: 'bilete_ramase', key: 'bilete_ramase', align: 'center', width: 100 },


 
    ...(canAddEdit || canDelete || canSell ? [{
      title: 'Acțiuni',
      key: 'action',
      
      width: 120,
      render: (_: any, record: BiletType) => (
        <Space size="small">
          {canAddEdit && (
            <Tooltip title="Editare">
              <Button type="link" style={{ color: 'black' }} icon={<EditOutlined />} onClick={() => showModal(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Sigur ștergeți categoria?"
              description={record.bilete_vandute > 0 ? "Atenție: S-au vândut deja bilete!" : ""}
              onConfirm={() => handleDelete(record)}
              icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
              okText="Da"
              cancelText="Nu"

            >
              <Tooltip title={record.bilete_vandute > 0 ? "Ștergere blocată (bilete vândute)" : "Ștergere"}>
     
                <Button type="link" style={{ color: 'black' }} danger icon={<DeleteOutlined />} disabled={record.bilete_vandute > 0} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];


  if (!canView) {
      return <p>Nu aveți permisiunea de a vizualiza această secțiune.</p>;
  }

  return (
    <>
      
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
      <Space>
            {canAddEdit && (
              <Button type="primary" shape="round" onClick={() => showModal()}>
                Adăugare bilete
              </Button>
            )}
          </Space>
        <br />

        <Space wrap style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>

        
            <Input.Search
              placeholder="Caută după titlu spectacol"
              value={searchTermBileteSpectacol}
              onChange={(e) => {
                const currentSearchValue = e.target.value;
                setSearchTermBileteSpectacol(currentSearchValue);
                if (currentSearchValue === '') {
                  fetchBileteData('');
                }
              }}
              onSearch={onBileteSpectacolSearch}
              style={{ width: 300 }}
              allowClear
              
            />
            {canView && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                disabled={bilete.length === 0}
                
              >
                Export Excel
              </Button>
            )}
         
          
        </Space>
      </Space>
      <br/><br/>
      <Table<BiletType & { spectacolTitlu: string }>
        columns={columns}
        dataSource={bilete}
        size="small"
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        rowKey="key"
        loading={loading}
        scroll={{ x: 'max-content' }}
      />
      <Modal
        title={editingBilet ? "Editare categorie bilete" : "Adăugare categorie bilete"}
        open={isModalVisible}
        onCancel={handleCancel}
        destroyOnClose
        footer={[
            <Button key="back" onClick={handleCancel}>
              Anulare
            </Button>,
            <Button key="submit" type="primary" loading={saving} onClick={saveBilet}>
              {editingBilet ? "Salvare modificări" : "Adăugare"}
            </Button>,
          ]}
      >
        <br />
        <Form form={form} layout="vertical" autoComplete="off" >
          <Form.Item label="Spectacol" name="spectacol" rules={[{ required: true, message: 'Selectați spectacolul!' }]}>
            <Select placeholder="Selectați spectacol" showSearch optionFilterProp="children" >
              {spectacole.map((spectacol) => (
                <Option key={spectacol.key} value={spectacol.key}>
                  {`${spectacol.titlu} - ${spectacol.data} - ${spectacol.ora}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Categorie" name="categorie_bilet" rules={[{ required: true, message: 'Introduceți tipul biletului!' }]}>
            <Select placeholder="Selectați tipul biletului">
              <Option value="Balcon">Balcon</Option>
              <Option value="Parter">Parter</Option>
              <Option value="Loje">Loje</Option>
  
            </Select>
          </Form.Item>
          <Form.Item
            label="Număr total bilete"
            name="nr_bilete"
            rules={[
                { required: true, message: 'Introduceți numărul total de bilete!' },
            
                () => ({
                    validator(_, value) {
                        if (!editingBilet || !value) {
                            return Promise.resolve(); 
                        }
                        if (Number(value) < editingBilet.bilete_vandute) {
                            return Promise.reject(new Error(`Minim ${editingBilet.bilete_vandute} (bilete vândute)`));
                        }
                        return Promise.resolve();
                    },
                }),
            ]}
            help={editingBilet ? `Bilete vândute: ${editingBilet.bilete_vandute}` : ""}
          >
            <InputNumber style={{ width: 150 }} min={1} />
          </Form.Item>
          <Form.Item label="Preț" name="pret" rules={[{ required: true, message: 'Introduceți prețul biletului!' }]}>
            <InputNumber style={{ width: 150 }} addonAfter="lei" min={1}  />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Bilete;