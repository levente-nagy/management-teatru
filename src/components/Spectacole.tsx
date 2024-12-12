import React, { useEffect, useState } from 'react';
import { Button, Modal, Table, Form, Input, Space, DatePicker, TimePicker, Select, message, InputNumber } from 'antd';
import type { TableProps } from 'antd';
import { db } from '../Firebase';
import { collection, addDoc, getDocs, where, query, updateDoc, doc, getDoc } from 'firebase/firestore';
import moment from 'moment';

interface BiletType {
  key: string;
  spectacol_id: string;
  categorie_bilet: string;
  nr_bilete: number;
  pret: number;
  bilete_vandute?: number;
}

const Spectacole: React.FC = () => {
  interface Spectacol {
    key: string;
    titlu: string;
    data: string;
    ora: string;
    durata: string;
    actori: string[];
  }
  
  const [data, setData] = useState<Spectacol[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [actorData, setActorData] = useState<{ value: string; label: string }[]>([]);
  const [colaboratorData, setColaboratorData] = useState<{ value: string; label: string }[]>([]);
  const [isDistributieModalVisible, setIsDistributieModalVisible] = useState(false);
  const [isBileteModalVisible, setIsBileteModalVisible] = useState(false);
  const [isIncasariModalVisible, setIsIncasariModalVisible] = useState(false);
  const [selectedActori, setSelectedActors] = useState<string[]>([]);
  const [selectedColaboratori, setSelectedColaborators] = useState<string[]>([]);
  const [bilete, setBilete] = useState<BiletType[]>([]);
  const [selectedDataDates, setSelectedDataDates] = useState<any>(null);
  const [ticketTableData, setTicketTableData] = useState<
  { spectacol_id: string, categorie_bilet: string; total_bilete: number; bilete_vandute: number; bilete_ramase: number }[]
>([]);
const [incasariData, setIncasariData] = useState<
  { categorie_bilet: string, total_earnings: number, bilete_vandute: number}[]
>([]);
const [totalEarnings, setTotalEarnings] = useState<number>(0);
const [hasSelectedColaboratori, setHasSelectedColaboratori] = useState(false);
const [colaboratorPayments, setColaboratorPayments] = useState<{ [key: string]: number }>({});


const fetchActorData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'actori'));
    const fetchedData = querySnapshot.docs
      .filter((doc) => doc.data().tip_contract === 'Angajat')
      .map((doc) => ({
        value: doc.id,
        label: `${doc.data().nume} ${doc.data().prenume}`,
      }));
    setActorData(fetchedData);
  } catch (error) {
    console.error('Error fetching Angajat actors:', error);
  }
};

