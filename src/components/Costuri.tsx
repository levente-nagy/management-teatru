import React, { useEffect, useState } from 'react';
import { db } from '../Firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { Button, DatePicker, Space, Table } from 'antd';

const CosturiAditionale: React.FC = () => {
  interface Spectacol {
    id: string;
    titlu: string;
    data: string;
    colaboratori: any[];
  }

  const [spectacole, setSpectacole] = useState<Spectacol[]>([]);
  const [colaboratorPayments, setColaboratorPayments] = useState<{ spectacolId: string; colaboratori: any[] }[]>([]);
  const [colaboratorNames, setColaboratorNames] = useState<{ [key: string]: string }>({});
  const [selectedDataDates, setSelectedDataDates] = useState<any>(null);

  const fetchSpectacoleData = async (startDate?: string, endDate?: string) => {
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
      const fetchedData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          titlu: data.titlu,
          data: data.data,
          colaboratori: data.colaboratori || [],
        };
      });
      setSpectacole(fetchedData);
    } catch (error) {
      console.error('Error fetching spectacole:', error);
    }
  };

  const fetchColaboratorPayments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'spectacole'));
      const paymentsData = querySnapshot.docs.map((doc) => ({
        spectacolId: doc.id,
        colaboratori: doc.data().colaboratori || [],
      }));
      setColaboratorPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching colaborator payments:', error);
    }
  };

  const fetchColaboratorNames = async () => {
    try {
      const colaboratorIds = new Set<string>();
      colaboratorPayments.forEach((spectacol) => {
        spectacol.colaboratori.forEach((colaborator) => {
          colaboratorIds.add(colaborator.id);
        });
      });

      const names: { [key: string]: string } = {};
      await Promise.all(Array.from(colaboratorIds).map(async (id) => {
        const colaboratorDoc = await getDoc(doc(collection(db, 'actori'), id));
        if (colaboratorDoc.exists()) {
          names[id] = `${colaboratorDoc.data().nume} ${colaboratorDoc.data().prenume}`;
        }
      }));
      setColaboratorNames(names);
    } catch (error) {
      console.error('Error fetching colaborator names:', error);
    }
  };

  // Fetch spectacole data and colaborator payments on mount
  useEffect(() => {
    fetchSpectacoleData();
    fetchColaboratorPayments();
  }, []);

  // Fetch colaborator names whenever colaboratorPayments is updated
  useEffect(() => {
    if (colaboratorPayments.length > 0) {
      fetchColaboratorNames();
    }
  }, [colaboratorPayments]);

  const renderColaboratorPayments = (colaboratori: any[]) => {
    return colaboratori.map((colaborator) => (
      <li key={colaborator.id}>
        {colaboratorNames[colaborator.id] || 'Loading...'}: {colaborator.plata} lei
      </li>
    ));
  };

  // Calculate total cost based on filtered spectacole
  const calculateTotalCosturi = () => {
    let totalCost = 0;
    spectacole.forEach((spectacol) => {
      totalCost += calculateTotalCosturiPerShow(spectacol.colaboratori);
    });
    return totalCost;
  };

  const calculateTotalCosturiPerShow = (colaboratori: any[]) => {
    return colaboratori.reduce((total, colaborator) => total + colaborator.plata, 0);
  };

  const handleDataSearch = () => {
    if (selectedDataDates) {
      const [startDate, endDate] = selectedDataDates;
      fetchSpectacoleData(startDate.format('DD-MM-YYYY'), endDate.format('DD-MM-YYYY'));
    }
  };

  const handleDataResetFilters = () => {
    setSelectedDataDates(null);
    fetchSpectacoleData();
    fetchColaboratorPayments();
    fetchColaboratorNames();
  };

  return (
    <div>
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
        dataSource={spectacole}
        columns={[
          { title: 'Spectacol', dataIndex: 'titlu', key: 'titlu' },
          { title: 'Data', dataIndex: 'data', key: 'data' },
          {
            title: 'Costuri',
            dataIndex: 'colaboratori',
            render: (colaboratori) => (
              <ul className="colaborator-list">
                {renderColaboratorPayments(colaboratori)}
              </ul>
            ),
          },
          {
            title: 'Total',
            dataIndex: 'colaboratori',
            key: 'totalCosturi',
            render: (colaboratori) => `${calculateTotalCosturiPerShow(colaboratori)} lei`,
          },
        ]}
        pagination={false}
        rowKey="id"
        footer={() => (
          <div style={{ textAlign: 'right' }}>
            Total costuri: {calculateTotalCosturi()} lei
          </div>
        )}
      />
    </div>
  );
};

export default CosturiAditionale;