const fetchColaboratorData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'actori'));
    const fetchedData = querySnapshot.docs
      .filter((doc) => doc.data().tip_contract === 'Colaborator')
      .map((doc) => ({
        value: doc.id,
        label: `${doc.data().nume} ${doc.data().prenume}`,
      }));

    setColaboratorData(fetchedData);

  } catch (error) {
    console.error('Error fetching Colaborator actors:', error);
  }
};

  const transformDataForTable = (data: Spectacol[]) => {
    return data; 
  };

  const handleColaboratoriChange = (selectedColaboratori: string[]) => {
    setHasSelectedColaboratori(selectedColaboratori.length > 0);
  
    setColaboratorPayments((prev) => {
      const updatedPayments = { ...prev };
      Object.keys(updatedPayments).forEach((key) => {
        if (!selectedColaboratori.includes(key)) {
          delete updatedPayments[key];
        }
      });
      return updatedPayments;
    });
  };

  const fetchSpectacolData = async (startDate?: string, endDate?: string) => {
    try {
      let querySnapshot;
      if (startDate && endDate) {
        const q = query(
          collection(db, 'spectacole'),
          where('data', '>=', startDate),
          where('data', '<=', endDate)
        );
        querySnapshot = await getDocs(q);
      } else {
        querySnapshot = await getDocs(collection(db, 'spectacole'));
      }
      const fetchedData = querySnapshot.docs.map((doc) => ({
        key: doc.id,
        titlu: doc.data().titlu,
        data: doc.data().data,
        ora: doc.data().ora,
        durata: doc.data().durata,
        actori: Array.isArray(doc.data().actori) ? doc.data().actori : [],
      }));
      setData(fetchedData);
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
    fetchSpectacolData();
    fetchActorData();
    fetchBileteData();
    fetchColaboratorData();
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
    setHasSelectedColaboratori(false);
  };

  const showDistributieModal = async (spectacolId: string) => {
    try {
      const spectacolDoc = await getDoc(doc(collection(db, 'spectacole'), spectacolId));
      if (!spectacolDoc.exists()) {
        console.error("Spectacol not found.");
        return;
      }

      const spectacolData = spectacolDoc.data();
      const actorIds = spectacolData.actori || [];
      const colaboratorIds = spectacolData.colaboratori?.map((colab: { id: string }) => colab.id) || [];

      const actorPromises = actorIds.length > 0 
        ? actorIds.map(async (actorId: string | undefined) => {
            const actorDoc = await getDoc(doc(collection(db, 'actori'), actorId));
            return actorDoc.exists() ? `${actorDoc.data().nume} ${actorDoc.data().prenume}` : null;
          }) 
        : [];

      const colaboratorPromises = colaboratorIds.length > 0 
        ? colaboratorIds.map(async (colaboratorId: string | undefined) => {
            const colaboratorDoc = await getDoc(doc(collection(db, 'actori'), colaboratorId)); 
            return colaboratorDoc.exists() ? `${colaboratorDoc.data().nume} ${colaboratorDoc.data().prenume}` : null;
          }) 
        : [];

      const actorNames = await Promise.all(actorPromises);
      const colaboratorNames = await Promise.all(colaboratorPromises);

      setSelectedActors(actorNames.filter(Boolean)); 
      setSelectedColaborators(colaboratorNames.filter(Boolean)); 
      setIsDistributieModalVisible(true);

    } catch (error) {
      console.error("Error fetching data for DistributieModal:", error);
    }
  };
  

  const showBileteModal = (spectacolId: string) => {
    const ticketsByCategory = bilete.reduce((acc, bilet) => {
      if (bilet.spectacol_id === spectacolId) {
        if (!acc[bilet.categorie_bilet]) {
          acc[bilet.categorie_bilet] = 0;
        }
        acc[bilet.categorie_bilet] += bilet.nr_bilete;
      }
      return acc;
    }, {} as { [key: string]: number });
  
    setTicketTableData(
      Object.entries(ticketsByCategory).map(([categorie_bilet, total_bilete]) => ({
        spectacol_id: spectacolId,
        categorie_bilet,
        total_bilete,
        bilete_vandute: bilete.find(b => b.spectacol_id === spectacolId && b.categorie_bilet === categorie_bilet)?.bilete_vandute ?? 0,
        bilete_ramase: total_bilete - (bilete.find(b => b.spectacol_id === spectacolId && b.categorie_bilet === categorie_bilet)?.bilete_vandute ?? 0),
      }))
    );
  
    setIsBileteModalVisible(true);
  };
  
  const showIncasariModal = (spectacolId: string) => {
    const selectedBilete = bilete.filter(bilet => bilet.spectacol_id === spectacolId);
    const earnings = selectedBilete.map((bilet) => ({
      categorie_bilet: bilet.categorie_bilet,
      total_earnings: (bilet.bilete_vandute ?? 0) * bilet.pret,
      bilete_vandute: bilet.bilete_vandute ?? 0,
    }));
    
    const totalEarnings = earnings.reduce((sum, current) => sum + current.total_earnings, 0);
    
    setIncasariData(earnings);
    setIsIncasariModalVisible(true);
    
    setTotalEarnings(totalEarnings);
  };
  
  
  const handleDistributieCancel = () => {
    setIsDistributieModalVisible(false);
    
 };

  const handleBileteCancel = () => {
    setIsBileteModalVisible(false);
  };

  
  const handleIncasariCancel = () => {
    setIsIncasariModalVisible(false);
  };

  const handleSoldChange = (value: string, index: number) => {
    const updatedData = [...ticketTableData];
    const parsedValue = Number(value);

    if (!isNaN(parsedValue)) {
      updatedData[index].bilete_vandute = Math.max(
        0,
        Math.min(parsedValue, updatedData[index].total_bilete)
      );
      updatedData[index].bilete_ramase = updatedData[index].total_bilete - updatedData[index].bilete_vandute;
      setTicketTableData(updatedData);
    }
  };
  
  const handleSaveBilete = async () => {
    try {
      for (const updatedTicket of ticketTableData) {
        const existingTicketIndex = bilete.findIndex(
          (bilet) => bilet.spectacol_id === updatedTicket.spectacol_id && bilet.categorie_bilet === updatedTicket.categorie_bilet
        );
  
        if (existingTicketIndex !== -1) {
          const existingTicket = bilete[existingTicketIndex];
          const remaining = existingTicket.nr_bilete - updatedTicket.bilete_vandute;
  
          if (remaining >= 0) {
            await updateDoc(doc(collection(db, 'bilete'), existingTicket.key), {
              bilete_vandute: updatedTicket.bilete_vandute,
              bilete_ramase: updatedTicket.bilete_ramase,
            });
          } else {
            message.error('Numărul de bilete vândute este invalid!');
            return;
          }
        }
      }
  
      message.success('Bilete actualizate cu succes!');
      fetchBileteData(); 
      setIsBileteModalVisible(false);
    } catch (error) {
      console.error('Error updating bilete:', error);
    }
  };
  
  
  

  const handleDataSearch = () => {
    if (selectedDataDates) {
      const [startDate, endDate] = selectedDataDates;
      fetchSpectacolData(startDate.format('DD-MM-YYYY'), endDate.format('DD-MM-YYYY'));
    }
  };
  
  const handleDataResetFilters = () => {
    setSelectedDataDates(null);
    form.resetFields();
    fetchSpectacolData();
  };
  

  const saveSpectacol = async () => {
    try {
      const values = await form.validateFields();
  
      const formattedData = {
        titlu: values.titlu || '',
        data: values.data ? values.data.format('DD-MM-YYYY') : '',
        ora: values.ora ? values.ora.format('HH:mm') : '',
        durata: values.durata ? values.durata.format('HH:mm') : '',
        actori: values.actori.map((actor: any) => actor),
        colaboratori: (values.colaboratori || []).map((colaboratorId: string) => {
          const plata = colaboratorPayments[colaboratorId] || 0;
          return { id: colaboratorId, plata };
        }),
      };
  
      await addDoc(collection(db, 'spectacole'), formattedData);
      message.success('Spectacol adăugat cu succes!');
      form.resetFields();
      setColaboratorPayments({});
      setIsModalVisible(false);
      setHasSelectedColaboratori(false);
      fetchSpectacolData();
    } catch (error) {
      console.error('Error saving spectacole:', error);
    }
  };
  
  function calculateTotalEarnings(spectacole: Spectacol[]) {
    let totalEarnings = 0;

    spectacole.forEach(spectacol => {
        const selectedBilete = bilete.filter(bilet => bilet.spectacol_id === spectacol.key);
        const spectacolEarnings = selectedBilete.reduce((sum, bilet) => sum + ((bilet.bilete_vandute ?? 0) * bilet.pret), 0);
        totalEarnings += spectacolEarnings;
    });

    return totalEarnings;
}

  const columns: TableProps<any>['columns'] = [
    { title: 'Titlu', dataIndex: 'titlu', key: 'titlu', align: 'center', className:'custom-cell', width: 200, sorter: (a, b) => a.titlu.localeCompare(b.titlu), sortOrder: 'ascend'},
    { title: 'Data', dataIndex: 'data', key: 'data', align: 'center', width: 150 },
    { title: 'Ora', dataIndex: 'ora', key: 'ora', align: 'center', width: 150 },
    { title: 'Durata', dataIndex: 'durata', key: 'durata', align: 'center', width: 150 },
    {
      title: 'Detalii',
      align: 'center',
      width: 150,
      render: (_text, record) => (
        <Space direction="vertical" size={1}>
          <Button type="link" onClick={() => {
            showDistributieModal(record.key); 
          }} className='tabbutton'>
            Distribuție
          </Button>
          <Button type="link" onClick={() => showBileteModal(record.key)} className='tabbutton'>
          Bilete
        </Button>
        <Button type="link" onClick={() => showIncasariModal(record.key)} className='tabbutton'>
          Încasări
        </Button>
        </Space>
      ),
    },
    
  ];

  return (
    <>
      <br />
      <Button type="primary" shape="round" onClick={showModal}>
        Adăugare spectacol
      </Button>
      <br />
      <br />

      <Space direction="horizontal" size={15}>
    <DatePicker.RangePicker
      format="DD-MM-YYYY"
      onChange={(dates) => setSelectedDataDates(dates)}
      value={selectedDataDates}
    />
    <Button onClick={handleDataSearch}>
      Căutare
    </Button>

    <Button onClick={handleDataResetFilters}>
    Resetare
    </Button>
</Space>
<br /><br />
      <Table
        columns={columns}
        dataSource={transformDataForTable(data)}
        size="small"
        pagination={{ hideOnSinglePage: true }}
        rowKey="key"
        footer={() => (
          <div style={{textAlign: 'right'}}>
              Total încasări: {calculateTotalEarnings(data)} lei
              <br />
          </div>
      )}
      />
      <Modal
        title="Adăugare spectacol"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <br />
        <Form form={form} layout="vertical" autoComplete="off">
          <Space direction="horizontal" size={15}>
            <Form.Item
              label="Titlu"
              name="titlu"
              rules={[{ required: true, message: 'Introduceți denumirea spectacolului!' }]}
            >
              <Input style={{ width: 350 }} />
            </Form.Item>
          </Space>
          <Space direction="horizontal" size={15}>
            <Form.Item
              label="Data"
              name="data"
              rules={[{ required: true, message: 'Selectați data spectacolului!' }]}
            >
              <DatePicker
                format="DD-MM-YYYY"
                placement="bottomRight"
                disabledDate={(current) => current && current < moment().startOf('day')}
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item
              label="Ora"
              name="ora"
              rules={[{ required: true, message: 'Selectați ora spectacolului!' }]}
            >
              <TimePicker
                format="HH:mm"
                style={{ width: 160 }}
                placeholder="Selectați ora"
              />
            </Form.Item>
          </Space>
          <Space direction="horizontal" size={15}>
            <Form.Item
              label="Durata"
              name="durata"
              rules={[{ required: true, message: 'Selectați durata spectacolului!' }]}
            >
              <TimePicker
                format="HH:mm"
                style={{ width: 160 }}
                showNow={false} 
                placeholder="Selectați durata"
              />
            </Form.Item>
            </Space>
            <Form.Item
              label="Actori"
              name="actori"
              rules={[{ required: true, message: 'Selectați actorii spectacolului!' }]}
            >
              <Select
                mode="multiple"
                options={actorData}
                placeholder="Selectați actorii"
                style={{ width: 450 }}
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item
  label="Colaboratori"
  name="colaboratori"
  rules={[{ required: false, message: 'Selectați colabora spectacolului!' }]}
>
  <Select
    mode="multiple"
    options={colaboratorData}
    placeholder="Selectați colaboratorii"
    style={{ width: 450 }}
    optionFilterProp="label"
    filterSort={(optionA, optionB) =>
      (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
    }
    onChange={handleColaboratoriChange}
  />
</Form.Item>

{hasSelectedColaboratori &&
  form.getFieldValue('colaboratori')?.map((colaboratorId: string) => {
    const colaboratorName = colaboratorData.find(
      (colaborator) => colaborator.value === colaboratorId
    )?.label;

    return (
      <Form.Item
        key={colaboratorId}
        label={`Sumă de plată pentru ${colaboratorName || colaboratorId}`}
        name={`plata_colaborator_${colaboratorId}`}
        rules={[{ required: true, message: 'Introduceți plata pentru colaborator!' }]}
      >
        <InputNumber
          style={{ width: 150 }}
          addonAfter="lei"
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
          onChange={(value) => {
            setColaboratorPayments((prev) => ({ ...prev, [colaboratorId]: Number(value) || 0 }));
          }}
          
        />
      </Form.Item>
    );
  })}
          
          <br />
          <Button type="primary" shape="round" onClick={saveSpectacol}>
            Adăugare
          </Button>
        </Form>
      </Modal>

      <Modal
  title="Distribuție"
  open={isDistributieModalVisible}
  onCancel={handleDistributieCancel}
  footer={null}
>
  <br />
  {selectedActori.length > 0 && (
    <>
      <div><b>Actori:</b></div>
      <ul className="actor-list">
        {selectedActori.map((actorName, index) => (
          <li key={index}>{actorName}</li>
        ))}
      </ul>
      <br />
    </>
  )}
  {selectedColaboratori.length > 0 && (
    <>
      <div><b>Colaboratori:</b></div>
      <ul className="colaborator-list">
        {selectedColaboratori.map((colaboratorName, index) => (
          <li key={index}>{colaboratorName}</li>
        ))}
      </ul>
    </>
  )}
  {selectedActori.length === 0 && selectedColaboratori.length === 0 && (
    <p>Nu sunt actori sau colaboratori disponibili</p>
  )}
</Modal>

<Modal
  title="Detalii bilete"
  open={isBileteModalVisible}
  onCancel={handleBileteCancel}
  footer={null}
>
  {ticketTableData && ticketTableData.length > 0 ? (
    <>
      <Table
        dataSource={ticketTableData}
        columns={[
          {
            title: 'Categorie',
            dataIndex: 'categorie_bilet',
            key: 'categorie_bilet',
          },
          {
            title: 'Total bilete',
            dataIndex: 'total_bilete',
            key: 'total_bilete',
          },
          {
            title: 'Bilete vândute',
            dataIndex: 'bilete_vandute',
            key: 'bilete_vandute',
            render: (_text, record, index) => (
              <Input
                type="number"
                min={0}
                max={record.total_bilete}
                value={record.bilete_vandute}
                onChange={(e) => handleSoldChange(e.target.value, index)}
              />
            ),
          },
          {
            title: 'Bilete rămase',
            dataIndex: 'bilete_ramase',
            key: 'bilete_ramase',
          },
        ]}
        pagination={false}
        rowKey="categorie_bilet"
      />
      <br />
      <Button key="save" type="primary" shape='round' onClick={handleSaveBilete}>
        Salvare
      </Button>
    </>
  ) : (
    <p>Nu sunt bilete disponibile.</p>
  )}
</Modal>
<Modal
  title="Încasări"
  open={isIncasariModalVisible}
  onCancel={handleIncasariCancel}
  footer={null}
>
{incasariData && incasariData.length > 0 ? (
    <>
  <br />
  <Table
    dataSource={incasariData}
    columns={[
      { title: 'Categorie bilete', dataIndex: 'categorie_bilet', key: 'categorie_bilet' },
      { title: 'Bilete vândute', dataIndex: 'bilete_vandute', key: 'bilete_vandute' },
      { title: 'Încasări (lei)', dataIndex: 'total_earnings', key: 'total_earnings' },
    ]}
    rowKey="categorie_bilet"
    pagination={false}
    footer={() => <div style={{textAlign: 'right'}}>Total: {totalEarnings} lei</div>}
  />
  <br />
  
  </>
) : (
  <p>Nu sunt încasări disponibile.</p>
)}
</Modal>


    </>
  );
};

export default Spectacole;
